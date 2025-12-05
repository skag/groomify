/**
 * Staff/Business User Types
 * Request and response types for staff management endpoints
 */

export type StaffRole = "owner" | "staff" | "groomer";
export type StaffStatus = "active" | "inactive" | "terminated";
export type CompensationType = "salary" | "commission";
export type SalaryPeriod = "hour" | "week" | "month";

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
  // Compensation fields
  compensation_type?: CompensationType;
  salary_rate?: string; // Decimal as string
  salary_period?: SalaryPeriod;
  commission_percent?: string; // Decimal as string
  tip_percent?: string; // Decimal as string
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
  // Compensation fields
  compensation_type?: CompensationType;
  salary_rate?: number;
  salary_period?: SalaryPeriod;
  commission_percent?: number;
  tip_percent?: number;
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
  // Compensation fields
  compensation_type?: CompensationType;
  salary_rate?: number;
  salary_period?: SalaryPeriod;
  commission_percent?: number;
  tip_percent?: number;
}

// Staff Availability Types
export interface StaffAvailability {
  id: number;
  business_user_id: number;
  day_of_week: number; // 0=Monday, 6=Sunday
  is_available: boolean;
  start_time?: string; // HH:MM:SS format
  end_time?: string; // HH:MM:SS format
  created_at: string;
  updated_at: string;
}

export interface StaffAvailabilityDay {
  day_of_week: number;
  is_available: boolean;
  start_time?: string; // HH:MM:SS format
  end_time?: string; // HH:MM:SS format
}

export interface StaffAvailabilityBulkUpdate {
  availability: StaffAvailabilityDay[];
}
