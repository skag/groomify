"""Customer service for CRUD operations"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import datetime, timezone

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.pet import Pet
from app.models.animal_type import AnimalType
from app.models.animal_breed import AnimalBreed
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerCreateWithRelations,
)
from app.schemas.customer_user import CustomerUserAdd
from app.core.logger import get_logger

logger = get_logger("app.services.customer_service")


class CustomerServiceError(Exception):
    """Base exception for customer service errors"""

    pass


def get_customers(db: Session, business_id: int) -> list[Customer]:
    """
    Get all customers for a specific business with nested relations.

    Args:
        db: Database session
        business_id: Business ID to filter by

    Returns:
        List of customers with customer_users and pets
    """
    return (
        db.query(Customer)
        .filter(Customer.business_id == business_id)
        .options(
            joinedload(Customer.customer_users), joinedload(Customer.pets)
        )
        .order_by(Customer.created_at.desc())
        .all()
    )


def get_customer_by_id(
    db: Session, customer_id: int, business_id: int
) -> Customer | None:
    """
    Get a single customer by ID with nested relations, ensuring it belongs to the specified business.

    Args:
        db: Database session
        customer_id: Customer ID
        business_id: Business ID to verify ownership

    Returns:
        Customer with nested relations if found, None otherwise
    """
    return (
        db.query(Customer)
        .filter(
            and_(
                Customer.id == customer_id,
                Customer.business_id == business_id,
            )
        )
        .options(
            joinedload(Customer.customer_users), joinedload(Customer.pets)
        )
        .first()
    )


def create_customer_with_relations(
    db: Session, customer_data: CustomerCreateWithRelations, business_id: int
) -> Customer:
    """
    Create a new customer with associated customer_user and pet in a single transaction.

    Args:
        db: Database session
        customer_data: Customer creation data with customer_user and pet
        business_id: Business ID to associate the customer with

    Returns:
        Created Customer with nested relations

    Raises:
        CustomerServiceError: If validation fails or database error occurs
    """
    try:
        # Generate account_name: "{last_name} - {pet_name}"
        account_name = (
            f"{customer_data.customer_user.last_name} - {customer_data.pet.name}"
        )

        # Create customer
        db_customer = Customer(
            business_id=business_id,
            account_name=account_name,
            status="active",
            address_line1=customer_data.address_line1,
            address_line2=customer_data.address_line2,
            city=customer_data.city,
            state=customer_data.state,
            country=customer_data.country,
            postal_code=customer_data.postal_code,
        )

        db.add(db_customer)
        db.flush()  # Flush to get customer ID

        # Create customer_user (primary contact)
        db_customer_user = CustomerUser(
            customer_id=db_customer.id,
            business_id=business_id,
            email=customer_data.customer_user.email,
            first_name=customer_data.customer_user.first_name,
            last_name=customer_data.customer_user.last_name,
            phone=customer_data.customer_user.phone,
            is_primary_contact=True,  # First customer user is always primary
        )

        db.add(db_customer_user)

        # Get animal type to determine species
        animal_type = (
            db.query(AnimalType)
            .filter(AnimalType.id == customer_data.pet.animal_type_id)
            .first()
        )

        if not animal_type:
            raise CustomerServiceError(
                f"Animal type {customer_data.pet.animal_type_id} not found"
            )

        # Get breed name if breed_id provided
        breed_name = None
        if customer_data.pet.breed_id:
            breed = (
                db.query(AnimalBreed)
                .filter(AnimalBreed.id == customer_data.pet.breed_id)
                .first()
            )
            if breed:
                breed_name = breed.name

        # Calculate age from birth_date if provided
        age = None
        if customer_data.pet.birth_date:
            today = datetime.now(timezone.utc).date()
            age = (
                today.year
                - customer_data.pet.birth_date.year
                - (
                    (today.month, today.day)
                    < (customer_data.pet.birth_date.month, customer_data.pet.birth_date.day)
                )
            )

        # Create pet
        db_pet = Pet(
            customer_id=db_customer.id,
            business_id=business_id,
            name=customer_data.pet.name,
            species=animal_type.name,
            breed=breed_name,
            age=age,
            weight=customer_data.pet.weight,
            special_notes=(
                f"Spayed/Neutered: {'Yes' if customer_data.pet.spayed_neutered else 'No'}"
            ),
        )

        db.add(db_pet)

        # Commit transaction
        db.commit()

        # Refresh to get all relationships
        db.refresh(db_customer)

        logger.info(
            f"Created customer {db_customer.id} for business {business_id}: {account_name}"
        )

        return db_customer

    except CustomerServiceError:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating customer with relations: {e}")
        raise CustomerServiceError(f"Failed to create customer: {str(e)}")


def update_customer(
    db: Session, customer_id: int, customer_data: CustomerUpdate, business_id: int
) -> Customer:
    """
    Update an existing customer.

    Args:
        db: Database session
        customer_id: Customer ID to update
        customer_data: Updated customer data
        business_id: Business ID to verify ownership

    Returns:
        Updated Customer

    Raises:
        CustomerServiceError: If customer not found or validation fails
    """
    db_customer = get_customer_by_id(db, customer_id, business_id)
    if not db_customer:
        raise CustomerServiceError(
            f"Customer {customer_id} not found for business {business_id}"
        )

    # Update fields if provided
    if customer_data.account_name is not None:
        db_customer.account_name = customer_data.account_name

    if customer_data.status is not None:
        db_customer.status = customer_data.status

    if customer_data.address_line1 is not None:
        db_customer.address_line1 = customer_data.address_line1

    if customer_data.address_line2 is not None:
        db_customer.address_line2 = customer_data.address_line2

    if customer_data.city is not None:
        db_customer.city = customer_data.city

    if customer_data.state is not None:
        db_customer.state = customer_data.state

    if customer_data.country is not None:
        db_customer.country = customer_data.country

    if customer_data.postal_code is not None:
        db_customer.postal_code = customer_data.postal_code

    try:
        db.commit()
        db.refresh(db_customer)
        logger.info(f"Updated customer {customer_id}")
        return db_customer
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating customer {customer_id}: {e}")
        raise CustomerServiceError(f"Failed to update customer: {str(e)}")


def add_customer_user(
    db: Session, customer_id: int, customer_user_data: CustomerUserAdd, business_id: int
) -> CustomerUser:
    """
    Add a new customer user to an existing customer.

    Args:
        db: Database session
        customer_id: Customer ID to add user to
        customer_user_data: Customer user data
        business_id: Business ID to verify ownership

    Returns:
        Created CustomerUser

    Raises:
        CustomerServiceError: If customer not found or validation fails
    """
    # Verify customer exists and belongs to business
    db_customer = get_customer_by_id(db, customer_id, business_id)
    if not db_customer:
        raise CustomerServiceError(
            f"Customer {customer_id} not found for business {business_id}"
        )

    try:
        # Create new customer user
        db_customer_user = CustomerUser(
            customer_id=customer_id,
            business_id=business_id,
            email=customer_user_data.email,
            first_name=customer_user_data.first_name,
            last_name=customer_user_data.last_name,
            phone=customer_user_data.phone,
            is_primary_contact=False,  # Additional users are not primary
        )

        db.add(db_customer_user)
        db.commit()
        db.refresh(db_customer_user)

        logger.info(
            f"Added customer user {db_customer_user.id} to customer {customer_id}"
        )

        return db_customer_user

    except Exception as e:
        db.rollback()
        logger.error(f"Error adding customer user to customer {customer_id}: {e}")
        raise CustomerServiceError(f"Failed to add customer user: {str(e)}")


def delete_customer(db: Session, customer_id: int, business_id: int) -> Customer:
    """
    Delete a customer (cascade deletes customer_users and pets).

    Args:
        db: Database session
        customer_id: Customer ID to delete
        business_id: Business ID to verify ownership

    Returns:
        Deleted Customer

    Raises:
        CustomerServiceError: If customer not found
    """
    db_customer = get_customer_by_id(db, customer_id, business_id)
    if not db_customer:
        raise CustomerServiceError(
            f"Customer {customer_id} not found for business {business_id}"
        )

    try:
        db.delete(db_customer)
        db.commit()
        logger.info(f"Deleted customer {customer_id}")
        return db_customer
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting customer {customer_id}: {e}")
        raise CustomerServiceError(f"Failed to delete customer: {str(e)}")
