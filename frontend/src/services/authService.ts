/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import { api } from './api';
import { API_CONFIG } from '@/config/api';
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
} from '@/types/auth';

export const authService = {
  /**
   * Sign up a new user
   */
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    return api.post<SignupResponse>(API_CONFIG.endpoints.auth.signup, data);
  },

  /**
   * Log in an existing user
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>(
      API_CONFIG.endpoints.auth.login,
      data
    );

    // Store token for future authenticated requests
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
    }

    return response;
  },

  /**
   * Log out the current user
   */
  logout: () => {
    localStorage.removeItem('access_token');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  /**
   * Get the current access token
   */
  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  },
};
