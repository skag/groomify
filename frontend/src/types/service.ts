/**
 * Service Types
 * Types for service management
 */

import type { ServiceCategory } from './serviceCategory'
import type { AnimalType, AnimalBreed } from './animal'

export interface BusinessUserMinimal {
  id: number
  first_name: string
  last_name: string
  email: string
}

export interface Service {
  id: number
  business_id: number
  name: string
  description: string | null
  category_id: number
  category: ServiceCategory
  duration_minutes: number
  price: number
  tax_rate: number | null
  is_active: boolean
  applies_to_all_animal_types: boolean
  applies_to_all_breeds: boolean
  staff_members: BusinessUserMinimal[]
  animal_types: AnimalType[]
  animal_breeds: AnimalBreed[]
  created_at: string
  updated_at: string
}

export interface CreateServiceRequest {
  name: string
  description?: string | null
  category_id: number
  duration_minutes: number
  price: number
  tax_rate?: number | null
  is_active?: boolean
  applies_to_all_animal_types?: boolean
  applies_to_all_breeds?: boolean
  staff_member_ids?: number[]
  animal_type_ids?: number[]
  animal_breed_ids?: number[]
}

export interface UpdateServiceRequest {
  name?: string
  description?: string | null
  category_id?: number
  duration_minutes?: number
  price?: number
  tax_rate?: number | null
  is_active?: boolean
  applies_to_all_animal_types?: boolean
  applies_to_all_breeds?: boolean
  staff_member_ids?: number[]
  animal_type_ids?: number[]
  animal_breed_ids?: number[]
}
