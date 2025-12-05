"""
Order service for managing business orders
"""

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.models.order import Order
from app.models.appointment import Appointment
from app.models.pet import Pet
from app.models.business_user import BusinessUser
from app.models.service import Service
from app.core.logger import get_logger

logger = get_logger(__name__)


class OrderService:
    """Service for managing orders"""

    @staticmethod
    def generate_order_number(business_id: int) -> str:
        """
        Generate unique order number for a business.

        Format: ORD-{timestamp}-{business_id}
        Example: ORD-20251205134500-42
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        return f"ORD-{timestamp}-{business_id}"

    @staticmethod
    def create_order_from_appointment(
        db: Session,
        appointment_id: int,
        business_id: int,
        tax_rate: Decimal = Decimal("0.00")
    ) -> Order:
        """
        Create an order from an appointment.

        Args:
            db: Database session
            appointment_id: Appointment ID
            business_id: Business ID
            tax_rate: Tax rate as decimal (e.g., 0.08 for 8%)

        Returns:
            Order: Created order

        Raises:
            ValueError: If appointment not found or already has an order
        """
        # Load appointment with relationships (eagerly load services)
        stmt = select(Appointment).options(
            joinedload(Appointment.services)
        ).where(
            Appointment.id == appointment_id,
            Appointment.business_id == business_id
        )
        appointment = db.execute(stmt).unique().scalar_one_or_none()

        if not appointment:
            raise ValueError(f"Appointment {appointment_id} not found")

        # Check if order already exists for this appointment
        existing_order = db.execute(
            select(Order).where(Order.appointment_id == appointment_id)
        ).scalar_one_or_none()

        if existing_order:
            raise ValueError(f"Order already exists for appointment {appointment_id}")

        # Load related data for denormalization
        pet = db.execute(
            select(Pet).where(Pet.id == appointment.pet_id)
        ).scalar_one_or_none() if appointment.pet_id else None

        groomer = db.execute(
            select(BusinessUser).where(BusinessUser.id == appointment.staff_id)
        ).scalar_one_or_none()

        # Get service from appointment_services relationship
        service = appointment.services[0] if appointment.services else None

        # Log for debugging
        if service:
            logger.info(f"Service found: {service.name}, price: {service.price}")
        else:
            logger.warning(f"No service found for appointment {appointment_id}")

        # Calculate financial totals
        subtotal = Decimal(str(service.price)) if service and service.price else Decimal("0.00")
        tax = (subtotal * tax_rate).quantize(Decimal("0.01"))
        total = subtotal + tax

        # Create order
        order = Order(
            business_id=business_id,
            customer_id=appointment.customer_id,
            pet_id=appointment.pet_id,
            appointment_id=appointment_id,
            groomer_id=appointment.staff_id,  # staff_id maps to groomer_id in orders
            service_id=service.id if service else None,
            order_type="appointment",
            order_number=OrderService.generate_order_number(business_id),
            subtotal=subtotal,
            tax=tax,
            tip=Decimal("0.00"),
            total=total,
            service_title=service.name if service else "Unknown Service",
            groomer_name=f"{groomer.first_name} {groomer.last_name}" if groomer else "Unknown Groomer",
            pet_name=pet.name if pet else "Unknown Pet",
            order_status="pending",
            payment_status="unpaid"
        )

        db.add(order)
        db.commit()
        db.refresh(order)

        logger.info(f"Created order {order.order_number} from appointment {appointment_id}")
        return order

    @staticmethod
    def update_order_payment_status(
        db: Session,
        order_id: int,
        payment_status: str
    ) -> Order:
        """
        Update order payment status.

        Args:
            db: Database session
            order_id: Order ID
            payment_status: New payment status (unpaid/pending/paid/partially_paid/refunded/failed)

        Returns:
            Order: Updated order
        """
        order = db.execute(
            select(Order).where(Order.id == order_id)
        ).scalar_one_or_none()

        if not order:
            raise ValueError(f"Order {order_id} not found")

        order.payment_status = payment_status
        db.commit()
        db.refresh(order)

        logger.info(f"Updated order {order.order_number} payment status to {payment_status}")
        return order

    @staticmethod
    def add_tip_to_order(
        db: Session,
        order_id: int,
        tip_amount: Decimal
    ) -> Order:
        """
        Add tip to order and recalculate total.

        Args:
            db: Database session
            order_id: Order ID
            tip_amount: Tip amount to add

        Returns:
            Order: Updated order
        """
        order = db.execute(
            select(Order).where(Order.id == order_id)
        ).scalar_one_or_none()

        if not order:
            raise ValueError(f"Order {order_id} not found")

        order.tip = tip_amount
        # Recalculate total: (subtotal - discount) + tax + tip
        subtotal_after_discount = order.subtotal - order.discount_amount
        order.total = subtotal_after_discount + order.tax + order.tip
        db.commit()
        db.refresh(order)

        logger.info(f"Added tip ${tip_amount} to order {order.order_number}")
        return order

    @staticmethod
    def update_order_discount(
        db: Session,
        order_id: int,
        business_id: int,
        discount_type: str | None,
        discount_value: Decimal | None
    ) -> Order:
        """
        Update order discount and recalculate totals.

        Calculation order:
        1. Start with subtotal
        2. Calculate discount amount based on type
        3. Apply discount to get subtotal_after_discount
        4. Calculate tax on subtotal_after_discount
        5. Add tip
        6. Calculate final total

        Args:
            db: Database session
            order_id: Order ID
            business_id: Business ID
            discount_type: "percentage" or "dollar" or None
            discount_value: Discount value (e.g., 15 for 15% or $15)

        Returns:
            Order: Updated order with recalculated totals
        """
        order = db.execute(
            select(Order).where(
                Order.id == order_id,
                Order.business_id == business_id
            )
        ).scalar_one_or_none()

        if not order:
            raise ValueError(f"Order {order_id} not found")

        # Update discount fields
        order.discount_type = discount_type
        order.discount_value = discount_value

        # Calculate discount amount
        if discount_type and discount_value:
            if discount_type == "percentage":
                # Percentage discount: subtotal * (percentage / 100)
                discount_amount = (order.subtotal * discount_value / 100).quantize(Decimal("0.01"))
            else:  # dollar
                # Fixed dollar discount
                discount_amount = Decimal(str(discount_value)).quantize(Decimal("0.01"))

            # Ensure discount doesn't exceed subtotal
            discount_amount = min(discount_amount, order.subtotal)
        else:
            # No discount
            discount_amount = Decimal("0.00")

        order.discount_amount = discount_amount

        # Recalculate totals
        subtotal_after_discount = order.subtotal - discount_amount

        # Calculate tax on discounted amount
        # Extract tax rate from existing tax and subtotal
        if order.subtotal > 0:
            tax_rate = order.tax / order.subtotal
        else:
            tax_rate = Decimal("0.00")

        order.tax = (subtotal_after_discount * tax_rate).quantize(Decimal("0.01"))

        # Calculate final total
        order.total = subtotal_after_discount + order.tax + order.tip

        db.commit()
        db.refresh(order)

        logger.info(
            f"Updated discount for order {order.order_number}: "
            f"{discount_type or 'none'} {discount_value or 0} = ${discount_amount} off, "
            f"new total: ${order.total}"
        )
        return order

    @staticmethod
    def complete_order(
        db: Session,
        order_id: int
    ) -> Order:
        """
        Mark order as completed.

        Args:
            db: Database session
            order_id: Order ID

        Returns:
            Order: Completed order
        """
        order = db.execute(
            select(Order).where(Order.id == order_id)
        ).scalar_one_or_none()

        if not order:
            raise ValueError(f"Order {order_id} not found")

        order.order_status = "completed"
        order.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)

        logger.info(f"Completed order {order.order_number}")
        return order

    @staticmethod
    def get_order_by_id(db: Session, order_id: int, business_id: int) -> Order | None:
        """Get order by ID for a specific business"""
        stmt = select(Order).where(
            Order.id == order_id,
            Order.business_id == business_id
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_order_by_appointment(
        db: Session,
        appointment_id: int,
        business_id: int
    ) -> Order | None:
        """Get order for a specific appointment"""
        stmt = select(Order).where(
            Order.appointment_id == appointment_id,
            Order.business_id == business_id
        )
        return db.execute(stmt).scalar_one_or_none()
