/**
 * Order service
 * Handles order creation and management
 */

import { api } from "./api";
import type {
  Order,
  OrderCreateRequest,
  InitiateTerminalPaymentRequest,
  InitiateTerminalPaymentResponse,
  PaymentStatusResponse,
} from "@/types/order";

export const orderService = {
  /**
   * Create order from appointment
   */
  createFromAppointment: async (
    request: OrderCreateRequest
  ): Promise<Order> => {
    return api.post<Order>("/api/payments/orders", request, {
      requiresAuth: true,
    });
  },

  /**
   * Get order by ID
   */
  getOrder: async (orderId: number): Promise<Order> => {
    return api.get<Order>(`/api/payments/orders/${orderId}`, {
      requiresAuth: true,
    });
  },

  /**
   * Get order for appointment
   */
  getAppointmentOrder: async (
    appointmentId: number
  ): Promise<Order | null> => {
    return api.get<Order | null>(
      `/api/payments/appointments/${appointmentId}/order`,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Update order discount
   */
  updateOrderDiscount: async (
    orderId: number,
    discountType: string | null,
    discountValue: number | null
  ): Promise<Order> => {
    return api.patch<Order>(
      `/api/payments/orders/${orderId}/discount`,
      {
        discount_type: discountType,
        discount_value: discountValue,
      },
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Initiate terminal payment
   */
  createTerminalCheckout: async (
    request: InitiateTerminalPaymentRequest
  ): Promise<InitiateTerminalPaymentResponse> => {
    return api.post<InitiateTerminalPaymentResponse>(
      "/api/payments/terminal/checkout",
      request,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Get payment status
   */
  getPaymentStatus: async (
    paymentId: number
  ): Promise<PaymentStatusResponse> => {
    return api.get<PaymentStatusResponse>(
      `/api/payments/terminal/${paymentId}/status`,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Cancel payment
   */
  cancelPayment: async (
    paymentId: number
  ): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>(
      `/api/payments/terminal/${paymentId}/cancel`,
      {},
      {
        requiresAuth: true,
      }
    );
  },
};
