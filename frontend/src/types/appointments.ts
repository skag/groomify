/**
 * Shared types for appointment-related components
 */

import type { AppointmentStatus } from '@/components/AppointmentCard'

// View mode for the calendar display
export type ViewMode = 'day' | 'week'

// Appointment data structure used in the calendar (also used for time blocks)
export interface Appointment {
  id: number
  time: string
  endTime: string
  groomer: string
  groomerId: number
  date: string // ISO date string (YYYY-MM-DD)

  // Block indicator
  isBlock?: boolean

  // Appointment-specific fields (optional when isBlock=true)
  petId?: number
  petName?: string
  owner?: string
  serviceId?: number
  service?: string
  tags?: string[]
  status?: AppointmentStatus
  isConfirmed?: boolean

  // Block-specific fields (optional when isBlock=false)
  blockReason?: string
  blockReasonLabel?: string
  blockDescription?: string
}

// Calendar date information
export interface CalendarDate {
  date: Date
  dateStr: string // ISO date string (YYYY-MM-DD)
  label: string // e.g., "Mon 12/4"
  isToday?: boolean
}

// Groomer information for display
export interface CalendarGroomer {
  id: number
  name: string
}

// Pet type for search and booking
export interface CalendarPet {
  id: number
  name: string
  owner: string
  breed: string
}

// Service type for booking
export interface CalendarService {
  id: number
  name: string
  duration_minutes: number
  price: number
}

// Basic groomer info (used in parent components)
export interface GroomerInfo {
  id: number
  name: string
}

// Selected pet with additional info (used in Appointments page)
export interface SelectedPet {
  id: string
  name: string
  owner: string
  breed: string
  phone?: string | null
  primaryContactName?: string | null
  defaultGroomerId?: number | null
}

// Reschedule mode state
export interface RescheduleMode {
  active: boolean
  appointmentId: number | null
  originalAppointment: {
    id: number
    petId: number
    petName: string
    owner: string
    serviceId: number | null
    serviceName: string
    groomerId: number
    groomerName: string
    datetime: string
    durationMinutes: number
  } | null
}

// Reschedule mode info passed to calendar component
export interface RescheduleModeInfo {
  active: boolean
  appointmentId: number | null
  originalServiceName?: string
}

// Slot selection state for booking popover
export interface SlotSelection {
  groomerId: number
  groomerName: string
  date: Date
  dateStr: string
  startMinutes: number
  endMinutes: number
  anchorRect: { top: number; left: number; width: number; height: number }
}

// Booking data for creating/updating appointments
export interface BookingData {
  petId: number
  petName: string
  groomerId: number
  groomerName: string
  serviceId: number
  serviceName: string
  date: Date
  startTime: string
  endTime: string
}
