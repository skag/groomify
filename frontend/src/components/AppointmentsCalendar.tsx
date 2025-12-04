import React, { useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { AppointmentCard, AppointmentStatus } from "@/components/AppointmentCard"
import { cn } from "@/lib/utils"

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

interface AppointmentsCalendarProps {
  appointments: Appointment[]
  groomers: CalendarGroomer[]
  dates: CalendarDate[]
  viewMode?: 'day' | 'week'
  onAppointmentClick?: (appointment: Appointment) => void
  onSlotClick?: (groomerId: number, groomerName: string, date: Date, timeSlot: string) => void
}

export function AppointmentsCalendar({
  appointments,
  groomers,
  dates,
  viewMode = 'day',
  onAppointmentClick,
  onSlotClick
}: AppointmentsCalendarProps) {
  const [activeAppointmentId, setActiveAppointmentId] = React.useState<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const timeColumnRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)

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

  // Helper to format hour (in 24h) to time string
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

  const totalColumns = dates.length * groomers.length
  const columnWidth = 150
  const minColumnWidth = 150
  const timeColumnWidth = 56

  // In day view, columns should flex to fill available space
  // In week view, columns have fixed width for horizontal scrolling
  const isDayView = viewMode === 'day'

  return (
    <div className="border rounded-lg h-full flex flex-col overflow-hidden">
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
          <div style={isDayView ? undefined : { width: totalColumns * columnWidth }}>
            {timeSlots.map((timeSlot, timeIndex) => (
              <div key={timeIndex} className="flex border-b last:border-b-0 h-[100px]">
                {dates.map((calDate) =>
                  groomers.map((groomer) => {
                    const appointmentsInSlot = getAppointmentsAtSlot(groomer.id, calDate.dateStr, timeSlot)
                    const occupied = appointmentsInSlot.length === 0 && isSlotOccupied(groomer.id, calDate.dateStr, timeSlot)

                    return (
                      <div
                        key={`${calDate.dateStr}-${groomer.id}-${timeSlot}`}
                        className={cn(
                          "border-r last:border-r-0 p-2 relative cursor-pointer hover:bg-gray-100 transition-colors",
                          calDate.isToday ? "bg-primary/5" : "bg-gray-50",
                          isDayView && "flex-1"
                        )}
                        style={isDayView ? { minWidth: minColumnWidth } : { width: columnWidth }}
                        onClick={() => {
                          // Only create new appointment if slot is not occupied
                          if (appointmentsInSlot.length === 0 && !occupied && onSlotClick) {
                            onSlotClick(groomer.id, groomer.name, calDate.date, timeSlot)
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
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
