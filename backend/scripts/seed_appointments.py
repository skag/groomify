"""
Seed script to generate appointments for each pet in the database.

Each pet gets:
- 1-3 past appointments at 6-8 week intervals
- 60% chance of a future appointment 6-10 weeks out

Usage:
    cd backend
    uv run python scripts/seed_appointments.py --business-id 1

    Or set environment variable:
    SEED_BUSINESS_ID=1 uv run python scripts/seed_appointments.py
"""

import os
import random
import sys
from datetime import datetime, timedelta, timezone, time
from pathlib import Path

import click

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.business import Business

# Status names - these should match the database values
STATUS_SCHEDULED = "scheduled"
STATUS_CHECKED_IN = "checked_in"
STATUS_IN_PROGRESS = "in_progress"
STATUS_READY_FOR_PICKUP = "ready_for_pickup"
STATUS_CANCELLED = "cancelled"
STATUS_NO_SHOW = "no_show"

ALL_STATUSES = [
    STATUS_SCHEDULED,
    STATUS_CHECKED_IN,
    STATUS_IN_PROGRESS,
    STATUS_READY_FOR_PICKUP,
    STATUS_CANCELLED,
    STATUS_NO_SHOW,
]
from app.models.business_user import BusinessUser, BusinessUserRole
from app.models.customer import Customer
from app.models.pet import Pet
from app.models.service import Service
from app.models.staff_availability import StaffAvailability

# Sample appointment notes
APPOINTMENT_NOTES = [
    "Customer requested extra brushing",
    "Pet was nervous, took extra time to calm down",
    "Used hypoallergenic shampoo as requested",
    "Found small mat behind ears, removed carefully",
    "Customer wants same groomer next time",
    "Pet did great, very well behaved",
    "Recommended dental cleaning at next visit",
    "Applied flea treatment as requested",
    "Customer asked for shorter trim than usual",
    "Pet has sensitive skin, used gentle products",
    "Nail trim was difficult, pet doesn't like it",
    "Beautiful coat, easy to work with",
    "Customer will pick up at 3pm",
    "Added extra conditioner for dry coat",
    "Pet was very playful today",
    None,  # Some appointments have no notes
    None,
    None,
]

DEFAULT_DAY_START = time(9, 0)
DEFAULT_DAY_END = time(17, 0)
DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


def load_groomer_availability(
    db, groomers: list[BusinessUser]
) -> dict[int, dict[int, StaffAvailability]]:
    """Return availability entries keyed by groomer id then day of week."""
    availability_map: dict[int, dict[int, StaffAvailability]] = {
        groomer.id: {} for groomer in groomers
    }
    groomer_ids = [g.id for g in groomers]
    if not groomer_ids:
        return availability_map

    entries = (
        db.query(StaffAvailability)
        .filter(StaffAvailability.business_user_id.in_(groomer_ids))
        .all()
    )
    for entry in entries:
        availability_map.setdefault(entry.business_user_id, {})[
            entry.day_of_week
        ] = entry
    return availability_map


def get_available_weekdays(
    groomer_availability: dict[int, dict[int, StaffAvailability]]
) -> set[int]:
    """Return the set of weekdays that have at least one available groomer."""
    weekdays: set[int] = set()
    for daily in groomer_availability.values():
        for day, availability in daily.items():
            if availability.is_available:
                weekdays.add(day)
    return weekdays


def get_daily_availability_window(
    target_date: datetime, availability_entry: StaffAvailability | None
) -> tuple[datetime, datetime] | None:
    """Return start/end datetimes for the groomer's availability on a given day."""
    if not availability_entry or not availability_entry.is_available:
        return None

    start_time_obj = availability_entry.start_time or DEFAULT_DAY_START
    end_time_obj = availability_entry.end_time or DEFAULT_DAY_END
    if end_time_obj <= start_time_obj:
        return None

    start_dt = target_date.replace(
        hour=start_time_obj.hour,
        minute=start_time_obj.minute,
        second=start_time_obj.second,
        microsecond=0,
    )
    end_dt = target_date.replace(
        hour=end_time_obj.hour,
        minute=end_time_obj.minute,
        second=end_time_obj.second,
        microsecond=0,
    )
    return start_dt, end_dt


def generate_appointment_time(
    target_date: datetime,
    availability_entry: StaffAvailability | None,
    duration_minutes: int,
) -> datetime | None:
    """Generate an appointment start time that fits within a groomer's availability window."""
    window = get_daily_availability_window(target_date, availability_entry)
    if not window:
        return None

    start_dt, end_dt = window
    window_minutes = int((end_dt - start_dt).total_seconds() // 60)
    if window_minutes < duration_minutes:
        return None

    latest_start_offset = window_minutes - duration_minutes
    available_offsets = list(range(0, latest_start_offset + 1, 15))
    if not available_offsets:
        available_offsets = [0]
    offset_minutes = random.choice(available_offsets)
    return start_dt + timedelta(minutes=offset_minutes)


def get_status_id(db, status_name: str) -> int:
    """Get status ID by name."""
    status = db.query(AppointmentStatus).filter(AppointmentStatus.name == status_name).first()
    if not status:
        raise ValueError(f"Status '{status_name}' not found. Make sure appointment_statuses table is seeded.")
    return status.id


def get_all_groomers(db, business_id: int) -> list[BusinessUser]:
    """Get all groomers for the business."""
    groomer_role = db.query(BusinessUserRole).filter(BusinessUserRole.name == "groomer").first()
    if not groomer_role:
        return []
    return (
        db.query(BusinessUser)
        .filter(BusinessUser.business_id == business_id, BusinessUser.role_id == groomer_role.id)
        .all()
    )


def get_all_pets_with_customers(db, business_id: int) -> list[tuple[Pet, Customer]]:
    """Get all pets with their customers."""
    pets = db.query(Pet).filter(Pet.business_id == business_id).all()
    result = []
    for pet in pets:
        customer = db.query(Customer).filter(Customer.id == pet.customer_id).first()
        if customer:
            result.append((pet, customer))
    return result


def assign_default_groomers(db, pets_with_customers: list[tuple[Pet, Customer]], groomers: list[BusinessUser]) -> dict[int, BusinessUser]:
    """
    Assign a default groomer to each pet and update the database.
    Returns a mapping of pet_id -> default groomer.
    """
    pet_default_groomers: dict[int, BusinessUser] = {}

    for pet, _customer in pets_with_customers:
        # Randomly assign a default groomer
        default_groomer = random.choice(groomers)
        pet.default_groomer_id = default_groomer.id
        pet_default_groomers[pet.id] = default_groomer

    return pet_default_groomers


def get_all_services(db, business_id: int) -> list[Service]:
    """Get all active services for the business."""
    return db.query(Service).filter(Service.business_id == business_id, Service.is_active == True).all()


def determine_status(appointment_datetime: datetime, now: datetime) -> str:
    """Determine appropriate status based on appointment datetime."""
    if appointment_datetime < now - timedelta(hours=4):
        # Past appointments: mostly ready_for_pickup, some cancelled/no-show
        weights = [0, 0, 0, 0.85, 0.10, 0.05]  # ready_for_pickup, cancelled, no_show
        statuses = [
            STATUS_SCHEDULED,
            STATUS_CHECKED_IN,
            STATUS_IN_PROGRESS,
            STATUS_READY_FOR_PICKUP,
            STATUS_CANCELLED,
            STATUS_NO_SHOW,
        ]
        return random.choices(statuses, weights=weights)[0]
    elif appointment_datetime < now:
        # Recently past: in_progress or ready_for_pickup
        return random.choice([
            STATUS_IN_PROGRESS,
            STATUS_READY_FOR_PICKUP,
        ])
    elif appointment_datetime < now + timedelta(days=7):
        # Next week: mostly checked_in, some scheduled
        return random.choice([
            STATUS_SCHEDULED,
            STATUS_CHECKED_IN,
            STATUS_CHECKED_IN,  # Higher weight for checked_in
        ])
    else:
        # Further future: mostly scheduled
        return random.choice([
            STATUS_SCHEDULED,
            STATUS_SCHEDULED,
            STATUS_CHECKED_IN,
        ])


def create_appointment(
    db,
    business_id: int,
    customer: Customer,
    pet: Pet,
    service: Service,
    groomer: BusinessUser,
    appointment_datetime: datetime,
    status_cache: dict[str, int],
    duration_minutes: int | None = None,
) -> Appointment:
    """Create an appointment."""
    now = datetime.now(timezone.utc)
    status_name = determine_status(appointment_datetime, now)
    status_id = status_cache[status_name]

    if duration_minutes is None:
        # Duration is same or more than service duration (add 0-30 mins randomly)
        extra_time = random.choice([0, 0, 0, 15, 15, 30])  # Weighted towards no extra time
        duration = service.duration_minutes + extra_time
    else:
        duration = duration_minutes

    appointment = Appointment(
        business_id=business_id,
        customer_id=customer.id,
        pet_id=pet.id,
        staff_id=groomer.id,
        appointment_datetime=appointment_datetime,
        duration_minutes=duration,
        status_id=status_id,
        notes=random.choice(APPOINTMENT_NOTES),
    )
    db.add(appointment)
    db.flush()

    # Link the service to the appointment
    appointment.services.append(service)

    return appointment


def generate_working_days(
    now: datetime,
    past_weeks: int = 12,
    future_weeks: int = 8,
    allowed_weekdays: set[int] | None = None,
) -> list[datetime]:
    """
    Generate list of working days for the date range filtered by allowed weekdays.
    Returns dates in chronological order.
    """
    start_date = now - timedelta(weeks=past_weeks)
    end_date = now + timedelta(weeks=future_weeks)
    if allowed_weekdays is None:
        allowed_weekdays = {0, 1, 2, 3, 4, 5}  # Default to Monday-Saturday

    days = []
    current = start_date.replace(hour=12, minute=0, second=0, microsecond=0)

    while current <= end_date:
        if current.weekday() in allowed_weekdays:
            days.append(current)
        current += timedelta(days=1)

    return days


def generate_appointments_for_day(
    db,
    business_id: int,
    target_date: datetime,
    pets_with_customers: list[tuple[Pet, Customer]],
    services: list[Service],
    groomers: list[BusinessUser],
    groomer_availability: dict[int, dict[int, StaffAvailability]],
    status_cache: dict[str, int],
    now: datetime,
    used_pets: set[int],
    pet_default_groomers: dict[int, BusinessUser],
) -> tuple[list[Appointment], set[int]]:
    """
    Generate up to 4-6 appointments per available groomer for a specific day.
    ~80% of appointments will use the pet's default groomer.
    Returns the list of appointments created and updated used_pets set.
    """
    appointments = []

    weekday = target_date.weekday()

    for groomer in groomers:
        availability_entry = groomer_availability.get(groomer.id, {}).get(weekday)
        window = get_daily_availability_window(target_date, availability_entry)
        if not window:
            continue

        window_minutes = int((window[1] - window[0]).total_seconds() // 60)
        capacity = max(0, window_minutes // 60)
        if capacity == 0:
            continue

        # Each groomer gets 4-6 appointments per day
        num_appointments = min(random.randint(4, 6), capacity)
        if num_appointments == 0:
            continue

        # Get available pets (not yet used today) that have this groomer as default
        # This ensures we prioritize pets whose default groomer matches
        default_pets = [
            (p, c) for p, c in pets_with_customers
            if p.id not in used_pets and pet_default_groomers.get(p.id) == groomer
        ]

        # Also get non-default pets as fallback
        other_pets = [
            (p, c) for p, c in pets_with_customers
            if p.id not in used_pets and pet_default_groomers.get(p.id) != groomer
        ]

        # If we're running low on pets, reset the used set
        if len(default_pets) + len(other_pets) < num_appointments:
            used_pets.clear()
            default_pets = [
                (p, c) for p, c in pets_with_customers
                if pet_default_groomers.get(p.id) == groomer
            ]
            other_pets = [
                (p, c) for p, c in pets_with_customers
                if pet_default_groomers.get(p.id) != groomer
            ]

        # Select pets: prefer ~80% from default_pets, rest from other_pets
        selected_pets = []
        num_default = min(int(num_appointments * 0.8) + 1, len(default_pets))  # ~80% default
        num_other = num_appointments - num_default

        if default_pets:
            selected_pets.extend(random.sample(default_pets, min(num_default, len(default_pets))))

        if other_pets and len(selected_pets) < num_appointments:
            remaining_needed = num_appointments - len(selected_pets)
            selected_pets.extend(random.sample(other_pets, min(remaining_needed, len(other_pets))))

        for pet, customer in selected_pets:
            service = random.choice(services)
            extra_time = random.choice([0, 0, 0, 15, 15, 30])
            duration_minutes = service.duration_minutes + extra_time
            appointment_datetime = generate_appointment_time(target_date, availability_entry, duration_minutes)
            if not appointment_datetime:
                continue

            appointment = create_appointment(
                db,
                business_id,
                customer,
                pet,
                service,
                groomer,
                appointment_datetime,
                status_cache,
                duration_minutes=duration_minutes,
            )
            appointments.append(appointment)
            used_pets.add(pet.id)

    return appointments, used_pets


def get_week_key(dt: datetime) -> tuple[int, int]:
    """Get a (year, week_number) tuple for grouping by week."""
    iso_calendar = dt.isocalendar()
    return (iso_calendar[0], iso_calendar[1])


def create_overlapping_appointment(
    db,
    business_id: int,
    base_appointment: Appointment,
    pets_with_customers: list[tuple[Pet, Customer]],
    services: list[Service],
    status_cache: dict[str, int],
    overlap_minutes: int,
    groomer_availability: dict[int, dict[int, StaffAvailability]],
) -> Appointment | None:
    """
    Create an appointment that overlaps with the base appointment by the specified minutes.
    Returns the new appointment or None if no suitable pet/customer found.
    """
    # Find a different pet/customer for the overlapping appointment
    available_pets = [
        (pet, customer)
        for pet, customer in pets_with_customers
        if pet.id != base_appointment.pet_id
    ]

    if not available_pets:
        return None

    pet, customer = random.choice(available_pets)
    service = random.choice(services)

    # Calculate overlap start time (starts overlap_minutes before the base appointment ends)
    base_end_time = base_appointment.appointment_datetime + timedelta(
        minutes=base_appointment.duration_minutes
    )
    overlap_start = base_end_time - timedelta(minutes=overlap_minutes)

    # Duration is same or more than service duration
    extra_time = random.choice([0, 0, 0, 15, 15, 30])
    duration = service.duration_minutes + extra_time

    overlap_end = overlap_start + timedelta(minutes=duration)

    availability_entry = groomer_availability.get(base_appointment.staff_id, {}).get(
        base_appointment.appointment_datetime.weekday()
    )
    window = get_daily_availability_window(base_appointment.appointment_datetime, availability_entry)
    if not window:
        return None
    window_start, window_end = window
    if overlap_start < window_start:
        return None
    if overlap_end > window_end:
        return None

    now = datetime.now(timezone.utc)
    status_name = determine_status(overlap_start, now)
    status_id = status_cache[status_name]

    appointment = Appointment(
        business_id=business_id,
        customer_id=customer.id,
        pet_id=pet.id,
        staff_id=base_appointment.staff_id,  # Same groomer for the overlap
        appointment_datetime=overlap_start,
        duration_minutes=duration,
        status_id=status_id,
        notes=random.choice(APPOINTMENT_NOTES),
    )
    db.add(appointment)
    db.flush()

    # Link the service to the appointment
    appointment.services.append(service)

    return appointment


@click.command()
@click.option(
    "--business-id",
    type=int,
    default=None,
    help="Business ID to create appointments for. Can also be set via SEED_BUSINESS_ID env var.",
)
@click.option(
    "--clear-existing",
    is_flag=True,
    default=False,
    help="Clear existing appointments before seeding.",
)
@click.option(
    "--include-today",
    is_flag=True,
    default=False,
    help="Also create appointments for today (15 appointments spread across groomers).",
)
@click.option(
    "--today-date",
    type=str,
    default=None,
    help="Override today's date (YYYY-MM-DD format). Useful for testing specific dates.",
)
def seed_appointments(business_id: int | None, clear_existing: bool, include_today: bool, today_date: str | None):
    """
    Seed the database with appointments for each pet.

    Each pet gets 1-3 past appointments at 6-8 week intervals,
    and 60% of pets get a future appointment 6-10 weeks out.
    """
    # Get business ID from parameter or environment variable
    if business_id is None:
        business_id = os.environ.get("SEED_BUSINESS_ID")
        if business_id:
            business_id = int(business_id)

    if not business_id:
        click.echo("Error: Business ID is required. Use --business-id or set SEED_BUSINESS_ID env var.")
        sys.exit(1)

    db = SessionLocal()
    try:
        # Verify business exists
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            click.echo(f"Error: Business with ID {business_id} not found.")
            sys.exit(1)

        click.echo(f"Seeding appointments for business: {business.name} (ID: {business_id})")

        # Clear existing appointments if requested
        if clear_existing:
            deleted_count = db.query(Appointment).filter(Appointment.business_id == business_id).delete()
            db.commit()
            click.echo(f"  Cleared {deleted_count} existing appointments")

        # Load required data
        groomers = get_all_groomers(db, business_id)
        if not groomers:
            click.echo("Error: No groomers found. Run seed_groomers.py first.")
            sys.exit(1)
        click.echo(f"  Found {len(groomers)} groomers")

        pets_with_customers = get_all_pets_with_customers(db, business_id)
        if not pets_with_customers:
            click.echo("Error: No pets found. Run seed_customers.py first.")
            sys.exit(1)
        click.echo(f"  Found {len(pets_with_customers)} pets")

        services = get_all_services(db, business_id)
        if not services:
            click.echo("Error: No services found. Run seed_services.py first.")
            sys.exit(1)
        click.echo(f"  Found {len(services)} services")

        # Assign default groomers to pets
        click.echo("\nAssigning default groomers to pets...")
        pet_default_groomers = assign_default_groomers(db, pets_with_customers, groomers)
        groomer_pet_counts = {}
        for pet_id, groomer in pet_default_groomers.items():
            groomer_pet_counts[groomer.id] = groomer_pet_counts.get(groomer.id, 0) + 1
        for groomer in groomers:
            count = groomer_pet_counts.get(groomer.id, 0)
            click.echo(f"  {groomer.first_name} {groomer.last_name}: {count} pets assigned")

        click.echo("\nLoading groomer availability...")
        groomer_availability = load_groomer_availability(db, groomers)
        available_weekdays = get_available_weekdays(groomer_availability)
        if not available_weekdays:
            click.echo("Error: No staff availability configured for any groomers. Populate staff_availability first.")
            sys.exit(1)

        readable_days = ", ".join(DAY_NAMES[day] for day in sorted(available_weekdays))
        click.echo(f"  Appointments will be scheduled on: {readable_days}")

        groomers_without_availability = [
            groomer for groomer in groomers if not groomer_availability.get(groomer.id)
        ]
        if groomers_without_availability:
            names = ", ".join(f"{g.first_name} {g.last_name}" for g in groomers_without_availability)
            click.echo(f"  Warning: No availability found for: {names}. They will be skipped.")

        # Cache status IDs
        status_cache = {}
        for status_name in ALL_STATUSES:
            status_cache[status_name] = get_status_id(db, status_name)

        # Parse today_date if provided, otherwise use current local time
        # Use local timezone for appointment times to match business hours
        from zoneinfo import ZoneInfo
        local_tz = ZoneInfo("America/Los_Angeles")

        if today_date:
            try:
                parsed_date = datetime.strptime(today_date, "%Y-%m-%d")
                now = parsed_date.replace(hour=12, minute=0, second=0, tzinfo=local_tz)
                click.echo(f"  Using provided date as 'today': {today_date}")
            except ValueError:
                click.echo(f"Error: Invalid date format '{today_date}'. Use YYYY-MM-DD.")
                sys.exit(1)
        else:
            now = datetime.now(local_tz)
            click.echo(f"  Using current local time: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}")

        # Generate working days (12 weeks past, 8 weeks future) limited by availability
        working_days = generate_working_days(
            now, past_weeks=12, future_weeks=8, allowed_weekdays=available_weekdays
        )
        if not working_days:
            click.echo("Error: No calendar days fall within the configured availability window.")
            sys.exit(1)
        click.echo(f"\nGenerating appointments for {len(working_days)} working days...")
        click.echo(f"  Date range: {working_days[0].strftime('%Y-%m-%d')} to {working_days[-1].strftime('%Y-%m-%d')}")
        click.echo("  Each available groomer will have up to 4-6 appointments per day, capped by their availability window")

        total_appointments = 0
        past_appointments = 0
        future_appointments = 0
        overlapping_appointments = 0
        status_counts = {s: 0 for s in ALL_STATUSES}

        # Track used pets to avoid repeating the same pet too often
        used_pets: set[int] = set()

        # Track appointments by groomer and week for creating overlaps
        groomer_weekly_appointments: dict[int, dict[tuple[int, int], list[Appointment]]] = {
            g.id: {} for g in groomers
        }

        # Generate appointments for each working day
        for i, day in enumerate(working_days):
            day_appointments, used_pets = generate_appointments_for_day(
                db,
                business_id,
                day,
                pets_with_customers,
                services,
                groomers,
                groomer_availability,
                status_cache,
                now,
                used_pets,
                pet_default_groomers,
            )

            for appt in day_appointments:
                status_counts[appt.status.name] += 1
                total_appointments += 1

                if appt.appointment_datetime < now:
                    past_appointments += 1
                else:
                    future_appointments += 1

                # Track by groomer and week for overlaps
                week_key = get_week_key(appt.appointment_datetime)
                if week_key not in groomer_weekly_appointments[appt.staff_id]:
                    groomer_weekly_appointments[appt.staff_id][week_key] = []
                groomer_weekly_appointments[appt.staff_id][week_key].append(appt)

            # Progress update every 10 days
            if (i + 1) % 10 == 0:
                click.echo(f"  Processed {i + 1} days...")

        # Second pass: create overlapping appointments (~1-2 per groomer per week)
        click.echo("\nCreating overlapping appointments...")

        for weekly_appts in groomer_weekly_appointments.values():
            for week_key, appointments in weekly_appts.items():
                if not appointments:
                    continue

                # Randomly decide how many overlaps for this week (1-2)
                num_overlaps = random.randint(1, 2)

                # Pick random appointments to create overlaps for
                # Only pick appointments that are good candidates (not too early or late)
                candidates = [
                    appt for appt in appointments
                    if 10 <= appt.appointment_datetime.hour <= 16  # Good time range for overlaps
                ]

                if not candidates:
                    continue

                # Shuffle and pick up to num_overlaps candidates
                random.shuffle(candidates)
                for i in range(min(num_overlaps, len(candidates))):
                    base_appt = candidates[i]

                    # Choose overlap amount: 15 or 30 minutes
                    overlap_minutes = random.choice([15, 30])

                    overlap_appt = create_overlapping_appointment(
                        db,
                        business_id,
                        base_appt,
                        pets_with_customers,
                        services,
                        status_cache,
                        overlap_minutes,
                        groomer_availability,
                    )

                    if overlap_appt:
                        status_counts[overlap_appt.status.name] += 1
                        total_appointments += 1
                        overlapping_appointments += 1

                        if overlap_appt.appointment_datetime < now:
                            past_appointments += 1
                        else:
                            future_appointments += 1

        db.commit()

        click.echo("\nSeeding complete!")
        click.echo(f"  Total appointments created: {total_appointments}")
        click.echo(f"  Past appointments: {past_appointments}")
        click.echo(f"  Future appointments: {future_appointments}")
        if total_appointments > 0:
            click.echo(f"  Overlapping appointments: {overlapping_appointments} ({overlapping_appointments/total_appointments*100:.1f}%)")
        click.echo(f"\n  Appointments per day: ~{total_appointments // len(working_days)} ({len(groomers)} groomers, availability-capped 4-6 each)")
        click.echo("\nAppointments by status:")
        for status, count in status_counts.items():
            if count > 0:
                click.echo(f"  - {status}: {count}")

    except Exception as e:
        db.rollback()
        click.echo(f"Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_appointments()
