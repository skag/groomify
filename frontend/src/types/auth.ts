/**
 * Auth API Types
 * Request and response types for authentication endpoints
 */

export interface SignupRequest {
  business_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  business_id: number;
  user_id: number;
  business_name: string;
  email: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
  business_id: number;
  role: string;
  first_name: string;
  last_name: string;
}

export interface ApiError {
  detail: string | { msg: string; type: string }[];
}
