"""Appointments API endpoints"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import BusinessId
from app.schemas.appointment import (
    DailyAppointmentsResponse,
    CreateAppointmentRequest,
    CreateAppointmentResponse,
    UpdateAppointmentRequest,
    UpdateAppointmentResponse,
    AppointmentServiceSchema,
)
from app.services.appointment_service import (
    get_daily_appointments,
    create_appointment,
    update_appointment,
    AppointmentServiceError,
)
from app.core.logger import get_logger

logger = get_logger("app.api.appointments")

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get(
    "/daily",
    response_model=DailyAppointmentsResponse,
    summary="Get daily appointments by groomer",
    description="Retrieve all appointments for a specific date, grouped by groomer. Includes all groomers even if they have no appointments.",
)
def get_appointments_for_day(
    business_id: BusinessId,
    db: Session = Depends(get_db),
    date: date = Query(..., description="Date in YYYY-MM-DD format"),
) -> DailyAppointmentsResponse:
    """
    Get all appointments for a specific date, grouped by groomer.

    Returns:
        - List of groomers with their appointments for the day
        - Total appointment count for the day
        - The requested date
    """
    try:
        return get_daily_appointments(db, business_id, date)

    except AppointmentServiceError as e:
        logger.warning(f"Daily appointments fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Error fetching daily appointments for {date}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch daily appointments",
        )


@router.post(
    "",
    response_model=CreateAppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new appointment",
    description="Create a new appointment for a pet with a groomer.",
)
def create_new_appointment(
    request: CreateAppointmentRequest,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> CreateAppointmentResponse:
    """
    Create a new appointment.

    Required fields:
        - pet_id: The pet to book
        - staff_id: The groomer/staff member
        - appointment_datetime: When the appointment starts
        - duration_minutes: How long the appointment is

    Optional fields:
        - service_ids: List of services to include
        - notes: Any notes about the appointment
    """
    try:
        appointment = create_appointment(
            db=db,
            business_id=business_id,
            pet_id=request.pet_id,
            staff_id=request.staff_id,
            service_ids=request.service_ids,
            appointment_datetime=request.appointment_datetime,
            duration_minutes=request.duration_minutes,
            notes=request.notes,
        )

        # Build the response with related data
        services = [
            AppointmentServiceSchema(name=s.name, price=0)
            for s in appointment.services
        ]

        return CreateAppointmentResponse(
            id=appointment.id,
            pet_id=appointment.pet_id,
            pet_name=appointment.pet.name if appointment.pet else "Unknown",
            customer_id=appointment.customer_id,
            customer_name=appointment.customer.account_name if appointment.customer else "Unknown",
            staff_id=appointment.staff_id,
            staff_name=f"{appointment.staff_member.first_name} {appointment.staff_member.last_name}" if appointment.staff_member else "Unknown",
            appointment_datetime=appointment.appointment_datetime,
            duration_minutes=appointment.duration_minutes,
            services=services,
            status=appointment.status.name if appointment.status else "scheduled",
            notes=appointment.notes,
        )

    except AppointmentServiceError as e:
        logger.warning(f"Appointment creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Error creating appointment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create appointment",
        )


@router.patch(
    "/{appointment_id}",
    response_model=UpdateAppointmentResponse,
    summary="Update an existing appointment",
    description="Update an appointment's time, duration, groomer, or services.",
)
def update_existing_appointment(
    appointment_id: int,
    request: UpdateAppointmentRequest,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> UpdateAppointmentResponse:
    """
    Update an existing appointment.

    Updatable fields:
        - staff_id: Change the groomer/staff member
        - service_ids: Change the services
        - appointment_datetime: Change the time (not date)
        - duration_minutes: Change the duration
        - notes: Update notes
    """
    try:
        appointment = update_appointment(
            db=db,
            business_id=business_id,
            appointment_id=appointment_id,
            staff_id=request.staff_id,
            service_ids=request.service_ids,
            appointment_datetime=request.appointment_datetime,
            duration_minutes=request.duration_minutes,
            notes=request.notes,
        )

        # Build the response with related data
        services = [
            AppointmentServiceSchema(name=s.name, price=0)
            for s in appointment.services
        ]

        return UpdateAppointmentResponse(
            id=appointment.id,
            pet_id=appointment.pet_id,
            pet_name=appointment.pet.name if appointment.pet else "Unknown",
            customer_id=appointment.customer_id,
            customer_name=appointment.customer.account_name if appointment.customer else "Unknown",
            staff_id=appointment.staff_id,
            staff_name=f"{appointment.staff_member.first_name} {appointment.staff_member.last_name}" if appointment.staff_member else "Unknown",
            appointment_datetime=appointment.appointment_datetime,
            duration_minutes=appointment.duration_minutes,
            services=services,
            status=appointment.status.name if appointment.status else "scheduled",
            notes=appointment.notes,
        )

    except AppointmentServiceError as e:
        logger.warning(f"Appointment update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Error updating appointment {appointment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update appointment",
        )
