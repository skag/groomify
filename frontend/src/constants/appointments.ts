/**
 * Shared constants for appointment-related components
 */

// Block reasons for time blocking
export const BLOCK_REASONS = [
  { id: 'lunch', label: 'Lunch Break' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'personal', label: 'Personal Time' },
  { id: 'training', label: 'Training' },
  { id: 'cleaning', label: 'Equipment Cleaning' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'vacation', label: 'Vacation' },
  { id: 'sick', label: 'Sick Leave' },
  { id: 'other', label: 'Other' },
] as const

export type BlockReasonId = typeof BLOCK_REASONS[number]['id']

// Calendar layout constants
export const SLOT_HEIGHT_PX = 100 // pixels per hour slot
export const TIME_COLUMN_WIDTH = 56
export const COLUMN_WIDTH = 150
export const MIN_COLUMN_WIDTH = 150
export const MIN_SLOT_MINUTES = 15

// Default calendar hours
export const DEFAULT_START_HOUR = 8 // 8 AM
export const DEFAULT_END_HOUR = 18 // 6 PM

// Search debounce delay
export const SEARCH_DEBOUNCE_MS = 300
