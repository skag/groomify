import React from "react"
import { Badge } from "@/components/ui/badge"
import { AppointmentCard } from "@/components/AppointmentCard"

type AppointmentStatus = "scheduled" | "checked-in" | "in-process" | "ready-for-pickup" | "checked-out"

interface Appointment {
  id: number
  time: string
  endTime: string
  petName: string
  owner: string
  service: string
  groomer: string
  tags?: string[]
  status?: AppointmentStatus
}

interface AppointmentsCalendarProps {
  appointments: Appointment[]
  groomers: string[]
  onAppointmentClick?: (appointment: Appointment) => void
  onSlotClick?: (groomer: string, timeSlot: string) => void
}

export function AppointmentsCalendar({
  appointments,
  groomers,
  onAppointmentClick,
  onSlotClick
}: AppointmentsCalendarProps) {
  const [activeAppointmentId, setActiveAppointmentId] = React.useState<number | null>(null)
  // Time slots for the calendar (9 AM to 6 PM in hourly increments)
  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"
  ]

  // Helper to parse time strings to minutes
  const parseTimeToMinutes = (timeStr: string) => {
    const [time, period] = timeStr.split(' ')
    let [hours, minutes] = time.split(':').map(Number)
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return hours * 60 + minutes
  }

  // Helper to calculate how many hour slots an appointment spans
  const getAppointmentSlotSpan = (appointment: Appointment) => {
    const startMinutes = parseTimeToMinutes(appointment.time)
    const endMinutes = parseTimeToMinutes(appointment.endTime)
    const durationMinutes = endMinutes - startMinutes
    return Math.ceil(durationMinutes / 60) // Round up to nearest hour
  }

  // Helper to get all appointments that start within this time slot hour
  const getAppointmentsAtSlot = (groomer: string, timeSlot: string) => {
    const slotMinutes = parseTimeToMinutes(timeSlot)
    const nextSlotMinutes = slotMinutes + 60 // Next hour

    return appointments.filter(apt => {
      if (apt.groomer !== groomer) return false
      const aptStartMinutes = parseTimeToMinutes(apt.time)
      // Check if appointment starts within this hour slot
      return aptStartMinutes >= slotMinutes && aptStartMinutes < nextSlotMinutes
    }).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
  }

  // Helper to check if an appointment overlaps with any other appointments for the same groomer
  const getOverlappingAppointments = (groomer: string, appointment: Appointment) => {
    const aptStartMinutes = parseTimeToMinutes(appointment.time)
    const aptEndMinutes = parseTimeToMinutes(appointment.endTime)

    return appointments.filter(other => {
      if (other.id === appointment.id || other.groomer !== groomer) return false
      const otherStartMinutes = parseTimeToMinutes(other.time)
      const otherEndMinutes = parseTimeToMinutes(other.endTime)

      // Check if appointments overlap
      return aptStartMinutes < otherEndMinutes && aptEndMinutes > otherStartMinutes
    }).sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))
  }

  // Helper to check if this slot is occupied by a continuing appointment
  const isSlotOccupied = (groomer: string, timeSlot: string) => {
    const slotIndex = timeSlots.indexOf(timeSlot)
    // Check all appointments for this groomer
    for (const apt of appointments.filter(a => a.groomer === groomer)) {
      const startIndex = timeSlots.indexOf(apt.time)
      if (startIndex === -1) continue
      const span = getAppointmentSlotSpan(apt)
      // Check if this slot falls within the appointment's span
      if (slotIndex >= startIndex && slotIndex < startIndex + span) {
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

  return (
    <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
      {/* Header Row with Groomers */}
      <div className="grid border-b bg-muted/50 sticky top-0 z-10" style={{ gridTemplateColumns: '80px repeat(5, 1fr)' }}>
        {/* Empty cell for time column */}
        <div className="border-r p-2">
          <span className="text-xs font-semibold text-muted-foreground">Time</span>
        </div>
        {/* Groomer headers */}
        {groomers.map((groomer) => {
          const groomerAppointments = appointments.filter(apt => apt.groomer === groomer)
          return (
            <div key={groomer} className="text-center p-3 border-r last:border-r-0">
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm font-semibold">{groomer}</p>
                <Badge variant="secondary" className="rounded-full text-xs">
                  {groomerAppointments.length}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>

      {/* Time slots as rows - Scrollable */}
      <div className="overflow-y-auto flex-1">
        {timeSlots.map((timeSlot, timeIndex) => (
          <div key={timeIndex} className="grid border-b last:border-b-0 min-h-[100px]" style={{ gridTemplateColumns: '80px repeat(5, 1fr)' }}>
            {/* Time label */}
            <div className="border-r py-2 px-2 text-xs text-muted-foreground font-medium flex items-start justify-end">
              {timeSlot}
            </div>
            {/* Groomer cells */}
            {groomers.map((groomer) => {
              const appointmentsInSlot = getAppointmentsAtSlot(groomer, timeSlot)
              const occupied = appointmentsInSlot.length === 0 && isSlotOccupied(groomer, timeSlot)

              return (
                <div
                  key={groomer}
                  className="border-r last:border-r-0 p-2 relative bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    // Only create new appointment if slot is not occupied
                    if (appointmentsInSlot.length === 0 && !occupied && onSlotClick) {
                      onSlotClick(groomer, timeSlot)
                    }
                  }}
                >
                  {appointmentsInSlot.length > 0 ? (
                    appointmentsInSlot.map((appointment, index) => {
                      const slotSpan = getAppointmentSlotSpan(appointment)
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
                      const overlappingAppts = getOverlappingAppointments(groomer, appointment)
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
                      const baseLeftPadding = 8
                      const stackOffset = isOverlapping && overlapIndex > 0 ? 16 : 0
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
                            right: '8px',
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
        ))}
      </div>
    </div>
  )
}
