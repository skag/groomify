/**
 * Service Category Service
 * API service for service categories
 */

import { api } from './api'
import { API_CONFIG } from '@/config/api'
import type { ServiceCategory, CreateServiceCategoryRequest } from '@/types/serviceCategory'

export const serviceCategoryService = {
  /**
   * Get all service categories for the current business
   */
  async getServiceCategories(): Promise<ServiceCategory[]> {
    return api.get<ServiceCategory[]>(
      API_CONFIG.endpoints.serviceCategories.list,
      { requiresAuth: true }
    )
  },

  /**
   * Create a new service category
   */
  async createServiceCategory(data: CreateServiceCategoryRequest): Promise<ServiceCategory> {
    return api.post<ServiceCategory>(
      API_CONFIG.endpoints.serviceCategories.create,
      data,
      { requiresAuth: true }
    )
  },
}
