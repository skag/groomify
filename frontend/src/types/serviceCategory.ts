/**
 * Service Category Types
 * Types for service category management
 */

export interface ServiceCategory {
  id: number
  business_id: number
  name: string
  created_at: string
  updated_at: string
}

export interface CreateServiceCategoryRequest {
  name: string
}
