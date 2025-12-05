"""
Payment processing service for handling terminal payments
"""

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.payment import Payment
from app.models.order import Order
from app.models.payment_device import PaymentDevice
from app.models.payment_configuration import PaymentConfiguration
from app.services.providers.square_provider import SquarePaymentProvider
from app.services.order_service import OrderService
from app.core.encryption import decrypt_data
from app.core.logger import get_logger

logger = get_logger(__name__)


class PaymentProcessingService:
    """Service for processing payments through Square Terminal"""

    @staticmethod
    def initiate_terminal_payment(
        db: Session,
        order_id: int,
        business_id: int,
        payment_device_id: int,
        processed_by_id: int | None = None
    ) -> Payment:
        """
        Initiate a payment on Square Terminal.

        Flow:
        1. Load order and device
        2. Create payment record with status="pending"
        3. Create Square terminal checkout
        4. Update payment with checkout ID
        5. Update order payment_status to "pending"

        Args:
            db: Database session
            order_id: Order ID to pay for
            business_id: Business ID
            payment_device_id: Payment device ID to use
            processed_by_id: Business user initiating the payment

        Returns:
            Payment: Created payment record

        Raises:
            ValueError: If order/device not found or payment config missing
        """
        # Load order
        order = db.execute(
            select(Order).where(
                Order.id == order_id,
                Order.business_id == business_id
            )
        ).scalar_one_or_none()

        if not order:
            raise ValueError(f"Order {order_id} not found")

        if order.payment_status == "paid":
            raise ValueError(f"Order {order.order_number} is already paid")

        # Load payment device
        device = db.execute(
            select(PaymentDevice).where(
                PaymentDevice.id == payment_device_id,
                PaymentDevice.business_id == business_id,
                PaymentDevice.is_active == True
            )
        ).scalar_one_or_none()

        if not device:
            raise ValueError(f"Payment device {payment_device_id} not found or inactive")

        # Load payment configuration from device relationship
        config = device.configuration

        if not config or not config.is_active:
            raise ValueError(f"Payment device configuration is not active")

        # Decrypt credentials
        credentials = decrypt_data(config.encrypted_credentials)

        # Create payment record
        payment = Payment(
            business_id=business_id,
            order_id=order_id,
            payment_device_id=payment_device_id,
            processed_by_id=processed_by_id,
            payment_type="charge",
            payment_method="square_terminal",
            amount=order.total,
            status="pending"
        )

        db.add(payment)
        db.flush()  # Get payment ID without committing

        # Initialize Square provider
        provider = SquarePaymentProvider(
            credentials=credentials,
            provider_settings=config.settings
        )

        try:
            # Create terminal checkout
            amount_cents = int(order.total * 100)  # Convert to cents

            # Log detailed payment information
            logger.info("=" * 80)
            logger.info("SQUARE TERMINAL PAYMENT INITIATION")
            logger.info("=" * 80)
            logger.info(f"Order Details:")
            logger.info(f"  Order ID: {order.id}")
            logger.info(f"  Order Number: {order.order_number}")
            logger.info(f"  Service: {order.service_title}")
            logger.info(f"  Groomer: {order.groomer_name}")
            logger.info(f"  Pet: {order.pet_name}")
            logger.info(f"Financial Breakdown:")
            logger.info(f"  Subtotal: ${order.subtotal:.2f}")
            if order.discount_amount and order.discount_amount > 0:
                logger.info(f"  Discount: -${order.discount_amount:.2f} ({order.discount_type}: {order.discount_value})")
                logger.info(f"  After Discount: ${order.subtotal - order.discount_amount:.2f}")
            logger.info(f"  Tax:      ${order.tax:.2f}")
            logger.info(f"  Tip:      ${order.tip:.2f}")
            logger.info(f"  Total:    ${order.total:.2f}")
            logger.info(f"Square Terminal Request:")
            logger.info(f"  Device ID: {device.device_id}")
            logger.info(f"  Device Name: {device.device_name}")
            logger.info(f"  Amount (cents): {amount_cents}")
            logger.info(f"  Amount (dollars): ${amount_cents / 100:.2f}")
            logger.info(f"  Reference: {order.order_number}")
            logger.info("=" * 80)

            checkout_result = provider.create_terminal_checkout(
                device_id=device.device_id,
                amount_cents=amount_cents,
                reference_id=order.order_number,
                note=f"Order {order.order_number} - {order.service_title}"
            )

            # Update payment with Square checkout info
            payment.square_checkout_id = checkout_result["checkout_id"]
            payment.payment_metadata = {
                "square_status": checkout_result["status"],
                "created_at": checkout_result.get("created_at"),
                "device_id": device.device_id
            }

            # Update order payment status
            order.payment_status = "pending"

            db.commit()
            db.refresh(payment)

            logger.info(f"Square Terminal checkout created successfully:")
            logger.info(f"  Checkout ID: {payment.square_checkout_id}")
            logger.info(f"  Status: {checkout_result['status']}")
            logger.info("=" * 80)

            return payment

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to initiate terminal payment: {e}")
            raise

    @staticmethod
    def poll_payment_status(
        db: Session,
        payment_id: int,
        business_id: int
    ) -> dict:
        """
        Poll Square for payment status and update local records.

        Args:
            db: Database session
            payment_id: Payment ID
            business_id: Business ID

        Returns:
            dict: Payment status information
        """
        # Load payment
        payment = db.execute(
            select(Payment).where(
                Payment.id == payment_id,
                Payment.business_id == business_id
            )
        ).scalar_one_or_none()

        if not payment:
            raise ValueError(f"Payment {payment_id} not found")

        if not payment.square_checkout_id:
            raise ValueError(f"Payment {payment_id} has no Square checkout ID")

        # Load payment configuration
        device = db.execute(
            select(PaymentDevice).where(
                PaymentDevice.id == payment.payment_device_id
            )
        ).scalar_one_or_none()

        if not device:
            raise ValueError(f"Payment device not found")

        # Load payment configuration from device relationship
        config = device.configuration

        if not config or not config.is_active:
            raise ValueError(f"Payment device configuration is not active")

        # Decrypt credentials
        credentials = decrypt_data(config.encrypted_credentials)

        # Initialize Square provider
        provider = SquarePaymentProvider(
            credentials=credentials,
            provider_settings=config.settings
        )

        try:
            # Get checkout status from Square
            checkout_status = provider.get_terminal_checkout(payment.square_checkout_id)

            # Update payment metadata
            payment.payment_metadata = {
                **(payment.payment_metadata or {}),
                "square_status": checkout_status["status"],
                "updated_at": checkout_status.get("updated_at"),
                "payment_id": checkout_status.get("payment_id"),
            }

            status = checkout_status["status"]

            # Handle completed payment
            if status == "COMPLETED":
                # If checkout has a payment_id, fetch the actual payment details
                # The payment object may have tip information that's not in the checkout
                payment_details = None
                if checkout_status.get("payment_id"):
                    try:
                        payment_details = provider.get_payment(checkout_status["payment_id"])
                        logger.info(f"Retrieved payment details for payment_id: {checkout_status['payment_id']}")
                    except Exception as e:
                        logger.warning(f"Could not fetch payment details: {e}")

                PaymentProcessingService._complete_payment(
                    db, payment, checkout_status, payment_details
                )

            # Handle failed payment
            elif status in ["CANCELED", "FAILED"]:
                PaymentProcessingService._fail_payment(
                    db, payment, status
                )

            db.commit()
            db.refresh(payment)

            return {
                "payment_id": payment.id,
                "status": payment.status,
                "square_status": status,
                "payment_status": payment.order.payment_status if payment.order else None,
                "tip_money": checkout_status.get("tip_money"),
                "total_money": checkout_status.get("total_money"),
                "receipt_url": checkout_status.get("receipt_url"),
            }

        except Exception as e:
            logger.error(f"Failed to poll payment status: {e}")
            raise

    @staticmethod
    def _complete_payment(
        db: Session,
        payment: Payment,
        checkout_status: dict,
        payment_details: dict | None = None
    ):
        """Complete a payment and update order"""
        payment.status = "completed"
        payment.completed_at = datetime.now(timezone.utc)
        payment.square_payment_id = checkout_status.get("payment_id")
        payment.square_receipt_url = checkout_status.get("receipt_url")

        # Log the full checkout status for debugging
        logger.info("=" * 80)
        logger.info("SQUARE TERMINAL PAYMENT COMPLETION")
        logger.info("=" * 80)
        logger.info(f"Payment ID: {payment.id}")
        logger.info(f"Checkout Status Data:")
        logger.info(f"  amount_money: {checkout_status.get('amount_money')}")
        logger.info(f"  tip_money: {checkout_status.get('tip_money')}")
        logger.info(f"  total_money: {checkout_status.get('total_money')}")

        if payment_details:
            logger.info(f"Payment Details Data:")
            logger.info(f"  amount_money: {payment_details.get('amount_money')}")
            logger.info(f"  tip_money: {payment_details.get('tip_money')}")
            logger.info(f"  total_money: {payment_details.get('total_money')}")

        # Extract tip - try payment_details first, then checkout_status
        tip_money = None
        if payment_details and payment_details.get("tip_money"):
            tip_money = payment_details.get("tip_money")
            logger.info("Using tip from payment_details")
        elif checkout_status.get("tip_money"):
            tip_money = checkout_status.get("tip_money")
            logger.info("Using tip from checkout_status")

        tip_dollars = Decimal("0.00")

        logger.info(f"Tip Money Object: {tip_money}")
        logger.info(f"Tip Money Type: {type(tip_money)}")
        if tip_money:
            logger.info(f"Tip Money hasattr 'amount': {hasattr(tip_money, 'amount')}")
            if hasattr(tip_money, '__dict__'):
                logger.info(f"Tip Money attributes: {tip_money.__dict__}")

        if tip_money and hasattr(tip_money, 'amount'):
            tip_cents = tip_money.amount
            tip_dollars = Decimal(tip_cents) / 100
            logger.info(f"Extracted tip: {tip_cents} cents = ${tip_dollars}")

            # Store tip on payment record only (not on order)
            payment.tip_amount = tip_dollars
        else:
            logger.warning("No tip found in checkout_status or payment_details")

        logger.info(f"Final payment.tip_amount: {payment.tip_amount}")

        # Update order payment status
        if payment.order:
            payment.order.payment_status = "paid"
            OrderService.complete_order(db, payment.order_id)

        logger.info(
            f"Completed payment {payment.id} for order {payment.order.order_number if payment.order else 'N/A'} "
            f"(tip amount: ${tip_dollars:.2f})"
        )
        logger.info("=" * 80)

    @staticmethod
    def _fail_payment(
        db: Session,
        payment: Payment,
        square_status: str
    ):
        """Mark payment as failed"""
        payment.status = "failed" if square_status == "FAILED" else "cancelled"
        payment.failed_at = datetime.now(timezone.utc)
        payment.error_message = f"Square checkout {square_status}"

        # Update order payment status
        if payment.order:
            payment.order.payment_status = "failed"

        logger.warning(
            f"Payment {payment.id} {payment.status} "
            f"(Square status: {square_status})"
        )

    @staticmethod
    def cancel_payment(
        db: Session,
        payment_id: int,
        business_id: int
    ) -> Payment:
        """
        Cancel a pending payment.

        Args:
            db: Database session
            payment_id: Payment ID
            business_id: Business ID

        Returns:
            Payment: Cancelled payment
        """
        # Load payment
        payment = db.execute(
            select(Payment).where(
                Payment.id == payment_id,
                Payment.business_id == business_id
            )
        ).scalar_one_or_none()

        if not payment:
            raise ValueError(f"Payment {payment_id} not found")

        if payment.status != "pending":
            raise ValueError(f"Cannot cancel payment with status {payment.status}")

        if not payment.square_checkout_id:
            raise ValueError(f"Payment has no Square checkout ID")

        # Load payment configuration
        device = db.execute(
            select(PaymentDevice).where(
                PaymentDevice.id == payment.payment_device_id
            )
        ).scalar_one_or_none()

        if not device:
            raise ValueError(f"Payment device not found")

        # Load payment configuration from device relationship
        config = device.configuration

        if not config or not config.is_active:
            raise ValueError(f"Payment device configuration is not active")

        # Decrypt credentials
        credentials = decrypt_data(config.encrypted_credentials)

        # Initialize Square provider
        provider = SquarePaymentProvider(
            credentials=credentials,
            provider_settings=config.settings
        )

        try:
            # Cancel checkout on Square
            provider.cancel_terminal_checkout(payment.square_checkout_id)

            # Update payment status
            payment.status = "cancelled"
            payment.cancelled_at = datetime.now(timezone.utc)

            # Update order payment status
            if payment.order:
                payment.order.payment_status = "unpaid"

            db.commit()
            db.refresh(payment)

            logger.info(f"Cancelled payment {payment.id}")
            return payment

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to cancel payment: {e}")
            raise
