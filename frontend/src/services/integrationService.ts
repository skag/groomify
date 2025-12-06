/**
 * Payment integration service
 * Handles OAuth flows, payment configuration, and device management
 */

import { api } from "./api";
import { PaymentProvider } from "@/types/integration";
import type {
  PaymentConfiguration,
  PaymentDevice,
  OAuthAuthorizationResponse,
  OAuthCallbackRequest,
  OAuthDisconnectResponse,
  DevicePairingRequest,
  DevicePairingResponse,
  DevicePairingStatusRequest,
  DevicePairingStatusResponse,
  TestDevicePairingRequest,
  TestDevicePairingResponse,
} from "@/types/integration";

export const integrationService = {
  /**
   * Get current payment configuration for the business
   */
  getPaymentConfig: async (): Promise<PaymentConfiguration | null> => {
    return api.get<PaymentConfiguration>("/api/payments/config", {
      requiresAuth: true,
    });
  },

  /**
   * Get OAuth authorization URL for a payment provider
   */
  getOAuthUrl: async (
    provider: PaymentProvider
  ): Promise<OAuthAuthorizationResponse> => {
    console.log('[IntegrationService] Getting OAuth URL for provider:', provider);
    console.log('[IntegrationService] Token in localStorage:', localStorage.getItem('access_token') ? 'EXISTS' : 'MISSING');
    return api.get<OAuthAuthorizationResponse>(
      `/api/payments/oauth/authorize?provider=${provider}`,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  handleOAuthCallback: async (
    code: string,
    state: string,
    provider: PaymentProvider = PaymentProvider.SQUARE
  ): Promise<PaymentConfiguration> => {
    const body: OAuthCallbackRequest = {
      code,
      state,
    };

    return api.post<PaymentConfiguration>(
      `/api/payments/oauth/callback?provider=${provider}`,
      body,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Disconnect payment provider and revoke OAuth access
   */
  disconnectPayment: async (
    provider: PaymentProvider
  ): Promise<OAuthDisconnectResponse> => {
    return api.delete<OAuthDisconnectResponse>(
      `/api/payments/oauth/disconnect?provider=${provider}`,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Get all paired payment devices
   */
  getDevices: async (): Promise<PaymentDevice[]> => {
    return api.get<PaymentDevice[]>("/api/payments/devices", {
      requiresAuth: true,
    });
  },

  /**
   * Initiate device pairing
   */
  pairDevice: async (
    request: DevicePairingRequest
  ): Promise<DevicePairingResponse> => {
    return api.post<DevicePairingResponse>(
      "/api/payments/devices/pair",
      request,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Check device pairing status
   */
  checkPairingStatus: async (
    request: DevicePairingStatusRequest
  ): Promise<DevicePairingStatusResponse> => {
    return api.post<DevicePairingStatusResponse>(
      "/api/payments/devices/pair/status",
      request,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Unpair a device
   */
  unpairDevice: async (deviceId: number): Promise<{ success: boolean; message: string }> => {
    return api.delete<{ success: boolean; message: string }>(
      `/api/payments/devices/${deviceId}`,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Pair a test device (sandbox only)
   */
  pairTestDevice: async (
    request: TestDevicePairingRequest
  ): Promise<TestDevicePairingResponse> => {
    return api.post<TestDevicePairingResponse>(
      "/api/payments/devices/test",
      request,
      {
        requiresAuth: true,
      }
    );
  },
};
