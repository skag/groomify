"""Service category service layer"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.service_category import ServiceCategory
from app.schemas.service_category import ServiceCategoryCreate


class ServiceCategoryError(Exception):
    """Base exception for service category errors"""

    pass


def create_service_category(db: Session, business_id: int, data: ServiceCategoryCreate) -> ServiceCategory:
    """Create a service category for a business."""
    category = ServiceCategory(business_id=business_id, name=data.name)
    try:
        db.add(category)
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError:
        db.rollback()
        raise ServiceCategoryError("A category with that name already exists for this business")
    except Exception as e:
        db.rollback()
        raise ServiceCategoryError(f"Failed to create service category: {e}")
