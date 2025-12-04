"""Customer API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    BusinessId,
    CurrentUser,
    OwnerOrStaffUser,
)
from app.schemas.customer import (
    Customer as CustomerSchema,
    CustomerWithRelations,
    CustomerCreate,
    CustomerUpdate,
    CustomerCreateWithRelations,
)
from app.schemas.customer_user import CustomerUser as CustomerUserSchema, CustomerUserAdd
from app.services.customer_service import (
    get_customers,
    get_customer_by_id,
    create_customer_with_relations,
    update_customer,
    delete_customer,
    add_customer_user,
    CustomerServiceError,
)
from app.core.logger import get_logger

logger = get_logger("app.api.customers")

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get(
    "",
    response_model=list[CustomerWithRelations],
    summary="Get all customers",
    description="Retrieve all customers for the authenticated user's business with nested customer_users and pets.",
)
def list_customers(
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[CustomerWithRelations]:
    """
    Get all customers for the current user's business.

    Requires authentication. Business ID is extracted from JWT token.
    Returns customers with nested customer_users and pets.
    """
    try:
        customers = get_customers(db, business_id)
        return customers
    except Exception as e:
        logger.error(f"Error fetching customers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch customers",
        )


@router.get(
    "/{customer_id}",
    response_model=CustomerWithRelations,
    summary="Get a customer",
    description="Retrieve a single customer by ID with nested customer_users and pets.",
)
def get_customer(
    customer_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> CustomerWithRelations:
    """
    Get a single customer by ID.

    Requires authentication. Customer must belong to the same business.
    Business ID is extracted from JWT token.
    Returns customer with nested customer_users and pets.
    """
    customer = get_customer_by_id(db, customer_id, business_id)

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )

    return customer


@router.post(
    "",
    response_model=CustomerWithRelations,
    status_code=status.HTTP_201_CREATED,
    summary="Create a customer",
    description="Create a new customer with associated customer_user and pet. Requires owner or staff role.",
)
def create_new_customer(
    customer_data: CustomerCreateWithRelations,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> CustomerWithRelations:
    """
    Create a new customer with customer_user and pet in a single transaction.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    Account name is auto-generated from customer_user last name and pet name.
    """
    try:
        logger.info(
            f"Creating customer for business {current_user.business_id}: "
            f"{customer_data.customer_user.first_name} {customer_data.customer_user.last_name}"
        )
        new_customer = create_customer_with_relations(
            db, customer_data, current_user.business_id
        )
        return new_customer

    except CustomerServiceError as e:
        logger.warning(f"Customer creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error creating customer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating customer",
        )


@router.put(
    "/{customer_id}",
    response_model=CustomerWithRelations,
    summary="Update a customer",
    description="Update an existing customer. Requires owner or staff role.",
)
def update_existing_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> CustomerWithRelations:
    """
    Update an existing customer.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Updating customer {customer_id}")
        updated_customer = update_customer(
            db, customer_id, customer_data, current_user.business_id
        )
        return updated_customer

    except CustomerServiceError as e:
        logger.warning(f"Customer update failed: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error updating customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating customer",
        )


@router.post(
    "/{customer_id}/users",
    response_model=CustomerUserSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a customer user",
    description="Add a new customer user (contact person) to an existing customer. Requires owner or staff role.",
)
def add_customer_user_to_customer(
    customer_id: int,
    customer_user_data: CustomerUserAdd,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> CustomerUserSchema:
    """
    Add a new customer user to an existing customer.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    The new user will not be set as primary contact.
    """
    try:
        logger.info(
            f"Adding customer user to customer {customer_id}: "
            f"{customer_user_data.first_name} {customer_user_data.last_name}"
        )
        new_customer_user = add_customer_user(
            db, customer_id, customer_user_data, current_user.business_id
        )
        return new_customer_user

    except CustomerServiceError as e:
        logger.warning(f"Adding customer user failed: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error adding customer user to customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while adding customer user",
        )


@router.delete(
    "/{customer_id}",
    response_model=CustomerWithRelations,
    summary="Delete a customer",
    description="Delete a customer. Requires owner or staff role.",
)
def delete_existing_customer(
    customer_id: int,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> CustomerWithRelations:
    """
    Delete a customer (cascade deletes customer_users and pets).

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Deleting customer {customer_id}")
        deleted_customer = delete_customer(db, customer_id, current_user.business_id)
        return deleted_customer

    except CustomerServiceError as e:
        logger.warning(f"Customer deletion failed: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error deleting customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting customer",
        )
