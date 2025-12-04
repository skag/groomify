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
  pet_name: string;
  owner: string;
  service: string;
  groomer: string;
  groomer_id: number;
  tags: string[];
  status: AppointmentStatus | null;
}

export interface GroomerWithAppointments {
  id: number;
  name: string;
  appointments: DailyAppointmentItem[];
}

export interface DailyAppointmentsResponse {
  date: string;
  total_appointments: number;
  groomers: GroomerWithAppointments[];
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
};
