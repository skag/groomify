/**
 * Agreement Management Service
 * Handles all agreement-related API calls
 */

import { api } from './api';
import { API_CONFIG } from '@/config/api';
import type {
  Agreement,
  CreateAgreementRequest,
  UpdateAgreementRequest,
} from '@/types/agreement';

export const agreementService = {
  /**
   * Get all agreements for the current business
   */
  getAllAgreements: async (): Promise<Agreement[]> => {
    return api.get<Agreement[]>(API_CONFIG.endpoints.agreements.list, {
      requiresAuth: true,
    });
  },

  /**
   * Get a single agreement by ID
   */
  getAgreementById: async (id: number): Promise<Agreement> => {
    return api.get<Agreement>(API_CONFIG.endpoints.agreements.get(id), {
      requiresAuth: true,
    });
  },

  /**
   * Create a new agreement
   */
  createAgreement: async (data: CreateAgreementRequest): Promise<Agreement> => {
    return api.post<Agreement>(
      API_CONFIG.endpoints.agreements.create,
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Update an existing agreement
   */
  updateAgreement: async (
    id: number,
    data: UpdateAgreementRequest
  ): Promise<Agreement> => {
    return api.put<Agreement>(
      API_CONFIG.endpoints.agreements.update(id),
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Delete an agreement
   */
  deleteAgreement: async (id: number): Promise<Agreement> => {
    return api.delete<Agreement>(API_CONFIG.endpoints.agreements.delete(id), {
      requiresAuth: true,
    });
  },
};
