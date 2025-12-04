/**
 * Customer Management Service
 * Handles all customer-related API calls
 */

import { api } from './api';
import { API_CONFIG } from '@/config/api';

export interface CustomerUser {
  id: number;
  customer_id: number;
  business_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_primary_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pet {
  id: number;
  customer_id: number;
  business_id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  special_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  business_id: number;
  account_name: string;
  status: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  created_at: string;
  updated_at: string;
  customer_users: CustomerUser[];
  pets: Pet[];
}

export interface CustomerUserInput {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface PetInput {
  name: string;
  animal_type_id: number;
  breed_id?: number;
  birth_date?: string;
  weight?: number;
  spayed_neutered: boolean;
}

export interface CreateCustomerRequest {
  customer_user: CustomerUserInput;
  pet: PetInput;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface UpdateCustomerRequest {
  account_name?: string;
  status?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface AddCustomerUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export const customerService = {
  /**
   * Get all customers for the current business
   */
  getAllCustomers: async (): Promise<Customer[]> => {
    return api.get<Customer[]>(API_CONFIG.endpoints.customers.list, {
      requiresAuth: true,
    });
  },

  /**
   * Get a single customer by ID
   */
  getCustomerById: async (id: number): Promise<Customer> => {
    return api.get<Customer>(API_CONFIG.endpoints.customers.get(id), {
      requiresAuth: true,
    });
  },

  /**
   * Create a new customer with customer_user and pet
   */
  createCustomer: async (data: CreateCustomerRequest): Promise<Customer> => {
    return api.post<Customer>(
      API_CONFIG.endpoints.customers.create,
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Update an existing customer
   */
  updateCustomer: async (
    id: number,
    data: UpdateCustomerRequest
  ): Promise<Customer> => {
    return api.put<Customer>(
      API_CONFIG.endpoints.customers.update(id),
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Delete a customer
   */
  deleteCustomer: async (id: number): Promise<Customer> => {
    return api.delete<Customer>(API_CONFIG.endpoints.customers.delete(id), {
      requiresAuth: true,
    });
  },

  /**
   * Add a customer user to an existing customer
   */
  addCustomerUser: async (
    customerId: number,
    data: AddCustomerUserRequest
  ): Promise<CustomerUser> => {
    return api.post<CustomerUser>(
      API_CONFIG.endpoints.customers.addUser(customerId),
      data,
      {
        requiresAuth: true,
      }
    );
  },
};
