/**
 * Pet Service
 * API service for pet management
 */

import { api } from './api'
import { API_CONFIG } from '@/config/api'
import type { Pet } from '@/types/pet'

export interface AddPetRequest {
  name: string
  animal_type_id: number
  breed_id?: number
  birth_date?: string
  weight?: number
  spayed_neutered: boolean
}

export interface UpdatePetRequest {
  name?: string
  species?: string
  breed?: string
  age?: number
  weight?: number
  special_notes?: string
}

export const petService = {
  /**
   * Get all pets for the business
   */
  async getAllPets(): Promise<Pet[]> {
    return api.get<Pet[]>(
      API_CONFIG.endpoints.pets.list,
      { requiresAuth: true }
    )
  },

  /**
   * Get all pets for a customer
   */
  async getPetsByCustomer(customerId: number): Promise<Pet[]> {
    return api.get<Pet[]>(
      API_CONFIG.endpoints.pets.listByCustomer(customerId),
      { requiresAuth: true }
    )
  },

  /**
   * Get a single pet by ID
   */
  async getPetById(petId: number): Promise<Pet> {
    return api.get<Pet>(
      API_CONFIG.endpoints.pets.get(petId),
      { requiresAuth: true }
    )
  },

  /**
   * Add a new pet to a customer
   */
  async addPet(customerId: number, data: AddPetRequest): Promise<Pet> {
    return api.post<Pet>(
      API_CONFIG.endpoints.pets.create(customerId),
      data,
      { requiresAuth: true }
    )
  },

  /**
   * Update an existing pet
   */
  async updatePet(petId: number, data: UpdatePetRequest): Promise<Pet> {
    return api.put<Pet>(
      API_CONFIG.endpoints.pets.update(petId),
      data,
      { requiresAuth: true }
    )
  },

  /**
   * Delete a pet
   */
  async deletePet(petId: number): Promise<Pet> {
    return api.delete<Pet>(
      API_CONFIG.endpoints.pets.delete(petId),
      { requiresAuth: true }
    )
  },
}
