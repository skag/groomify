import React, { useRef, useState, useCallback, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { AppointmentCard, type AppointmentStatus } from "@/components/AppointmentCard"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, X, Search, Dog, Loader2, Scissors, Ban, ChevronDown } from "lucide-react"

export interface Appointment {
  id: number
  time: string
  endTime: string
  petId?: number
  petName: string
  owner: string
  serviceId?: number
  service: string
  groomer: string
  groomerId: number
  date: string // ISO date string (YYYY-MM-DD)
  tags?: string[]
  status?: AppointmentStatus
}

export interface CalendarDate {
  date: Date
  dateStr: string // ISO date string (YYYY-MM-DD)
  label: string // e.g., "Mon 12/4"
  isToday?: boolean
}

export interface CalendarGroomer {
  id: number
  name: string
}

// Pet type for the booking popover
export interface CalendarPet {
  id: number
  name: string
  owner: string
  breed: string
}

// Service type for the booking popover
export interface CalendarService {
  id: number
  name: string
  duration_minutes: number
  price: number
}

// Block reasons for time blocking
const BLOCK_REASONS = [
  { id: 'lunch', label: 'Lunch Break' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'personal', label: 'Personal Time' },
  { id: 'training', label: 'Training' },
  { id: 'cleaning', label: 'Equipment Cleaning' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'vacation', label: 'Vacation' },
  { id: 'sick', label: 'Sick Leave' },
  { id: 'other', label: 'Other' },
]

// Selection state for the slot being created
interface SlotSelection {
  groomerId: number
  groomerName: string
  date: Date
  dateStr: string
  startMinutes: number
  endMinutes: number
  // Position for the popover anchor
  anchorRect: { top: number; left: number; width: number; height: number }
}

interface AppointmentsCalendarProps {
  appointments: Appointment[]
  groomers: CalendarGroomer[]
  dates: CalendarDate[]
  viewMode?: 'day' | 'week'
  onAppointmentClick?: (appointment: Appointment) => void
  // Pre-selected pet (from parent page)
  preSelectedPet?: CalendarPet | null
  // Pet search functionality
  onPetSearch?: (query: string) => Promise<CalendarPet[]>
  // Services list for selection
  services?: CalendarService[]
  // Callback when booking is confirmed
  onBookingConfirm?: (booking: {
    petId: number
    petName: string
    groomerId: number
    groomerName: string
    serviceId: number
    serviceName: string
    date: Date
    startTime: string
    endTime: string
  }) => void
  // Callback when appointment is updated
  onAppointmentUpdate?: (appointmentId: number, update: {
    petId: number
    petName: string
    groomerId: number
    groomerName: string
    serviceId: number
    serviceName: string
    date: Date
    startTime: string
    endTime: string
  }) => void
}

export function AppointmentsCalendar({
  appointments,
  groomers,
  dates,
  viewMode = 'day',
  onAppointmentClick,
  preSelectedPet,
  onPetSearch,
  services = [],
  onBookingConfirm,
  onAppointmentUpdate
}: AppointmentsCalendarProps) {
  const [activeAppointmentId, setActiveAppointmentId] = useState<number | null>(null)
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ groomerId: number; groomerName: string; date: Date; dateStr: string; minutes: number; y: number } | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  // Popover form state
  const [selectedPet, setSelectedPet] = useState<CalendarPet | null>(null)
  const [petSearchQuery, setPetSearchQuery] = useState("")
  const [petSearchResults, setPetSearchResults] = useState<CalendarPet[]>([])
  const [isPetSearching, setIsPetSearching] = useState(false)
  const [showPetDropdown, setShowPetDropdown] = useState(false)
  const [selectedService, setSelectedService] = useState<CalendarService | null>(null)
  const [serviceSearchQuery, setServiceSearchQuery] = useState("")
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [serviceDropdownDirection, setServiceDropdownDirection] = useState<'up' | 'down'>('down')
  const [startTimeInput, setStartTimeInput] = useState("")
  const [endTimeInput, setEndTimeInput] = useState("")
  const [bookingMode, setBookingMode] = useState<'appointment' | 'block'>('appointment')
  const [blockReason, setBlockReason] = useState<string>('')
  const [blockDescription, setBlockDescription] = useState<string>('')
  const [showBlockReasonDropdown, setShowBlockReasonDropdown] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const timeColumnRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const calendarBodyRef = useRef<HTMLDivElement>(null)
  const serviceInputContainerRef = useRef<HTMLDivElement>(null)

  // Sync scroll between time column (vertical) and header (horizontal)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timeColumnRef.current) {
      timeColumnRef.current.scrollTop = e.currentTarget.scrollTop
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Helper to parse time strings to minutes
  // Handles both "9:00 AM" and "9 AM" formats
  const parseTimeToMinutes = (timeStr: string) => {
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

  // Helper to format minutes to time string (e.g., "9:00 AM")
  const formatMinutesToTimeString = (totalMinutes: number): string => {
    const hours24 = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const period = hours24 >= 12 ? 'PM' : 'AM'
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Convert 12-hour format (e.g., "9:00 AM") to 24-hour format (e.g., "09:00")
  const to24HourFormat = (time12h: string): string => {
    if (!time12h) return ""
    const minutes = parseTimeToMinutes(time12h)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Convert 24-hour format (e.g., "09:00") to 12-hour format (e.g., "9:00 AM")
  const to12HourFormat = (time24h: string): string => {
    if (!time24h) return ""
    const [hours, mins] = time24h.split(':').map(Number)
    const totalMinutes = hours * 60 + mins
    return formatMinutesToTimeString(totalMinutes)
  }

  // Helper to format hour (in 24h) to time string for display
  const formatHourToTimeString = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour} ${period}`
  }

  // Calculate dynamic time slots based on appointments
  const getTimeSlots = (): string[] => {
    const defaultStartHour = 8 // 8 AM
    const defaultEndHour = 18 // 6 PM

    // Find the latest appointment end time
    let latestEndMinutes = defaultEndHour * 60
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
    for (let hour = defaultStartHour; hour <= endHour; hour++) {
      slots.push(formatHourToTimeString(hour))
    }
    return slots
  }

  const timeSlots = getTimeSlots()
  const startHour = 8 // First hour shown in calendar

  // Helper to get all appointments that start within this time slot hour for a specific groomer and date
  const getAppointmentsAtSlot = (groomerId: number, dateStr: string, timeSlot: string) => {
    const slotMinutes = parseTimeToMinutes(timeSlot)
    const nextSlotMinutes = slotMinutes + 60 // Next hour

    return appointments.filter(apt => {
      if (apt.groomerId !== groomerId || apt.date !== dateStr) return false
      const aptStartMinutes = parseTimeToMinutes(apt.time)
      // Check if appointment starts within this hour slot
      return aptStartMinutes >= slotMinutes && aptStartMinutes < nextSlotMinutes
    }).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
  }

  // Helper to check if an appointment overlaps with any other appointments for the same groomer on the same date
  const getOverlappingAppointments = (groomerId: number, dateStr: string, appointment: Appointment) => {
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

  // Helper to check if this slot is occupied by a continuing appointment
  const isSlotOccupied = (groomerId: number, dateStr: string, timeSlot: string) => {
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

  // Find the next appointment start time after a given time for a groomer on a date
  // Returns the start time in minutes, or null if no appointment after
  const getNextAppointmentStart = (groomerId: number, dateStr: string, afterMinutes: number): number | null => {
    const groomerAppointments = appointments
      .filter(a => a.groomerId === groomerId && a.date === dateStr)
      .map(a => parseTimeToMinutes(a.time))
      .filter(startMinutes => startMinutes > afterMinutes)
      .sort((a, b) => a - b)

    return groomerAppointments.length > 0 ? groomerAppointments[0] : null
  }

  const handleAppointmentClick = (appointment: Appointment, overlappingAppts: Appointment[], anchorRect: DOMRect) => {
    // If there are overlapping appointments
    if (overlappingAppts.length > 0) {
      // Check if this appointment is already active (in front)
      if (activeAppointmentId === appointment.id) {
        // Already active, open edit popover
        openEditPopover(appointment, anchorRect)
      } else {
        // Not active, bring to front without opening popover
        setActiveAppointmentId(appointment.id)
      }
    } else {
      // No overlaps, open edit popover directly
      openEditPopover(appointment, anchorRect)
    }
  }

  // Open popover in edit mode for an existing appointment
  const openEditPopover = (appointment: Appointment, anchorRect: DOMRect) => {
    // Find the date object for this appointment
    const dateObj = dates.find(d => d.dateStr === appointment.date)?.date || new Date(appointment.date)
    const groomer = groomers.find(g => g.id === appointment.groomerId)

    // Set up selection for popover positioning
    setSelection({
      groomerId: appointment.groomerId,
      groomerName: groomer?.name || appointment.groomer,
      date: dateObj,
      dateStr: appointment.date,
      startMinutes: parseTimeToMinutes(appointment.time),
      endMinutes: parseTimeToMinutes(appointment.endTime),
      anchorRect: {
        top: anchorRect.top,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height
      }
    })

    // Set editing appointment
    setEditingAppointment(appointment)
    setBookingMode('appointment')
    setPopoverOpen(true)
  }

  // Count appointments per groomer per date
  const getGroomerDateAppointmentCount = (groomerId: number, dateStr: string) => {
    return appointments.filter(apt => apt.groomerId === groomerId && apt.date === dateStr).length
  }

  // Handle mouse down on a slot cell
  const handleSlotMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    groomerId: number,
    groomerName: string,
    calDate: CalendarDate,
    timeSlot: string,
    occupied: boolean
  ) => {
    if (occupied) return

    // Close any existing popover
    setPopoverOpen(false)
    setSelection(null)

    const slotMinutes = parseTimeToMinutes(timeSlot)
    const rect = e.currentTarget.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    // Snap to 15-minute intervals within the slot
    const minutesIntoSlot = Math.round((relativeY / 100) * 60 / 15) * 15
    const clickedMinutes = slotMinutes + minutesIntoSlot

    setDragStart({
      groomerId,
      groomerName,
      date: calDate.date,
      dateStr: calDate.dateStr,
      minutes: clickedMinutes,
      y: e.clientY
    })
    setIsDragging(false)
  }

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStart) return

    // Determine if we're actually dragging (moved more than 5px)
    if (Math.abs(e.clientY - dragStart.y) > 5) {
      setIsDragging(true)
    }

    if (!isDragging && Math.abs(e.clientY - dragStart.y) <= 5) return

    // Find the slot element under the mouse
    const elements = document.elementsFromPoint(e.clientX, e.clientY)
    const slotElement = elements.find(el => el.getAttribute('data-slot-key'))

    if (slotElement) {
      const slotKey = slotElement.getAttribute('data-slot-key')
      if (slotKey) {
        const [dateStr, gId] = slotKey.split('-groomer-')
        if (dateStr === dragStart.dateStr && parseInt(gId) === dragStart.groomerId) {
          const rect = slotElement.getBoundingClientRect()
          const relativeY = e.clientY - rect.top
          const slotTimeStr = slotElement.getAttribute('data-time-slot') || ''
          const slotMinutes = parseTimeToMinutes(slotTimeStr)
          const minutesIntoSlot = Math.round((relativeY / 100) * 60 / 15) * 15
          const currentMinutes = slotMinutes + Math.min(minutesIntoSlot, 60)

          const startMinutes = Math.min(dragStart.minutes, currentMinutes)
          const endMinutes = Math.max(dragStart.minutes, currentMinutes)

          // Create temporary selection for visual feedback
          setSelection({
            groomerId: dragStart.groomerId,
            groomerName: dragStart.groomerName,
            date: dragStart.date,
            dateStr: dragStart.dateStr,
            startMinutes,
            endMinutes: Math.max(endMinutes, startMinutes + 15), // Minimum 15 minutes
            anchorRect: { top: 0, left: 0, width: 0, height: 0 }
          })
        }
      }
    }
  }, [dragStart, isDragging])

  // Handle mouse up - finalize selection
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragStart) return

    let finalStartMinutes: number
    let finalEndMinutes: number

    if (!isDragging) {
      // Simple click - create slot up to 1 hour, but limited by next appointment
      finalStartMinutes = dragStart.minutes
      const nextAptStart = getNextAppointmentStart(dragStart.groomerId, dragStart.dateStr, dragStart.minutes)

      if (nextAptStart !== null && nextAptStart < dragStart.minutes + 60) {
        // Next appointment starts before 1 hour, so end at next appointment
        finalEndMinutes = nextAptStart
      } else {
        // No appointment within the hour, create full 1 hour slot
        finalEndMinutes = dragStart.minutes + 60
      }

      // Ensure minimum 15 minutes
      if (finalEndMinutes - finalStartMinutes < 15) {
        setDragStart(null)
        setIsDragging(false)
        return
      }
    } else if (selection) {
      // Drag complete - use selection
      finalStartMinutes = selection.startMinutes
      finalEndMinutes = selection.endMinutes
    } else {
      setDragStart(null)
      setIsDragging(false)
      return
    }

    // Find the element to anchor the popover
    const elements = document.elementsFromPoint(e.clientX, e.clientY)
    const slotElement = elements.find(el => el.getAttribute('data-slot-key'))

    if (slotElement) {
      const rect = slotElement.getBoundingClientRect()

      setSelection({
        groomerId: dragStart.groomerId,
        groomerName: dragStart.groomerName,
        date: dragStart.date,
        dateStr: dragStart.dateStr,
        startMinutes: finalStartMinutes,
        endMinutes: finalEndMinutes,
        anchorRect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }
      })
      setPopoverOpen(true)
    }

    setDragStart(null)
    setIsDragging(false)
  }, [dragStart, isDragging, selection, appointments])

  // Add/remove global mouse event listeners
  React.useEffect(() => {
    if (dragStart) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragStart, handleMouseMove, handleMouseUp])

  // Set pre-selected pet when popover opens (for new appointments)
  useEffect(() => {
    if (popoverOpen && preSelectedPet && !selectedPet && !editingAppointment) {
      setSelectedPet(preSelectedPet)
    }
  }, [popoverOpen, preSelectedPet])

  // Pre-populate fields when editing an appointment
  useEffect(() => {
    if (popoverOpen && editingAppointment) {
      // Set time inputs
      setStartTimeInput(editingAppointment.time)
      setEndTimeInput(editingAppointment.endTime)

      // Create a CalendarPet from the appointment data
      setSelectedPet({
        id: editingAppointment.petId || 0,
        name: editingAppointment.petName,
        owner: editingAppointment.owner,
        breed: '' // Not available from appointment
      })

      // Find and set the service - prefer serviceId if available, fallback to name matching
      const matchingService = editingAppointment.serviceId
        ? services.find(s => s.id === editingAppointment.serviceId)
        : services.find(s => s.name === editingAppointment.service)
      if (matchingService) {
        setSelectedService(matchingService)
      }
    }
  }, [popoverOpen, editingAppointment, services])

  // Debounced pet search
  useEffect(() => {
    if (!petSearchQuery.trim() || !onPetSearch) {
      setPetSearchResults([])
      setIsPetSearching(false)
      return
    }

    setIsPetSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const results = await onPetSearch(petSearchQuery)
        setPetSearchResults(results)
      } catch (error) {
        console.error("Error searching pets:", error)
        setPetSearchResults([])
      } finally {
        setIsPetSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [petSearchQuery, onPetSearch])

  // Sync time inputs when selection changes
  useEffect(() => {
    if (selection) {
      setStartTimeInput(formatMinutesToTimeString(selection.startMinutes))
      setEndTimeInput(formatMinutesToTimeString(selection.endMinutes))
    }
  }, [selection?.startMinutes, selection?.endMinutes])

  // Close popover and clear selection
  const handleClosePopover = () => {
    setPopoverOpen(false)
    setSelection(null)
    setEditingAppointment(null)
    // Reset form state
    setSelectedPet(null)
    setPetSearchQuery("")
    setPetSearchResults([])
    setSelectedService(null)
    setServiceSearchQuery("")
    setStartTimeInput("")
    setEndTimeInput("")
    setBookingMode('appointment')
    setBlockReason('')
    setBlockDescription('')
  }

  // Handle pet selection
  const handleSelectPet = (pet: CalendarPet) => {
    setSelectedPet(pet)
    setPetSearchQuery("")
    setShowPetDropdown(false)
  }

  // Handle service selection - also adjusts end time based on service duration
  const handleSelectService = (service: CalendarService) => {
    setSelectedService(service)
    setServiceSearchQuery("")
    setShowServiceDropdown(false)

    // Adjust end time based on service duration
    if (startTimeInput) {
      const startMinutes = parseTimeToMinutes(startTimeInput)
      const newEndMinutes = startMinutes + service.duration_minutes
      setEndTimeInput(formatMinutesToTimeString(newEndMinutes))
    }
  }

  // Handle service input focus - determine dropdown direction based on available space
  const handleServiceInputFocus = () => {
    setShowServiceDropdown(true)

    if (serviceInputContainerRef.current) {
      const rect = serviceInputContainerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const dropdownHeight = 160 // max-h-40 = 10rem = 160px

      // Open downward by default, only open upward if not enough space below
      if (spaceBelow < dropdownHeight + 10) {
        setServiceDropdownDirection('up')
      } else {
        setServiceDropdownDirection('down')
      }
    }
  }

  // Filter services based on search query
  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  )

  // Handle booking confirmation (create or update)
  const handleConfirmBooking = () => {
    if (!selection || !selectedPet || !selectedService) return

    const bookingData = {
      petId: selectedPet.id,
      petName: selectedPet.name,
      groomerId: selection.groomerId,
      groomerName: selection.groomerName,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: selection.date,
      startTime: startTimeInput,
      endTime: endTimeInput
    }

    if (editingAppointment && onAppointmentUpdate) {
      // Update existing appointment
      onAppointmentUpdate(editingAppointment.id, bookingData)
    } else if (onBookingConfirm) {
      // Create new appointment
      onBookingConfirm(bookingData)
    }

    handleClosePopover()
  }

  // Check if booking can be confirmed
  const canConfirmBooking = selectedPet && selectedService && startTimeInput && endTimeInput

  // Determine if we're in edit mode
  const isEditMode = !!editingAppointment

  const totalColumns = dates.length * groomers.length
  const columnWidth = 150
  const minColumnWidth = 150
  const timeColumnWidth = 56

  // In day view, columns should flex to fill available space
  // In week view, columns have fixed width for horizontal scrolling
  const isDayView = viewMode === 'day'

  // Calculate selection overlay position for a groomer column
  // Returns position relative to the first slot (8 AM = startHour)
  const getSelectionOverlayForColumn = (groomerId: number, dateStr: string) => {
    if (!selection || selection.groomerId !== groomerId || selection.dateStr !== dateStr) return null

    // Calculate top position: pixels from start of calendar body
    // Each hour slot is 100px, starting from startHour (8 AM = 480 minutes)
    const startHourMinutes = startHour * 60
    const topOffset = ((selection.startMinutes - startHourMinutes) / 60) * 100
    const height = ((selection.endMinutes - selection.startMinutes) / 60) * 100

    return { topOffset, height }
  }

  return (
    <div className="border rounded-lg h-full flex flex-col overflow-hidden relative">
      {/* Popover for slot selection */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverAnchor
          style={{
            position: 'fixed',
            top: '50%',
            left: selection?.anchorRect.left ?? 0,
            width: selection?.anchorRect.width ?? 0,
            height: 0,
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
        />
        <PopoverContent
          side="right"
          align="center"
          className="w-[640px] p-0"
          onInteractOutside={handleClosePopover}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              {isEditMode ? (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Edit Appointment
                </div>
              ) : (
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={bookingMode === 'appointment' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setBookingMode('appointment')}
                  >
                    <Calendar className="h-4 w-4" />
                    Appointment
                  </Button>
                  <Button
                    variant={bookingMode === 'block' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setBookingMode('block')}
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClosePopover}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selection && (
              <div className="space-y-4">
                {/* Date & Groomer Info - Shared between modes */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {selection.date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    with <span className="font-medium text-foreground">{selection.groomerName}</span>
                  </div>
                </div>

                {/* Time Pickers - Shared between modes */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Start</label>
                    <Input
                      type="time"
                      value={to24HourFormat(startTimeInput)}
                      onChange={(e) => {
                        const time12h = to12HourFormat(e.target.value)
                        setStartTimeInput(time12h)
                        // Update end time if service is selected
                        if (selectedService && e.target.value) {
                          const startMinutes = parseTimeToMinutes(time12h)
                          const newEndMinutes = startMinutes + selectedService.duration_minutes
                          setEndTimeInput(formatMinutesToTimeString(newEndMinutes))
                        }
                      }}
                      className="bg-background h-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">-</span>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">End</label>
                    <Input
                      type="time"
                      value={to24HourFormat(endTimeInput)}
                      onChange={(e) => setEndTimeInput(to12HourFormat(e.target.value))}
                      className="bg-background h-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                </div>

                {/* Appointment Mode Content */}
                {bookingMode === 'appointment' && (
                  <>
                    {/* Pet Search */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Pet</label>
                      {selectedPet ? (
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <Dog className="h-4 w-4 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedPet.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{selectedPet.owner} • {selectedPet.breed}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => setSelectedPet(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="relative">
                            {isPetSearching ? (
                              <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                            ) : (
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            )}
                            <Input
                              placeholder="Search for a pet..."
                              value={petSearchQuery}
                              onChange={(e) => {
                                setPetSearchQuery(e.target.value)
                                setShowPetDropdown(true)
                              }}
                              onFocus={() => setShowPetDropdown(true)}
                              onBlur={() => setTimeout(() => setShowPetDropdown(false), 200)}
                              className="pl-9 h-9"
                            />
                          </div>
                          {showPetDropdown && petSearchQuery.trim() && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-40 overflow-auto">
                              {petSearchResults.length > 0 ? (
                                petSearchResults.map((pet) => (
                                  <div
                                    key={pet.id}
                                    className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                                    onMouseDown={() => handleSelectPet(pet)}
                                  >
                                    <Dog className="h-4 w-4 text-primary shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{pet.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{pet.owner} • {pet.breed}</p>
                                    </div>
                                  </div>
                                ))
                              ) : !isPetSearching ? (
                                <div className="p-2 text-xs text-muted-foreground text-center">
                                  No pets found
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Service Search */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Service</label>
                      {selectedService ? (
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <Scissors className="h-4 w-4 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedService.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedService.duration_minutes} min • ${selectedService.price}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => setSelectedService(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative" ref={serviceInputContainerRef}>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search for a service..."
                              value={serviceSearchQuery}
                              onChange={(e) => {
                                setServiceSearchQuery(e.target.value)
                                setShowServiceDropdown(true)
                              }}
                              onFocus={handleServiceInputFocus}
                              onBlur={() => setTimeout(() => setShowServiceDropdown(false), 200)}
                              className="pl-9 h-9"
                            />
                          </div>
                          {showServiceDropdown && (
                            <div className={cn(
                              "absolute left-0 right-0 bg-white border rounded-md shadow-lg z-50 max-h-40 overflow-auto",
                              serviceDropdownDirection === 'up' ? "bottom-full mb-1" : "top-full mt-1"
                            )}>
                              {filteredServices.length > 0 ? (
                                filteredServices.map((service) => (
                                  <div
                                    key={service.id}
                                    className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                                    onMouseDown={() => handleSelectService(service)}
                                  >
                                    <Scissors className="h-4 w-4 text-primary shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{service.name}</p>
                                      <p className="text-xs text-muted-foreground">{service.duration_minutes} min • ${service.price}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-2 text-xs text-muted-foreground text-center">
                                  No services found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Block Mode Content */}
                {bookingMode === 'block' && (
                  <>
                    {/* Block Reason Dropdown */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Reason</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowBlockReasonDropdown(!showBlockReasonDropdown)}
                          className="flex items-center justify-between w-full h-9 px-3 py-2 text-sm bg-white border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <span className={blockReason ? 'text-foreground' : 'text-muted-foreground'}>
                            {blockReason ? BLOCK_REASONS.find(r => r.id === blockReason)?.label : 'Select a reason...'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {showBlockReasonDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
                            {BLOCK_REASONS.map((reason) => (
                              <div
                                key={reason.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 hover:bg-accent cursor-pointer",
                                  blockReason === reason.id && "bg-accent"
                                )}
                                onMouseDown={() => {
                                  setBlockReason(reason.id)
                                  setShowBlockReasonDropdown(false)
                                }}
                              >
                                <Ban className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm">{reason.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Block Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                      <Textarea
                        placeholder="Add any additional notes..."
                        value={blockDescription}
                        onChange={(e) => setBlockDescription(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleClosePopover}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleConfirmBooking}
                    disabled={bookingMode === 'appointment' ? !canConfirmBooking : !blockReason}
                  >
                    {bookingMode === 'appointment'
                      ? (isEditMode ? 'Update' : 'Confirm')
                      : 'Block Time'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Header area with fixed time column */}
      <div className="flex shrink-0">
        {/* Fixed time column header */}
        <div className="shrink-0 bg-muted/30 border-r" style={{ width: timeColumnWidth }}>
          {/* Date header placeholder */}
          <div className="h-[41px] border-b"></div>
          {/* Groomer header with "Time" label */}
          <div className="h-[41px] border-b p-2 bg-muted/50">
            <span className="text-xs font-semibold text-muted-foreground">Time</span>
          </div>
        </div>

        {/* Scrollable header content - synced with body horizontal scroll */}
        <div ref={headerScrollRef} className={cn("flex-1", isDayView ? "overflow-hidden" : "overflow-hidden")}>
          <div style={isDayView ? undefined : { width: totalColumns * columnWidth }}>
            {/* Date Header Row */}
            <div className="flex border-b bg-muted/30 h-[41px]">
              {dates.map((calDate) => (
                <div
                  key={calDate.dateStr}
                  className={cn(
                    "text-center py-2 px-1 border-r last:border-r-0 font-semibold flex items-center justify-center",
                    calDate.isToday && "bg-primary/10",
                    isDayView && "flex-1"
                  )}
                  style={isDayView ? { minWidth: groomers.length * minColumnWidth } : { width: groomers.length * columnWidth }}
                >
                  <span className={cn(
                    "text-sm",
                    calDate.isToday && "text-primary"
                  )}>
                    {calDate.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Groomer Header Row */}
            <div className="flex border-b bg-muted/50 h-[41px]">
              {dates.map((calDate) =>
                groomers.map((groomer) => {
                  const appointmentCount = getGroomerDateAppointmentCount(groomer.id, calDate.dateStr)
                  return (
                    <div
                      key={`${calDate.dateStr}-${groomer.id}`}
                      className={cn(
                        "text-center p-2 border-r last:border-r-0 flex items-center justify-center",
                        calDate.isToday && "bg-primary/5",
                        isDayView && "flex-1"
                      )}
                      style={isDayView ? { minWidth: minColumnWidth } : { width: columnWidth }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-xs font-medium truncate">{groomer.name}</p>
                        <Badge variant="secondary" className="rounded-full text-[10px] px-1.5 py-0">
                          {appointmentCount}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body area with synced scrolling */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Fixed time column - scrolls vertically only */}
        <div
          ref={timeColumnRef}
          className="shrink-0 overflow-hidden border-r bg-white"
          style={{ width: timeColumnWidth }}
        >
          {timeSlots.map((timeSlot, timeIndex) => (
            <div
              key={timeIndex}
              className="border-b last:border-b-0 h-[100px] py-2 px-2 text-xs text-muted-foreground font-medium flex items-start justify-end"
            >
              {timeSlot}
            </div>
          ))}
        </div>

        {/* Scrollable content area - scrolls both horizontally and vertically */}
        <div
          ref={scrollContainerRef}
          className={cn("flex-1", isDayView ? "overflow-y-auto overflow-x-hidden" : "overflow-auto")}
          onScroll={handleScroll}
        >
          {/* Column-based layout: render each groomer column with all time slots */}
          <div ref={calendarBodyRef} className="flex" style={isDayView ? undefined : { width: totalColumns * columnWidth }}>
            {dates.map((calDate) =>
              groomers.map((groomer) => {
                const selectionOverlay = getSelectionOverlayForColumn(groomer.id, calDate.dateStr)

                return (
                  <div
                    key={`${calDate.dateStr}-${groomer.id}`}
                    className={cn(
                      "relative border-r last:border-r-0",
                      isDayView && "flex-1"
                    )}
                    style={isDayView ? { minWidth: minColumnWidth } : { width: columnWidth }}
                  >
                    {/* Single selection overlay for the entire column */}
                    {selectionOverlay && (
                      <div
                        className="absolute left-1 right-1 bg-primary/20 border-2 border-primary border-dashed rounded-md z-10 pointer-events-none"
                        style={{
                          top: `${selectionOverlay.topOffset}px`,
                          height: `${selectionOverlay.height}px`
                        }}
                      />
                    )}

                    {/* Render time slots within this column */}
                    {timeSlots.map((timeSlot) => {
                      const appointmentsInSlot = getAppointmentsAtSlot(groomer.id, calDate.dateStr, timeSlot)
                      const occupied = appointmentsInSlot.length === 0 && isSlotOccupied(groomer.id, calDate.dateStr, timeSlot)

                      return (
                        <div
                          key={`${calDate.dateStr}-${groomer.id}-${timeSlot}`}
                          data-slot-key={`${calDate.dateStr}-groomer-${groomer.id}`}
                          data-time-slot={timeSlot}
                          className={cn(
                            "border-b last:border-b-0 h-[100px] relative cursor-pointer hover:bg-gray-100 transition-colors select-none",
                            calDate.isToday ? "bg-primary/5" : "bg-gray-50"
                          )}
                          onMouseDown={(e) => {
                            // Allow clicking if the specific clicked position doesn't have an appointment
                            const slotMinutes = parseTimeToMinutes(timeSlot)
                            const rect = e.currentTarget.getBoundingClientRect()
                            const relativeY = e.clientY - rect.top
                            const minutesIntoSlot = Math.round((relativeY / 100) * 60 / 15) * 15
                            const clickedMinutes = slotMinutes + minutesIntoSlot

                            // Check if there's an appointment at the clicked position
                            const hasAppointmentAtClick = appointments.some(apt => {
                              if (apt.groomerId !== groomer.id || apt.date !== calDate.dateStr) return false
                              const aptStart = parseTimeToMinutes(apt.time)
                              const aptEnd = parseTimeToMinutes(apt.endTime)
                              return clickedMinutes >= aptStart && clickedMinutes < aptEnd
                            })

                            if (!hasAppointmentAtClick) {
                              handleSlotMouseDown(e, groomer.id, groomer.name, calDate, timeSlot, false)
                            }
                          }}
                        >
                          {appointmentsInSlot.length > 0 ? (
                            appointmentsInSlot.map((appointment) => {
                              const slotMinutes = parseTimeToMinutes(timeSlot)
                              const aptStartMinutes = parseTimeToMinutes(appointment.time)
                              const aptEndMinutes = parseTimeToMinutes(appointment.endTime)

                              // Calculate offset from top of slot (in pixels)
                              const minutesFromSlotStart = aptStartMinutes - slotMinutes
                              const topOffset = (minutesFromSlotStart / 60) * 100 // 100px per hour

                              // Calculate total height based on actual duration
                              const durationMinutes = aptEndMinutes - aptStartMinutes
                              const heightPx = (durationMinutes / 60) * 100

                              // Account for borders between slots
                              const slotsSpanned = Math.ceil((aptStartMinutes - slotMinutes + durationMinutes) / 60)
                              const borderAdjustment = (slotsSpanned - 1) * 1 // 1px border between slots

                              // Check for overlaps with ALL appointments, not just ones in this slot
                              const overlappingAppts = getOverlappingAppointments(groomer.id, calDate.dateStr, appointment)
                              // Find the index of this appointment among all overlapping appointments
                              const allOverlapping = [appointment, ...overlappingAppts].sort((a, b) =>
                                parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
                              )
                              const overlapIndex = allOverlapping.findIndex(apt => apt.id === appointment.id)

                              // Layering effect for overlapping appointments
                              const isOverlapping = overlappingAppts.length > 0
                              const isActive = activeAppointmentId === appointment.id
                              // If active, bring to front with highest z-index
                              const zIndex = isActive ? 50 : 20 + overlapIndex
                              // Calculate left position - active cards have no extra offset beyond base padding
                              const baseLeftPadding = 4
                              const stackOffset = isOverlapping && overlapIndex > 0 ? 12 : 0
                              const leftPosition = isActive ? baseLeftPadding : baseLeftPadding + stackOffset

                              return (
                                <AppointmentCard
                                  key={appointment.id}
                                  petName={appointment.petName}
                                  owner={appointment.owner}
                                  service={appointment.service}
                                  time={appointment.time}
                                  endTime={appointment.endTime}
                                  tags={appointment.tags}
                                  status={appointment.status}
                                  onClick={(e) => {
                                    e?.stopPropagation() // Prevent slot click when clicking appointment
                                    const rect = e?.currentTarget.getBoundingClientRect()
                                    if (rect) {
                                      handleAppointmentClick(appointment, overlappingAppts, rect)
                                    }
                                  }}
                                  className="absolute"
                                  style={{
                                    top: `${topOffset}px`,
                                    left: `${leftPosition}px`,
                                    right: '4px',
                                    height: `${heightPx + borderAdjustment}px`,
                                    zIndex: zIndex
                                  }}
                                />
                              )
                            })
                          ) : occupied ? (
                            // This slot is occupied by a continuing appointment, render nothing
                            <div className="h-full"></div>
                          ) : (
                            // Empty slot - clickable
                            <div className="h-full"></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
