/**
 * Appointment Service
 * Handles all appointment-related API calls
 */

import { api } from './api';
import { API_CONFIG } from '@/config/api';
import type { AppointmentStatus } from '@/components/AppointmentCard';

export interface DailyAppointmentItem {
  id: number;
  time: string;
  end_time: string;
  groomer: string;
  groomer_id: number;
  is_block: boolean;

  // Appointment-specific fields (optional when is_block=true)
  pet_id?: number | null;
  pet_name?: string | null;
  owner?: string | null;
  service_id?: number | null;
  service?: string | null;
  service_price?: number | null;
  tags?: string[];
  status?: AppointmentStatus | null;
  is_confirmed?: boolean | null;
  notes?: string | null;

  // Block-specific fields (optional when is_block=false)
  block_reason?: string | null;
  block_reason_label?: string | null;
  block_description?: string | null;
}

export interface GroomerWithAppointments {
  id: number;
  name: string;
  appointments: DailyAppointmentItem[];
}

export interface DailyAppointmentsResponse {
  date: string;
  total_appointments: number;
  total_blocks: number;
  groomers: GroomerWithAppointments[];
}

export interface CreateAppointmentRequest {
  pet_id: number;
  staff_id: number;
  service_ids: number[];
  appointment_datetime: string; // ISO datetime string
  duration_minutes: number;
  notes?: string | null;
}

export interface AppointmentServiceInfo {
  name: string;
  price: number;
}

export interface CreateAppointmentResponse {
  id: number;
  pet_id: number;
  pet_name: string;
  customer_id: number;
  customer_name: string;
  staff_id: number;
  staff_name: string;
  appointment_datetime: string;
  duration_minutes: number;
  services: AppointmentServiceInfo[];
  status: AppointmentStatus | null;
  is_confirmed: boolean;
  notes: string | null;
}

export interface UpdateAppointmentRequest {
  staff_id?: number;
  service_ids?: number[];
  appointment_datetime?: string; // ISO datetime string
  duration_minutes?: number;
  notes?: string | null;
  status?: AppointmentStatus;
  is_confirmed?: boolean;
}

export interface AppointmentStatusResponse {
  id: number;
  name: string;
  display_text: string;
  order: number;
}

export interface UpdateAppointmentResponse {
  id: number;
  pet_id: number;
  pet_name: string;
  customer_id: number;
  customer_name: string;
  staff_id: number;
  staff_name: string;
  appointment_datetime: string;
  duration_minutes: number;
  services: AppointmentServiceInfo[];
  status: AppointmentStatus | null;
  is_confirmed: boolean;
  notes: string | null;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const appointmentService = {
  /**
   * Get appointment statuses for kanban column configuration
   */
  getStatuses: async (): Promise<AppointmentStatusResponse[]> => {
    return api.get<AppointmentStatusResponse[]>(
      API_CONFIG.endpoints.appointments.statuses,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Get daily appointments grouped by groomer
   * @param date - The date to fetch appointments for
   */
  getDailyAppointments: async (date: Date): Promise<DailyAppointmentsResponse> => {
    const dateStr = formatDateToISO(date);
    return api.get<DailyAppointmentsResponse>(
      API_CONFIG.endpoints.appointments.daily(dateStr),
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Create a new appointment
   * @param data - The appointment data
   */
  createAppointment: async (data: CreateAppointmentRequest): Promise<CreateAppointmentResponse> => {
    return api.post<CreateAppointmentResponse>(
      API_CONFIG.endpoints.appointments.create,
      data,
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Get a single appointment by ID
   * @param id - The appointment ID
   */
  getAppointment: async (id: number): Promise<UpdateAppointmentResponse> => {
    return api.get<UpdateAppointmentResponse>(
      API_CONFIG.endpoints.appointments.get(id),
      {
        requiresAuth: true,
      }
    );
  },

  /**
   * Update an existing appointment
   * @param id - The appointment ID
   * @param data - The fields to update
   */
  updateAppointment: async (id: number, data: UpdateAppointmentRequest): Promise<UpdateAppointmentResponse> => {
    return api.patch<UpdateAppointmentResponse>(
      API_CONFIG.endpoints.appointments.update(id),
      data,
      {
        requiresAuth: true,
      }
    );
  },
};
