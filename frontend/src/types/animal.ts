/**
 * Animal Types
 * Types for animal types and breeds (global lookup tables)
 */

export interface AnimalType {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface AnimalBreed {
  id: number
  name: string
  animal_type_id: number
  created_at: string
  updated_at: string
}

export interface AnimalTypeWithBreeds extends AnimalType {
  breeds: AnimalBreed[]
}
