"""Appointment service for CRUD operations"""

from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, cast, Date

from app.models.appointment import Appointment
from app.models.business_user import BusinessUser, BusinessUserRole, BusinessUserRoleName
from app.models.customer import Customer
from app.schemas.appointment import (
    CustomerAppointmentHistory,
    AppointmentServiceSchema,
    DailyAppointmentItem,
    DailyAppointmentsResponse,
    GroomerWithAppointments,
)
from app.core.logger import get_logger

logger = get_logger("app.services.appointment_service")


class AppointmentServiceError(Exception):
    """Base exception for appointment service errors"""

    pass


def get_customer_booking_history(
    db: Session, customer_id: int, business_id: int
) -> list[CustomerAppointmentHistory]:
    """
    Get all past appointments for a customer across all their pets.

    Args:
        db: Database session
        customer_id: Customer ID
        business_id: Business ID to verify ownership

    Returns:
        List of past appointments for the customer
    """
    # Verify customer exists and belongs to business
    db_customer = (
        db.query(Customer)
        .filter(
            and_(
                Customer.id == customer_id,
                Customer.business_id == business_id,
            )
        )
        .first()
    )

    if not db_customer:
        raise AppointmentServiceError(
            f"Customer {customer_id} not found for business {business_id}"
        )

    now = datetime.now(timezone.utc)

    # Get all past appointments for this customer
    appointments = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.pet),
            joinedload(Appointment.services),
        )
        .filter(
            and_(
                Appointment.customer_id == customer_id,
                Appointment.business_id == business_id,
                Appointment.appointment_datetime < now,
            )
        )
        .order_by(Appointment.appointment_datetime.desc())
        .all()
    )

    # Transform to response schema
    result = []
    for appt in appointments:
        end_time = appt.appointment_datetime + timedelta(minutes=appt.duration_minutes)

        services = [
            AppointmentServiceSchema(name=service.name, price=0)
            for service in appt.services
        ]

        result.append(
            CustomerAppointmentHistory(
                id=appt.id,
                pet_name=appt.pet.name if appt.pet else "Unknown",
                date=appt.appointment_datetime,
                end_time=end_time,
                duration_minutes=appt.duration_minutes,
                services=services,
                tip=0,
                amount=0,
                has_note=bool(appt.notes),
                note=appt.notes,
            )
        )

    return result


def _format_time_12h(dt: datetime) -> str:
    """Format datetime to 12-hour time string (e.g., '9:00 AM')"""
    hour = dt.hour
    minute = dt.minute
    period = "AM" if hour < 12 else "PM"
    if hour == 0:
        hour = 12
    elif hour > 12:
        hour -= 12
    return f"{hour}:{minute:02d} {period}"


def get_daily_appointments(
    db: Session, business_id: int, target_date: date
) -> DailyAppointmentsResponse:
    """
    Get all appointments for a specific date, grouped by groomer.

    Includes all active groomers for the business, even those with no appointments.

    Args:
        db: Database session
        business_id: Business ID
        target_date: The date to fetch appointments for

    Returns:
        DailyAppointmentsResponse with groomers and their appointments
    """
    # Get all groomers for this business (active only)
    groomer_role = (
        db.query(BusinessUserRole)
        .filter(BusinessUserRole.name == BusinessUserRoleName.GROOMER.value)
        .first()
    )

    groomers: list[BusinessUser] = []
    if groomer_role:
        groomers = (
            db.query(BusinessUser)
            .filter(
                and_(
                    BusinessUser.business_id == business_id,
                    BusinessUser.role_id == groomer_role.id,
                    BusinessUser.is_active == True,
                )
            )
            .order_by(BusinessUser.first_name, BusinessUser.last_name)
            .all()
        )

    # Get all appointments for the date with eager loading
    # Cast appointment_datetime to date for comparison (ignores timezone issues)
    appointments = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.pet),
            joinedload(Appointment.customer),
            joinedload(Appointment.staff_member),
            joinedload(Appointment.services),
            joinedload(Appointment.status),
        )
        .filter(
            and_(
                Appointment.business_id == business_id,
                cast(Appointment.appointment_datetime, Date) == target_date,
            )
        )
        .order_by(Appointment.appointment_datetime)
        .all()
    )

    # Group appointments by groomer
    appointments_by_groomer: dict[int, list[DailyAppointmentItem]] = {
        groomer.id: [] for groomer in groomers
    }

    for appt in appointments:
        end_time = appt.appointment_datetime + timedelta(minutes=appt.duration_minutes)

        # Get primary service name (first service, or "No Service" if empty)
        service_name = "No Service"
        if appt.services and len(appt.services) > 0:
            service_name = appt.services[0].name

        # Build the daily appointment item
        item = DailyAppointmentItem(
            id=appt.id,
            time=_format_time_12h(appt.appointment_datetime),
            end_time=_format_time_12h(end_time),
            pet_name=appt.pet.name if appt.pet else "Unknown",
            owner=appt.customer.account_name if appt.customer else "Unknown",
            service=service_name,
            groomer=(
                f"{appt.staff_member.first_name} {appt.staff_member.last_name}"
                if appt.staff_member
                else "Unassigned"
            ),
            groomer_id=appt.staff_id,
            tags=[],  # Tags not implemented yet - placeholder
            status=appt.status.name if appt.status else None,
        )

        # Add to groomer's list if groomer exists in our dict
        if appt.staff_id in appointments_by_groomer:
            appointments_by_groomer[appt.staff_id].append(item)
        else:
            # Handle case where appointment is assigned to non-groomer staff
            # or groomer who is no longer active
            logger.warning(
                f"Appointment {appt.id} assigned to staff {appt.staff_id} "
                "who is not in active groomers list"
            )

    # Build response
    groomer_responses = [
        GroomerWithAppointments(
            id=groomer.id,
            name=f"{groomer.first_name} {groomer.last_name}",
            appointments=appointments_by_groomer.get(groomer.id, []),
        )
        for groomer in groomers
    ]

    return DailyAppointmentsResponse(
        date=target_date,
        total_appointments=len(appointments),
        groomers=groomer_responses,
    )
