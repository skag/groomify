"""Service service for CRUD operations"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from app.models.service import Service
from app.models.business_user import BusinessUser
from app.models.animal_type import AnimalType
from app.models.animal_breed import AnimalBreed
from app.models.service_category import ServiceCategory
from app.schemas.service import ServiceCreate, ServiceUpdate
from app.core.logger import get_logger

logger = get_logger("app.services.service_service")


class ServiceError(Exception):
    """Base exception for service errors"""

    pass


def get_services(db: Session, business_id: int) -> list[Service]:
    """
    Get all services for a specific business with eager loading of relationships.

    Args:
        db: Database session
        business_id: Business ID to filter by

    Returns:
        List of services with loaded relationships
    """
    return (
        db.query(Service)
        .filter(Service.business_id == business_id)
        .options(
            joinedload(Service.category),
            joinedload(Service.staff_members),
            joinedload(Service.animal_types),
            joinedload(Service.animal_breeds),
        )
        .order_by(Service.name.asc())
        .all()
    )


def get_service_by_id(db: Session, service_id: int, business_id: int) -> Service | None:
    """
    Get a single service by ID with eager loading of relationships.

    Args:
        db: Database session
        service_id: Service ID
        business_id: Business ID to verify ownership

    Returns:
        Service if found, None otherwise
    """
    return (
        db.query(Service)
        .filter(
            and_(
                Service.id == service_id,
                Service.business_id == business_id,
            )
        )
        .options(
            joinedload(Service.category),
            joinedload(Service.staff_members),
            joinedload(Service.animal_types),
            joinedload(Service.animal_breeds),
        )
        .first()
    )


def get_services_by_category(
    db: Session, category_id: int, business_id: int
) -> list[Service]:
    """
    Get all services for a specific category.

    Args:
        db: Database session
        category_id: Service category ID
        business_id: Business ID to verify ownership

    Returns:
        List of services in the category
    """
    return (
        db.query(Service)
        .filter(
            and_(
                Service.category_id == category_id,
                Service.business_id == business_id,
            )
        )
        .options(
            joinedload(Service.category),
            joinedload(Service.staff_members),
            joinedload(Service.animal_types),
            joinedload(Service.animal_breeds),
        )
        .order_by(Service.name.asc())
        .all()
    )


def create_service(db: Session, service_data: ServiceCreate, business_id: int) -> Service:
    """
    Create a new service.

    Args:
        db: Database session
        service_data: Service creation data
        business_id: Business ID to associate the service with

    Returns:
        Created Service

    Raises:
        ServiceError: If validation fails or database error occurs
    """
    # Validate category exists and belongs to business
    category = (
        db.query(ServiceCategory)
        .filter(
            and_(
                ServiceCategory.id == service_data.category_id,
                ServiceCategory.business_id == business_id,
            )
        )
        .first()
    )
    if not category:
        raise ServiceError(
            f"Service category {service_data.category_id} not found for business {business_id}"
        )

    # Create service
    db_service = Service(
        business_id=business_id,
        name=service_data.name,
        description=service_data.description,
        category_id=service_data.category_id,
        duration_minutes=service_data.duration_minutes,
        price=service_data.price,
        tax_rate=service_data.tax_rate,
        is_active=service_data.is_active,
        applies_to_all_animal_types=service_data.applies_to_all_animal_types,
        applies_to_all_breeds=service_data.applies_to_all_breeds,
    )

    try:
        # Add staff members if provided
        if service_data.staff_member_ids:
            staff_members = (
                db.query(BusinessUser)
                .filter(
                    and_(
                        BusinessUser.id.in_(service_data.staff_member_ids),
                        BusinessUser.business_id == business_id,
                    )
                )
                .all()
            )
            if len(staff_members) != len(service_data.staff_member_ids):
                raise ServiceError(
                    "One or more staff members not found or do not belong to this business"
                )
            db_service.staff_members = staff_members

        # Add animal types if not applying to all
        if not service_data.applies_to_all_animal_types and service_data.animal_type_ids:
            animal_types = (
                db.query(AnimalType)
                .filter(AnimalType.id.in_(service_data.animal_type_ids))
                .all()
            )
            if len(animal_types) != len(service_data.animal_type_ids):
                raise ServiceError("One or more animal types not found")
            db_service.animal_types = animal_types

        # Add animal breeds if not applying to all
        if not service_data.applies_to_all_breeds and service_data.animal_breed_ids:
            animal_breeds = (
                db.query(AnimalBreed)
                .filter(AnimalBreed.id.in_(service_data.animal_breed_ids))
                .all()
            )
            if len(animal_breeds) != len(service_data.animal_breed_ids):
                raise ServiceError("One or more animal breeds not found")
            db_service.animal_breeds = animal_breeds

        db.add(db_service)
        db.commit()
        db.refresh(db_service)
        logger.info(
            f"Created service {db_service.id} for business {business_id}: {db_service.name}"
        )
        return db_service
    except ServiceError:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating service: {e}")
        raise ServiceError(f"Failed to create service: {str(e)}")


def update_service(
    db: Session, service_id: int, service_data: ServiceUpdate, business_id: int
) -> Service:
    """
    Update an existing service.

    Args:
        db: Database session
        service_id: Service ID to update
        service_data: Updated service data
        business_id: Business ID to verify ownership

    Returns:
        Updated Service

    Raises:
        ServiceError: If service not found or validation fails
    """
    db_service = get_service_by_id(db, service_id, business_id)
    if not db_service:
        raise ServiceError(
            f"Service {service_id} not found for business {business_id}"
        )

    try:
        # Update basic fields if provided
        if service_data.name is not None:
            db_service.name = service_data.name

        if service_data.description is not None:
            db_service.description = service_data.description

        if service_data.category_id is not None:
            # Validate category exists and belongs to business
            category = (
                db.query(ServiceCategory)
                .filter(
                    and_(
                        ServiceCategory.id == service_data.category_id,
                        ServiceCategory.business_id == business_id,
                    )
                )
                .first()
            )
            if not category:
                raise ServiceError(
                    f"Service category {service_data.category_id} not found for business {business_id}"
                )
            db_service.category_id = service_data.category_id

        if service_data.duration_minutes is not None:
            db_service.duration_minutes = service_data.duration_minutes

        if service_data.price is not None:
            db_service.price = service_data.price

        if service_data.tax_rate is not None:
            db_service.tax_rate = service_data.tax_rate

        if service_data.is_active is not None:
            db_service.is_active = service_data.is_active

        if service_data.applies_to_all_animal_types is not None:
            db_service.applies_to_all_animal_types = (
                service_data.applies_to_all_animal_types
            )

        if service_data.applies_to_all_breeds is not None:
            db_service.applies_to_all_breeds = service_data.applies_to_all_breeds

        # Update staff members if provided
        if service_data.staff_member_ids is not None:
            if service_data.staff_member_ids:
                staff_members = (
                    db.query(BusinessUser)
                    .filter(
                        and_(
                            BusinessUser.id.in_(service_data.staff_member_ids),
                            BusinessUser.business_id == business_id,
                        )
                    )
                    .all()
                )
                if len(staff_members) != len(service_data.staff_member_ids):
                    raise ServiceError(
                        "One or more staff members not found or do not belong to this business"
                    )
                db_service.staff_members = staff_members
            else:
                db_service.staff_members = []

        # Update animal types if provided
        if service_data.animal_type_ids is not None:
            if service_data.animal_type_ids:
                animal_types = (
                    db.query(AnimalType)
                    .filter(AnimalType.id.in_(service_data.animal_type_ids))
                    .all()
                )
                if len(animal_types) != len(service_data.animal_type_ids):
                    raise ServiceError("One or more animal types not found")
                db_service.animal_types = animal_types
            else:
                db_service.animal_types = []

        # Update animal breeds if provided
        if service_data.animal_breed_ids is not None:
            if service_data.animal_breed_ids:
                animal_breeds = (
                    db.query(AnimalBreed)
                    .filter(AnimalBreed.id.in_(service_data.animal_breed_ids))
                    .all()
                )
                if len(animal_breeds) != len(service_data.animal_breed_ids):
                    raise ServiceError("One or more animal breeds not found")
                db_service.animal_breeds = animal_breeds
            else:
                db_service.animal_breeds = []

        db.commit()
        db.refresh(db_service)
        logger.info(f"Updated service {service_id}")
        return db_service
    except ServiceError:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating service {service_id}: {e}")
        raise ServiceError(f"Failed to update service: {str(e)}")


def delete_service(db: Session, service_id: int, business_id: int) -> Service:
    """
    Delete a service.

    Args:
        db: Database session
        service_id: Service ID to delete
        business_id: Business ID to verify ownership

    Returns:
        Deleted Service

    Raises:
        ServiceError: If service not found
    """
    db_service = get_service_by_id(db, service_id, business_id)
    if not db_service:
        raise ServiceError(
            f"Service {service_id} not found for business {business_id}"
        )

    try:
        db.delete(db_service)
        db.commit()
        logger.info(f"Deleted service {service_id}")
        return db_service
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting service {service_id}: {e}")
        raise ServiceError(f"Failed to delete service: {str(e)}")
