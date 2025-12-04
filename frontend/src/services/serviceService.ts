/**
 * Service Service
 * API service for managing services
 */

import { api } from './api'
import { API_CONFIG } from '@/config/api'
import type { Service, CreateServiceRequest, UpdateServiceRequest } from '@/types/service'

export const serviceService = {
  /**
   * Get all services for the current business
   */
  async getServices(): Promise<Service[]> {
    return api.get<Service[]>(
      API_CONFIG.endpoints.services.list,
      { requiresAuth: true }
    )
  },

  /**
   * Get a single service by ID
   */
  async getService(id: number): Promise<Service> {
    return api.get<Service>(
      API_CONFIG.endpoints.services.get(id),
      { requiresAuth: true }
    )
  },

  /**
   * Get services by category
   */
  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return api.get<Service[]>(
      API_CONFIG.endpoints.services.byCategory(categoryId),
      { requiresAuth: true }
    )
  },

  /**
   * Create a new service
   */
  async createService(data: CreateServiceRequest): Promise<Service> {
    return api.post<Service>(
      API_CONFIG.endpoints.services.create,
      data,
      { requiresAuth: true }
    )
  },

  /**
   * Update an existing service
   */
  async updateService(id: number, data: UpdateServiceRequest): Promise<Service> {
    return api.put<Service>(
      API_CONFIG.endpoints.services.update(id),
      data,
      { requiresAuth: true }
    )
  },

  /**
   * Delete a service
   */
  async deleteService(id: number): Promise<Service> {
    return api.delete<Service>(
      API_CONFIG.endpoints.services.delete(id),
      { requiresAuth: true }
    )
  },
}
