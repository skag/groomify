/**
 * Time Block Service
 * Handles all time block-related API calls
 */

import { api } from './api';
import { API_CONFIG } from '@/config/api';
import type { BlockReasonId } from '@/constants/appointments';

export interface CreateTimeBlockRequest {
  staff_id: number;
  block_datetime: string; // ISO datetime string
  duration_minutes: number;
  reason: BlockReasonId;
  description?: string | null;
}

export interface TimeBlockResponse {
  id: number;
  business_id: number;
  staff_id: number;
  staff_name: string;
  block_datetime: string;
  duration_minutes: number;
  reason: string;
  reason_label: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  has_conflict: boolean;
  conflict_message: string | null;
}

export interface UpdateTimeBlockRequest {
  block_datetime?: string;
  duration_minutes?: number;
  reason?: BlockReasonId;
  description?: string | null;
}

export const timeBlockService = {
  /**
   * Create a new time block
   * @param data - The time block data
   */
  createTimeBlock: async (data: CreateTimeBlockRequest): Promise<TimeBlockResponse> => {
    return api.post<TimeBlockResponse>(
      API_CONFIG.endpoints.timeBlocks.create,
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Get a single time block by ID
   * @param id - The time block ID
   */
  getTimeBlock: async (id: number): Promise<TimeBlockResponse> => {
    return api.get<TimeBlockResponse>(
      API_CONFIG.endpoints.timeBlocks.get(id),
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Update an existing time block
   * @param id - The time block ID
   * @param data - The fields to update
   */
  updateTimeBlock: async (id: number, data: UpdateTimeBlockRequest): Promise<TimeBlockResponse> => {
    return api.patch<TimeBlockResponse>(
      API_CONFIG.endpoints.timeBlocks.update(id),
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Delete a time block
   * @param id - The time block ID
   */
  deleteTimeBlock: async (id: number): Promise<void> => {
    return api.delete<void>(
      API_CONFIG.endpoints.timeBlocks.delete(id),
      {
        requiresAuth: true,
      }
    );
  },
};
