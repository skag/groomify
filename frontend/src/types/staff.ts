/**
 * Staff/Business User Types
 * Request and response types for staff management endpoints
 */

export type StaffRole = "owner" | "staff" | "groomer";
export type StaffStatus = "active" | "inactive" | "terminated";

export interface StaffMember {
  id: number;
  business_id: number;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  first_name: string;
  last_name: string;
  phone?: string;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  is_active: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CreateStaffRequest {
  email: string;
  password?: string; // Optional password for login
  pin?: string; // Optional PIN for quick access
  role: StaffRole;
  status?: StaffStatus; // Defaults to "active"
  first_name: string;
  last_name: string;
  phone?: string;
  start_date?: string; // ISO date string
}

export interface UpdateStaffRequest {
  email?: string;
  password?: string;
  pin?: string;
  role?: StaffRole;
  status?: StaffStatus;
  first_name?: string;
  last_name?: string;
  phone?: string;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  is_active?: boolean;
}
