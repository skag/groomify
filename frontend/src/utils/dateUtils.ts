/**
 * Date utility functions for appointment-related components
 */

import type { ViewMode, CalendarDate } from '@/types/appointments'

/**
 * Format a Date object to ISO string (YYYY-MM-DD)
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateToISO(date1) === formatDateToISO(date2)
}

/**
 * Get the start of the week (Monday) for a given date
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Generate an array of 7 dates starting from the given date
 */
export function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    dates.push(d)
  }
  return dates
}

/**
 * Generate a human-readable date range label
 */
export function formatDateRangeLabel(date: Date, viewMode: ViewMode): string {
  if (viewMode === 'day') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  } else {
    const weekStart = getStartOfWeek(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
}

/**
 * Generate calendar dates based on view mode
 */
export function generateCalendarDates(date: Date, viewMode: ViewMode): CalendarDate[] {
  const today = new Date()

  if (viewMode === 'day') {
    return [{
      date: date,
      dateStr: formatDateToISO(date),
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      isToday: isSameDay(date, today),
    }]
  } else {
    const weekStart = getStartOfWeek(date)
    return getWeekDates(weekStart).map(d => ({
      date: d,
      dateStr: formatDateToISO(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      isToday: isSameDay(d, today),
    }))
  }
}

/**
 * Get dates to fetch based on view mode
 */
export function getDatesToFetch(date: Date, viewMode: ViewMode): Date[] {
  if (viewMode === 'day') {
    return [date]
  }
  return getWeekDates(getStartOfWeek(date))
}
