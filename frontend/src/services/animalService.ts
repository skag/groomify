/**
 * Animal Service
 * API service for animal types and breeds
 */

import { api } from './api'
import { API_CONFIG } from '@/config/api'
import type { AnimalType, AnimalTypeWithBreeds, AnimalBreed } from '@/types/animal'

export const animalService = {
  /**
   * Get all animal types
   */
  async getAnimalTypes(): Promise<AnimalType[]> {
    return api.get<AnimalType[]>(
      API_CONFIG.endpoints.animalTypes.list,
      { requiresAuth: true }
    )
  },

  /**
   * Get animal type by ID with breeds
   */
  async getAnimalTypeWithBreeds(id: number): Promise<AnimalTypeWithBreeds> {
    return api.get<AnimalTypeWithBreeds>(
      API_CONFIG.endpoints.animalTypes.get(id),
      { requiresAuth: true }
    )
  },

  /**
   * Get breeds for an animal type
   */
  async getBreedsByAnimalType(animalTypeId: number): Promise<AnimalBreed[]> {
    return api.get<AnimalBreed[]>(
      API_CONFIG.endpoints.animalTypes.breeds(animalTypeId),
      { requiresAuth: true }
    )
  },
}
