import React, { useRef, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { AppointmentCard, AppointmentStatus } from "@/components/AppointmentCard"
import { cn } from "@/lib/utils"
import { Calendar, Clock, X } from "lucide-react"

export interface Appointment {
  id: number
  time: string
  endTime: string
  petName: string
  owner: string
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
  onSlotSelect?: (groomerId: number, groomerName: string, date: Date, startTime: string, endTime: string) => void
}

export function AppointmentsCalendar({
  appointments,
  groomers,
  dates,
  viewMode = 'day',
  onAppointmentClick,
  onSlotSelect
}: AppointmentsCalendarProps) {
  const [activeAppointmentId, setActiveAppointmentId] = useState<number | null>(null)
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ groomerId: number; groomerName: string; date: Date; dateStr: string; minutes: number; y: number } | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const timeColumnRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const calendarBodyRef = useRef<HTMLDivElement>(null)

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

  const handleAppointmentClick = (appointment: Appointment, overlappingAppts: Appointment[]) => {
    // If there are overlapping appointments
    if (overlappingAppts.length > 0) {
      // Check if this appointment is already active (in front)
      if (activeAppointmentId === appointment.id) {
        // Already active, open the modal
        onAppointmentClick?.(appointment)
      } else {
        // Not active, bring to front without opening modal
        setActiveAppointmentId(appointment.id)
      }
    } else {
      // No overlaps, open modal directly
      onAppointmentClick?.(appointment)
    }
  }

  // Count appointments per groomer per date
  const getGroomerDateAppointmentCount = (groomerId: number, dateStr: string) => {
    return appointments.filter(apt => apt.groomerId === groomerId && apt.date === dateStr).length
  }

  // Calculate minutes from Y position within the calendar body
  const getMinutesFromY = useCallback((y: number, slotElement: HTMLElement): number => {
    const rect = slotElement.getBoundingClientRect()
    const relativeY = y - rect.top
    const slotIndex = Math.floor(relativeY / 100) // Each slot is 100px
    const minutesIntoSlot = Math.round(((relativeY % 100) / 100) * 60 / 15) * 15 // Snap to 15-min intervals
    return (startHour + slotIndex) * 60 + minutesIntoSlot
  }, [startHour])

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

  // Close popover and clear selection
  const handleClosePopover = () => {
    setPopoverOpen(false)
    setSelection(null)
  }

  // Handle booking confirmation
  const handleConfirmBooking = () => {
    if (selection && onSlotSelect) {
      onSlotSelect(
        selection.groomerId,
        selection.groomerName,
        selection.date,
        formatMinutesToTimeString(selection.startMinutes),
        formatMinutesToTimeString(selection.endMinutes)
      )
    }
    handleClosePopover()
  }

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
            top: selection?.anchorRect.top ?? 0,
            left: selection?.anchorRect.left ?? 0,
            width: selection?.anchorRect.width ?? 0,
            height: selection?.anchorRect.height ?? 0,
            pointerEvents: 'none'
          }}
        />
        <PopoverContent
          side="right"
          align="start"
          className="w-72 p-0"
          onInteractOutside={handleClosePopover}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Ready to Book</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClosePopover}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selection && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {selection.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatMinutesToTimeString(selection.startMinutes)} - {formatMinutesToTimeString(selection.endMinutes)}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">{selection.groomerName}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleClosePopover}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1" onClick={handleConfirmBooking}>
                Book
              </Button>
            </div>
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
                    {timeSlots.map((timeSlot, timeIndex) => {
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
                            // Allow clicking if slot is empty OR if clicking before the first appointment in slot
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

                            if (!hasAppointmentAtClick && !occupied) {
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
                                    handleAppointmentClick(appointment, overlappingAppts)
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
