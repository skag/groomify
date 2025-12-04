import React from "react"
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
  onAppointmentClick?: (appointment: Appointment) => void
  onSlotClick?: (groomerId: number, groomerName: string, date: Date, timeSlot: string) => void
}

export function AppointmentsCalendar({
  appointments,
  groomers,
  dates,
  onAppointmentClick,
  onSlotClick
}: AppointmentsCalendarProps) {
  const [activeAppointmentId, setActiveAppointmentId] = React.useState<number | null>(null)

  // Helper to parse time strings to minutes
  const parseTimeToMinutes = (timeStr: string) => {
    const [time, period] = timeStr.split(' ')
    let [hours, minutes] = time.split(':').map(Number)
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return hours * 60 + minutes
  }

  // Helper to format hour (in 24h) to time string
  const formatHourToTimeString = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period}`
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

  // Helper to calculate how many hour slots an appointment spans
  const getAppointmentSlotSpan = (appointment: Appointment) => {
    const startMinutes = parseTimeToMinutes(appointment.time)
    const endMinutes = parseTimeToMinutes(appointment.endTime)
    const durationMinutes = endMinutes - startMinutes
    return Math.ceil(durationMinutes / 60) // Round up to nearest hour
  }

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

  // Total columns = time column + (groomers * dates)
  const totalColumns = dates.length * groomers.length
  // Use fixed width columns to ensure proper sticky behavior during horizontal scroll
  const gridTemplateColumns = `80px repeat(${totalColumns}, 150px)`

  return (
    <div className="border rounded-lg overflow-auto h-full">
      {/* Date Header Row */}
      <div className="grid border-b bg-muted/30 sticky top-0 z-[70]" style={{ gridTemplateColumns }}>
        {/* Empty cell for time column - sticky */}
        <div className="border-r p-2 bg-muted/30 sticky left-0 z-[80]"></div>
        {/* Date headers spanning groomers */}
        {dates.map((calDate) => (
          <div
            key={calDate.dateStr}
            className={cn(
              "text-center py-2 px-1 border-r last:border-r-0 font-semibold",
              calDate.isToday && "bg-primary/10"
            )}
            style={{ gridColumn: `span ${groomers.length}` }}
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
      <div className="grid border-b bg-muted/50 sticky top-[41px] z-[65]" style={{ gridTemplateColumns }}>
        {/* Empty cell for time column - sticky */}
        <div className="border-r p-2 bg-muted/50 sticky left-0 z-[80]">
          <span className="text-xs font-semibold text-muted-foreground">Time</span>
        </div>
        {/* Groomer headers for each date */}
        {dates.map((calDate) =>
          groomers.map((groomer) => {
            const appointmentCount = getGroomerDateAppointmentCount(groomer.id, calDate.dateStr)
            return (
              <div
                key={`${calDate.dateStr}-${groomer.id}`}
                className={cn(
                  "text-center p-2 border-r last:border-r-0",
                  calDate.isToday && "bg-primary/5"
                )}
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

      {/* Time slots as rows */}
      <div>
        {timeSlots.map((timeSlot, timeIndex) => (
          <div key={timeIndex} className="grid border-b last:border-b-0 min-h-[100px]" style={{ gridTemplateColumns }}>
            {/* Time label - sticky */}
            <div className="border-r py-2 px-2 text-xs text-muted-foreground font-medium flex items-start justify-end bg-white sticky left-0 z-[60] min-w-[80px]">
              {timeSlot}
            </div>
            {/* Cells for each date/groomer combination */}
            {dates.map((calDate) =>
              groomers.map((groomer) => {
                const appointmentsInSlot = getAppointmentsAtSlot(groomer.id, calDate.dateStr, timeSlot)
                const occupied = appointmentsInSlot.length === 0 && isSlotOccupied(groomer.id, calDate.dateStr, timeSlot)

                return (
                  <div
                    key={`${calDate.dateStr}-${groomer.id}-${timeSlot}`}
                    className={cn(
                      "border-r last:border-r-0 p-2 relative cursor-pointer hover:bg-gray-100 transition-colors",
                      calDate.isToday ? "bg-primary/5" : "bg-gray-50"
                    )}
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
  )
}
