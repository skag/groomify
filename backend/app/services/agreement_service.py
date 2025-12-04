"""Agreement service for CRUD operations"""

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.agreement import Agreement
from app.schemas.agreement import AgreementCreate, AgreementUpdate
from app.core.logger import get_logger

logger = get_logger("app.services.agreement_service")


class AgreementServiceError(Exception):
    """Base exception for agreement service errors"""

    pass


def get_agreements(db: Session, business_id: int) -> list[Agreement]:
    """
    Get all agreements for a specific business.

    Args:
        db: Database session
        business_id: Business ID to filter by

    Returns:
        List of agreements
    """
    return (
        db.query(Agreement)
        .filter(Agreement.business_id == business_id)
        .order_by(Agreement.created_at.desc())
        .all()
    )


def get_agreement_by_id(
    db: Session, agreement_id: int, business_id: int
) -> Agreement | None:
    """
    Get a single agreement by ID, ensuring it belongs to the specified business.

    Args:
        db: Database session
        agreement_id: Agreement ID
        business_id: Business ID to verify ownership

    Returns:
        Agreement if found, None otherwise
    """
    return (
        db.query(Agreement)
        .filter(
            and_(
                Agreement.id == agreement_id,
                Agreement.business_id == business_id,
            )
        )
        .first()
    )


def create_agreement(
    db: Session, agreement_data: AgreementCreate, business_id: int
) -> Agreement:
    """
    Create a new agreement.

    Args:
        db: Database session
        agreement_data: Agreement creation data
        business_id: Business ID to associate the agreement with

    Returns:
        Created Agreement

    Raises:
        AgreementServiceError: If validation fails or database error occurs
    """
    # Create agreement
    db_agreement = Agreement(
        business_id=business_id,
        name=agreement_data.name,
        content=agreement_data.content,
        signing_option=agreement_data.signing_option,
    )

    try:
        db.add(db_agreement)
        db.commit()
        db.refresh(db_agreement)
        logger.info(
            f"Created agreement {db_agreement.id} for business {business_id}: {db_agreement.name}"
        )
        return db_agreement
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating agreement: {e}")
        raise AgreementServiceError(f"Failed to create agreement: {str(e)}")


def update_agreement(
    db: Session, agreement_id: int, agreement_data: AgreementUpdate, business_id: int
) -> Agreement:
    """
    Update an existing agreement.

    Args:
        db: Database session
        agreement_id: Agreement ID to update
        agreement_data: Updated agreement data
        business_id: Business ID to verify ownership

    Returns:
        Updated Agreement

    Raises:
        AgreementServiceError: If agreement not found or validation fails
    """
    db_agreement = get_agreement_by_id(db, agreement_id, business_id)
    if not db_agreement:
        raise AgreementServiceError(
            f"Agreement {agreement_id} not found for business {business_id}"
        )

    # Update fields if provided
    if agreement_data.name is not None:
        db_agreement.name = agreement_data.name

    if agreement_data.content is not None:
        db_agreement.content = agreement_data.content

    if agreement_data.signing_option is not None:
        db_agreement.signing_option = agreement_data.signing_option

    if agreement_data.status is not None:
        db_agreement.status = agreement_data.status

    try:
        db.commit()
        db.refresh(db_agreement)
        logger.info(f"Updated agreement {agreement_id}")
        return db_agreement
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating agreement {agreement_id}: {e}")
        raise AgreementServiceError(f"Failed to update agreement: {str(e)}")


def delete_agreement(db: Session, agreement_id: int, business_id: int) -> Agreement:
    """
    Delete an agreement.

    Args:
        db: Database session
        agreement_id: Agreement ID to delete
        business_id: Business ID to verify ownership

    Returns:
        Deleted Agreement

    Raises:
        AgreementServiceError: If agreement not found
    """
    db_agreement = get_agreement_by_id(db, agreement_id, business_id)
    if not db_agreement:
        raise AgreementServiceError(
            f"Agreement {agreement_id} not found for business {business_id}"
        )

    try:
        db.delete(db_agreement)
        db.commit()
        logger.info(f"Deleted agreement {agreement_id}")
        return db_agreement
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting agreement {agreement_id}: {e}")
        raise AgreementServiceError(f"Failed to delete agreement: {str(e)}")
