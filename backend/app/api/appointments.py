"""Appointments API endpoints"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import BusinessId
from app.schemas.appointment import DailyAppointmentsResponse
from app.services.appointment_service import (
    get_daily_appointments,
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
