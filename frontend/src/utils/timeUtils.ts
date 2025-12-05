/**
 * Time utility functions for appointment-related components
 */

import type { Appointment } from '@/types/appointments'
import { DEFAULT_START_HOUR, DEFAULT_END_HOUR } from '@/constants/appointments'

/**
 * Parse time string (e.g., "9:00 AM" or "9 AM") to total minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [time, period] = timeStr.split(' ')
  let hours: number
  let minutes: number = 0

  if (time.includes(':')) {
    [hours, minutes] = time.split(':').map(Number)
  } else {
    hours = Number(time)
  }

  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

/**
 * Format minutes from midnight to time string (e.g., "9:00 AM")
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Format hour (in 24h) to time string for display (e.g., "9 AM")
 */
export function formatHourToTimeString(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour} ${period}`
}

/**
 * Convert 12-hour format (e.g., "9:00 AM") to 24-hour format (e.g., "09:00")
 */
export function to24HourFormat(time12h: string): string {
  if (!time12h) return ""
  const minutes = parseTimeToMinutes(time12h)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Convert 24-hour format (e.g., "09:00") to 12-hour format (e.g., "9:00 AM")
 */
export function to12HourFormat(time24h: string): string {
  if (!time24h) return ""
  const [hours, mins] = time24h.split(':').map(Number)
  const totalMinutes = hours * 60 + mins
  return formatMinutesToTime(totalMinutes)
}

/**
 * Parse time string to hours and minutes
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [time, period] = timeStr.split(' ')
  let hours: number
  let minutes: number = 0

  if (time.includes(':')) {
    [hours, minutes] = time.split(':').map(Number)
  } else {
    hours = Number(time)
  }

  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return { hours, minutes }
}

/**
 * Calculate duration in minutes from start and end time strings
 */
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeString(startTime)
  const end = parseTimeString(endTime)
  const startMinutes = start.hours * 60 + start.minutes
  const endMinutes = end.hours * 60 + end.minutes
  return endMinutes - startMinutes
}

/**
 * Generate time slots based on appointments (dynamic range)
 */
export function getTimeSlots(appointments: Appointment[]): string[] {
  // Find the latest appointment end time
  let latestEndMinutes = DEFAULT_END_HOUR * 60
  for (const apt of appointments) {
    const endMinutes = parseTimeToMinutes(apt.endTime)
    if (endMinutes > latestEndMinutes) {
      latestEndMinutes = endMinutes
    }
  }

  // Add one hour buffer after the latest appointment
  const endHour = Math.ceil(latestEndMinutes / 60) + 1

  // Generate time slots from start to end
  const slots: string[] = []
  for (let hour = DEFAULT_START_HOUR; hour <= endHour; hour++) {
    slots.push(formatHourToTimeString(hour))
  }
  return slots
}
