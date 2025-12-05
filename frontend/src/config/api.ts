/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  endpoints: {
    auth: {
      signup: '/api/auth/register',
      login: '/api/auth/login',
    },
    staff: {
      list: '/api/business-users',
      create: '/api/business-users',
      get: (id: number) => `/api/business-users/${id}`,
      update: (id: number) => `/api/business-users/${id}`,
      delete: (id: number) => `/api/business-users/${id}`,
      availability: (id: number) => `/api/business-users/${id}/availability`,
    },
    agreements: {
      list: '/api/agreements',
      create: '/api/agreements',
      get: (id: number) => `/api/agreements/${id}`,
      update: (id: number) => `/api/agreements/${id}`,
      delete: (id: number) => `/api/agreements/${id}`,
    },
    animalTypes: {
      list: '/api/animal-types',
      get: (id: number) => `/api/animal-types/${id}`,
      breeds: (id: number) => `/api/animal-types/${id}/breeds`,
    },
    serviceCategories: {
      list: '/api/service-categories',
      create: '/api/service-categories',
    },
    services: {
      list: '/api/services',
      create: '/api/services',
      get: (id: number) => `/api/services/${id}`,
      update: (id: number) => `/api/services/${id}`,
      delete: (id: number) => `/api/services/${id}`,
      byCategory: (categoryId: number) => `/api/services/category/${categoryId}`,
    },
    customers: {
      list: '/api/customers',
      create: '/api/customers',
      get: (id: number) => `/api/customers/${id}`,
      update: (id: number) => `/api/customers/${id}`,
      delete: (id: number) => `/api/customers/${id}`,
      addUser: (id: number) => `/api/customers/${id}/users`,
      bookingHistory: (id: number) => `/api/customers/${id}/booking-history`,
    },
    pets: {
      list: '/api/pets',
      search: (query: string) => `/api/pets/search?q=${encodeURIComponent(query)}`,
      listByCustomer: (customerId: number) => `/api/customers/${customerId}/pets`,
      create: (customerId: number) => `/api/customers/${customerId}/pets`,
      get: (id: number) => `/api/pets/${id}`,
      update: (id: number) => `/api/pets/${id}`,
      delete: (id: number) => `/api/pets/${id}`,
    },
    appointments: {
      create: '/api/appointments',
      get: (id: number) => `/api/appointments/${id}`,
      update: (id: number) => `/api/appointments/${id}`,
      daily: (date: string) => `/api/appointments/daily?date=${date}`,
      statuses: '/api/appointments/statuses',
    },
  },
} as const;
