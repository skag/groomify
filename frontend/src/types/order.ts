/**
 * Order type definitions
 */

export interface Order {
  id: number;
  business_id: number;
  customer_id: number | null;
  pet_id: number | null;
  appointment_id: number | null;
  groomer_id: number | null;
  picked_up_by_id: number | null;
  service_id: number | null;
  order_type: string;
  order_number: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number;
  service_title: string;
  groomer_name: string;
  pet_name: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface OrderCreateRequest {
  appointment_id: number;
  tax_rate?: number;
}

export interface Payment {
  id: number;
  business_id: number;
  order_id: number | null;
  payment_device_id: number | null;
  processed_by_id: number | null;
  payment_type: string;
  payment_method: string;
  amount: number;
  status: string;
  square_checkout_id: string | null;
  square_payment_id: string | null;
  square_receipt_url: string | null;
  payment_metadata: Record<string, any> | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
}

export interface InitiateTerminalPaymentRequest {
  order_id: number;
  payment_device_id: number;
}

export interface InitiateTerminalPaymentResponse {
  payment_id: number;
  square_checkout_id: string;
  status: string;
  amount: number;
  order_number: string;
}

export interface PaymentStatusResponse {
  payment_id: number;
  status: string;
  square_status: string | null;
  payment_status: string | null;
  tip_money: any | null;
  total_money: any | null;
  receipt_url: string | null;
}
