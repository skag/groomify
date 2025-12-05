/**
 * Appointment query utility functions
 */

import type { Appointment } from '@/types/appointments'
import { parseTimeToMinutes } from './timeUtils'

/**
 * Get all appointments that start within a specific time slot hour for a groomer and date
 */
export function getAppointmentsAtSlot(
  appointments: Appointment[],
  groomerId: number,
  dateStr: string,
  timeSlot: string
): Appointment[] {
  const slotMinutes = parseTimeToMinutes(timeSlot)
  const nextSlotMinutes = slotMinutes + 60 // Next hour

  return appointments.filter(apt => {
    if (apt.groomerId !== groomerId || apt.date !== dateStr) return false
    const aptStartMinutes = parseTimeToMinutes(apt.time)
    // Check if appointment starts within this hour slot
    return aptStartMinutes >= slotMinutes && aptStartMinutes < nextSlotMinutes
  }).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
}

/**
 * Check if a time slot is occupied by a continuing appointment
 */
export function isSlotOccupied(
  appointments: Appointment[],
  groomerId: number,
  dateStr: string,
  timeSlot: string
): boolean {
  const slotMinutes = parseTimeToMinutes(timeSlot)
  const nextSlotMinutes = slotMinutes + 60

  // Check all appointments for this groomer on this date
  for (const apt of appointments.filter(a => a.groomerId === groomerId && a.date === dateStr)) {
    const aptStartMinutes = parseTimeToMinutes(apt.time)
    const aptEndMinutes = parseTimeToMinutes(apt.endTime)

    // Check if appointment overlaps with this time slot
    if (aptStartMinutes < nextSlotMinutes && aptEndMinutes > slotMinutes) {
      return true
    }
  }
  return false
}

/**
 * Find the next appointment start time after a given time for a groomer on a date
 * Returns the start time in minutes, or null if no appointment after
 */
export function getNextAppointmentStart(
  appointments: Appointment[],
  groomerId: number,
  dateStr: string,
  afterMinutes: number
): number | null {
  const groomerAppointments = appointments
    .filter(a => a.groomerId === groomerId && a.date === dateStr)
    .map(a => parseTimeToMinutes(a.time))
    .filter(startMinutes => startMinutes > afterMinutes)
    .sort((a, b) => a - b)

  return groomerAppointments.length > 0 ? groomerAppointments[0] : null
}

/**
 * Get overlapping appointments for a specific appointment
 */
export function getOverlappingAppointments(
  appointments: Appointment[],
  groomerId: number,
  dateStr: string,
  appointment: Appointment
): Appointment[] {
  const aptStartMinutes = parseTimeToMinutes(appointment.time)
  const aptEndMinutes = parseTimeToMinutes(appointment.endTime)

  return appointments.filter(other => {
    if (other.id === appointment.id || other.groomerId !== groomerId || other.date !== dateStr) return false
    const otherStartMinutes = parseTimeToMinutes(other.time)
    const otherEndMinutes = parseTimeToMinutes(other.endTime)

    // Check if appointments overlap
    return aptStartMinutes < otherEndMinutes && aptEndMinutes > otherStartMinutes
  }).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
}

/**
 * Count appointments for a groomer on a specific date
 */
export function getGroomerAppointmentCount(
  appointments: Appointment[],
  groomerId: number,
  dateStr: string
): number {
  return appointments.filter(apt => apt.groomerId === groomerId && apt.date === dateStr).length
}

/**
 * Check if there's an appointment at a specific minute for a groomer on a date
 */
export function hasAppointmentAtMinute(
  appointments: Appointment[],
  groomerId: number,
  dateStr: string,
  minutes: number
): boolean {
  return appointments.some(apt => {
    if (apt.groomerId !== groomerId || apt.date !== dateStr) return false
    const aptStart = parseTimeToMinutes(apt.time)
    const aptEnd = parseTimeToMinutes(apt.endTime)
    return minutes >= aptStart && minutes < aptEnd
  })
}
