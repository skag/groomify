/**
 * Staff Management Service
 * Handles all staff-related API calls
 */

import { api } from './api';
import { API_CONFIG } from '@/config/api';
import type {
  StaffMember,
  CreateStaffRequest,
  UpdateStaffRequest,
  StaffAvailability,
  StaffAvailabilityBulkUpdate,
} from '@/types/staff';

export const staffService = {
  /**
   * Get all staff members for the current business
   */
  getAllStaff: async (): Promise<StaffMember[]> => {
    return api.get<StaffMember[]>(API_CONFIG.endpoints.staff.list, {
      requiresAuth: true,
    });
  },

  /**
   * Get a single staff member by ID
   */
  getStaffById: async (id: number): Promise<StaffMember> => {
    return api.get<StaffMember>(API_CONFIG.endpoints.staff.get(id), {
      requiresAuth: true,
    });
  },

  /**
   * Create a new staff member
   */
  createStaff: async (data: CreateStaffRequest): Promise<StaffMember> => {
    return api.post<StaffMember>(
      API_CONFIG.endpoints.staff.create,
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Update an existing staff member
   */
  updateStaff: async (
    id: number,
    data: UpdateStaffRequest
  ): Promise<StaffMember> => {
    return api.put<StaffMember>(
      API_CONFIG.endpoints.staff.update(id),
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Delete (deactivate) a staff member
   */
  deleteStaff: async (id: number): Promise<StaffMember> => {
    return api.delete<StaffMember>(API_CONFIG.endpoints.staff.delete(id), {
      requiresAuth: true,
    });
  },

  /**
   * Get staff member availability (work hours)
   */
  getAvailability: async (staffId: number): Promise<StaffAvailability[]> => {
    return api.get<StaffAvailability[]>(
      API_CONFIG.endpoints.staff.availability(staffId),
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Update staff member availability (all 7 days)
   */
  updateAvailability: async (
    staffId: number,
    data: StaffAvailabilityBulkUpdate
  ): Promise<StaffAvailability[]> => {
    return api.put<StaffAvailability[]>(
      API_CONFIG.endpoints.staff.availability(staffId),
      data,
      {
        requiresAuth: true,
      }
    );
  },
};
