/**
 * Payment integration type definitions
 */

export enum PaymentProvider {
  SQUARE = "square",
  CLOVER = "clover",
}

export interface PaymentConfiguration {
  id: number;
  business_id: number;
  provider: PaymentProvider;
  is_active: boolean;
  has_credentials: boolean;
  location_id: string | null;
  settings: {
    environment?: string;
    merchant_id?: string;
    [key: string]: any;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentDevice {
  id: number;
  business_id: number;
  device_id: string;
  device_name: string;
  location_id: string;
  is_active: boolean;
  paired_at: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  device_metadata: Record<string, any> | null;
  provider: PaymentProvider;
}

export interface OAuthAuthorizationResponse {
  authorization_url: string;
  state: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
}

export interface OAuthDisconnectResponse {
  success: boolean;
  message: string;
}

export interface DevicePairingRequest {
  device_name: string;
  location_id?: string;
}

export interface DevicePairingResponse {
  pairing_code: string;
  device_id: string;
  expires_at: string | null;
  status: string;
}

export interface DevicePairingStatusRequest {
  device_code_id: string;
}

export interface DevicePairingStatusResponse {
  status: string;
  device_id: string | null;
}

export interface TestDevicePairingRequest {
  device_name: string;
  test_device_id?: string;
  location_id?: string;
}

export interface TestDevicePairingResponse {
  success: boolean;
  device: PaymentDevice;
  message: string;
}
