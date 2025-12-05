import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Calendar, CalendarDays, Search, Dog, X } from "lucide-react"
import { AppointmentsCalendar } from "@/components/AppointmentsCalendar"
import { appointmentService, type DailyAppointmentsResponse, type CreateAppointmentRequest, type UpdateAppointmentRequest } from "@/services/appointmentService"
import { petService, type PetSearchResult } from "@/services/petService"
import { serviceService } from "@/services/serviceService"
import type { Service } from "@/types/service"
import type {
  ViewMode,
  Appointment,
  CalendarDate,
  CalendarGroomer,
  CalendarPet,
  CalendarService,
  GroomerInfo,
  SelectedPet,
  RescheduleMode,
} from "@/types/appointments"
import {
  formatDateToISO,
  isSameDay,
  getStartOfWeek,
  getWeekDates,
} from "@/utils/dateUtils"
import {
  parseTimeString,
  calculateDurationMinutes,
} from "@/utils/timeUtils"

export default function Appointments() {
  const navigate = useNavigate()
  const { petId } = useParams<{ petId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [groomers, setGroomers] = useState<GroomerInfo[]>([])
  const [selectedGroomerIds, setSelectedGroomerIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [services, setServices] = useState<CalendarService[]>([])

  // Pet selection state
  const [selectedPet, setSelectedPet] = useState<SelectedPet | null>(null)
  const [isLoadingPet, setIsLoadingPet] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SelectedPet[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

  // Date picker popover state
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Reschedule mode state
  const [rescheduleMode, setRescheduleMode] = useState<RescheduleMode>({
    active: false,
    appointmentId: null,
    originalAppointment: null,
  })

  // Load pet data when petId is provided in URL
  useEffect(() => {
    if (!petId) {
      setSelectedPet(null)
      return
    }

    const loadPet = async () => {
      setIsLoadingPet(true)
      try {
        const petData = await petService.getPetById(parseInt(petId, 10))
        setSelectedPet({
          id: petId,
          name: petData.name,
          owner: petData.account_name || '',
          breed: petData.breed || petData.species,
          phone: null,
          defaultGroomerId: petData.default_groomer_id,
        })
      } catch (error) {
        console.error("Error loading pet:", error)
        // Navigate to appointments without pet if not found
        navigate("/appointments", { replace: true })
      } finally {
        setIsLoadingPet(false)
      }
    }

    loadPet()
  }, [petId, navigate])

  // Handle reschedule query parameter
  useEffect(() => {
    const rescheduleId = searchParams.get('reschedule')

    if (!rescheduleId) {
      // Clear reschedule mode if no query param
      if (rescheduleMode.active) {
        setRescheduleMode({
          active: false,
          appointmentId: null,
          originalAppointment: null,
        })
        // Also clear the pet that was set during reschedule mode
        // (only if we don't have a petId in the URL)
        if (!petId) {
          setSelectedPet(null)
        }
      }
      return
    }

    const appointmentId = parseInt(rescheduleId, 10)
    if (isNaN(appointmentId)) {
      // Invalid ID, clear the param
      setSearchParams({}, { replace: true })
      return
    }

    // Don't refetch if we already have this appointment loaded
    if (rescheduleMode.appointmentId === appointmentId) {
      return
    }

    // Fetch the appointment details
    const loadAppointment = async () => {
      setIsLoadingPet(true) // Reuse loading state
      try {
        const appointment = await appointmentService.getAppointment(appointmentId)

        // Set reschedule mode with appointment data
        setRescheduleMode({
          active: true,
          appointmentId: appointment.id,
          originalAppointment: {
            id: appointment.id,
            petId: appointment.pet_id,
            petName: appointment.pet_name,
            owner: appointment.customer_name,
            serviceId: appointment.services.length > 0 ? null : null, // Services don't have ID in response, will need to match by name
            serviceName: appointment.services.length > 0 ? appointment.services[0].name : '',
            groomerId: appointment.staff_id,
            groomerName: appointment.staff_name,
            datetime: appointment.appointment_datetime,
            durationMinutes: appointment.duration_minutes,
          },
        })

        // Also set the pet as selected (locked)
        setSelectedPet({
          id: appointment.pet_id.toString(),
          name: appointment.pet_name,
          owner: appointment.customer_name,
          breed: '', // Not available in response
          phone: null,
          defaultGroomerId: appointment.staff_id,
        })

        // Switch to week view for reschedule
        setViewMode('week')
      } catch (error) {
        console.error("Error loading appointment for reschedule:", error)
        // Clear the param if appointment not found
        setSearchParams({}, { replace: true })
      } finally {
        setIsLoadingPet(false)
      }
    }

    loadAppointment()
  }, [searchParams, setSearchParams, rescheduleMode.active, rescheduleMode.appointmentId, petId])

  // Handle pet query parameter (pre-select pet for booking)
  // State is driven by the query string - no pet param means no pet selected
  useEffect(() => {
    const petIdParam = searchParams.get('pet')
    const rescheduleParam = searchParams.get('reschedule')

    // If no pet param and not in reschedule mode, clear selected pet
    if (!petIdParam && !rescheduleParam) {
      if (selectedPet) {
        setSelectedPet(null)
        setSelectedGroomerIds(new Set()) // Reset to trigger select all
      }
      return
    }

    // Skip if reschedule mode is handling the pet selection
    if (rescheduleParam) {
      return
    }

    const petIdNum = parseInt(petIdParam!, 10)
    if (isNaN(petIdNum)) {
      // Invalid ID, clear the param
      setSearchParams({}, { replace: true })
      return
    }

    // Don't refetch if we already have this pet selected
    if (selectedPet?.id === petIdParam) {
      return
    }

    // Fetch the pet details
    const loadPetForBooking = async () => {
      setIsLoadingPet(true)
      try {
        const petData = await petService.getPetById(petIdNum)

        setSelectedPet({
          id: petData.id.toString(),
          name: petData.name,
          owner: petData.account_name || '',
          breed: petData.breed || petData.species,
          phone: null,
          defaultGroomerId: petData.default_groomer_id,
        })
      } catch (error) {
        console.error("Error loading pet for booking:", error)
        // Clear the param if pet not found
        setSearchParams({}, { replace: true })
      } finally {
        setIsLoadingPet(false)
      }
    }

    loadPetForBooking()
  }, [searchParams, setSearchParams, selectedPet])

  // Reset groomer selection when pet changes to use default groomer
  useEffect(() => {
    if (selectedPet?.defaultGroomerId && groomers.length > 0) {
      const defaultGroomer = groomers.find(g => g.id === selectedPet.defaultGroomerId)
      if (defaultGroomer) {
        setSelectedGroomerIds(new Set([defaultGroomer.id]))
      }
    } else if (!selectedPet && groomers.length > 0) {
      // No pet selected, select all groomers
      setSelectedGroomerIds(new Set(groomers.map(g => g.id)))
    }
  }, [selectedPet, groomers])

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const results = await petService.searchPets(query)
      const pets: SelectedPet[] = results.map((result: PetSearchResult) => ({
        id: result.pet_id.toString(),
        name: result.pet_name,
        owner: result.family_name,
        breed: result.breed || result.species,
        phone: result.phone,
        primaryContactName: result.customer_user_name,
      }))
      setSearchResults(pets)
    } catch (error) {
      console.error("Error searching pets:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search - 300ms delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, performSearch])

  // Fetch appointments when date/viewMode changes
  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Determine dates to fetch based on view mode
        const datesToFetch: Date[] = viewMode === 'day'
          ? [currentDate]
          : getWeekDates(getStartOfWeek(currentDate))

        // Fetch appointments for all dates in parallel
        const responses = await Promise.all(
          datesToFetch.map(date => appointmentService.getDailyAppointments(date))
        )

        // Transform API responses to match calendar component format
        const transformedAppointments: Appointment[] = []
        const groomerMap = new Map<number, GroomerInfo>()

        responses.forEach((response: DailyAppointmentsResponse, index) => {
          const dateStr = formatDateToISO(datesToFetch[index])

          for (const groomer of response.groomers) {
            // Collect unique groomers
            if (!groomerMap.has(groomer.id)) {
              groomerMap.set(groomer.id, { id: groomer.id, name: groomer.name })
            }

            for (const appt of groomer.appointments) {
              transformedAppointments.push({
                id: appt.id,
                time: appt.time,
                endTime: appt.end_time,
                petId: appt.pet_id,
                petName: appt.pet_name,
                owner: appt.owner,
                serviceId: appt.service_id ?? undefined,
                service: appt.service,
                groomer: appt.groomer,
                groomerId: appt.groomer_id,
                date: dateStr,
                tags: appt.tags,
                status: appt.status ?? undefined,
                isConfirmed: appt.is_confirmed,
              })
            }
          }
        })

        const groomerList = Array.from(groomerMap.values())
        setAppointments(transformedAppointments)
        setGroomers(groomerList)
      } catch (err) {
        console.error('Failed to fetch appointments:', err)
        setError(err instanceof Error ? err.message : 'Failed to load appointments')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [currentDate, viewMode, selectedPet])

  // Fetch services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const serviceList = await serviceService.getServices()
        setServices(serviceList.map((s: Service) => ({
          id: s.id,
          name: s.name,
          duration_minutes: s.duration_minutes,
          price: s.price
        })))
      } catch (err) {
        console.error('Failed to fetch services:', err)
      }
    }
    fetchServices()
  }, [])

  // Generate calendar dates based on view mode
  const calendarDates: CalendarDate[] = (() => {
    const today = new Date()
    if (viewMode === 'day') {
      return [{
        date: currentDate,
        dateStr: formatDateToISO(currentDate),
        label: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        isToday: isSameDay(currentDate, today),
      }]
    } else {
      const weekStart = getStartOfWeek(currentDate)
      return getWeekDates(weekStart).map(date => ({
        date,
        dateStr: formatDateToISO(date),
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        isToday: isSameDay(date, today),
      }))
    }
  })()

  const dateRangeLabel = (() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    } else {
      const weekStart = getStartOfWeek(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
  })()

  const handlePrevious = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - (viewMode === 'day' ? 1 : 7))
      return newDate
    })
  }

  const handleNext = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + (viewMode === 'day' ? 1 : 7))
      return newDate
    })
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleJumpWeeks = (weeks: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + weeks * 7)
      return newDate
    })
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date)
      setDatePickerOpen(false)
    }
  }

  const handleSelectPet = async (pet: SelectedPet) => {
    setSearchQuery("")
    setShowSearchDropdown(false)
    // Switch to week view when a pet is selected
    setViewMode('week')

    // Update URL with pet query param
    setSearchParams({ pet: pet.id }, { replace: true })

    // Fetch full pet details to get default groomer
    try {
      const petData = await petService.getPetById(parseInt(pet.id, 10))
      setSelectedPet({
        id: pet.id,
        name: pet.name,
        owner: pet.owner,
        breed: pet.breed,
        phone: pet.phone,
        primaryContactName: pet.primaryContactName,
        defaultGroomerId: petData.default_groomer_id,
      })
    } catch (error) {
      console.error("Error fetching pet details:", error)
      // Fall back to pet without default groomer
      setSelectedPet({
        id: pet.id,
        name: pet.name,
        owner: pet.owner,
        breed: pet.breed,
        phone: pet.phone,
        primaryContactName: pet.primaryContactName,
        defaultGroomerId: undefined,
      })
    }
  }

  const handleClearPet = () => {
    setSelectedPet(null)
    setSelectedGroomerIds(new Set()) // Reset to trigger select all on next fetch
    // Clear pet query param
    setSearchParams({}, { replace: true })
  }

  const handleCancelReschedule = () => {
    // Navigate to clean appointments page (same behavior as handleClearPet)
    navigate("/appointments", { replace: true })
  }

  const toggleGroomer = (groomerId: number) => {
    setSelectedGroomerIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groomerId)) {
        // Don't allow deselecting the last groomer
        if (newSet.size > 1) {
          newSet.delete(groomerId)
        }
      } else {
        newSet.add(groomerId)
      }
      return newSet
    })
  }

  const selectAllGroomers = () => {
    setSelectedGroomerIds(new Set(groomers.map(g => g.id)))
  }

  // Filter groomers and appointments based on selection
  const filteredGroomers: CalendarGroomer[] = groomers.filter(g => selectedGroomerIds.has(g.id))
  const filteredAppointments = appointments.filter(a => selectedGroomerIds.has(a.groomerId))

  const handleAppointmentClick = (appointment: Appointment) => {
    alert(`Clicked on ${appointment.petName} - ${appointment.service}`)
  }

  // Pet search handler for the calendar popover
  const handlePetSearch = async (query: string): Promise<CalendarPet[]> => {
    if (!query.trim()) return []
    const results = await petService.searchPets(query)
    return results.map((r: PetSearchResult) => ({
      id: r.pet_id,
      name: r.pet_name,
      owner: r.family_name,
      breed: r.breed || r.species
    }))
  }

// Booking confirmation handler
  const handleBookingConfirm = async (booking: {
    petId: number
    petName: string
    groomerId: number
    groomerName: string
    serviceId: number
    serviceName: string
    date: Date
    startTime: string
    endTime: string
  }) => {
    try {
      // Build the appointment datetime
      const { hours, minutes } = parseTimeString(booking.startTime)
      const appointmentDatetime = new Date(booking.date)
      appointmentDatetime.setHours(hours, minutes, 0, 0)

      // Calculate duration from start and end times
      const durationMinutes = calculateDurationMinutes(booking.startTime, booking.endTime)

      // If in reschedule mode, update the existing appointment instead of creating new
      if (rescheduleMode.active && rescheduleMode.appointmentId) {
        const updateRequest: UpdateAppointmentRequest = {
          staff_id: booking.groomerId,
          service_ids: [booking.serviceId],
          appointment_datetime: appointmentDatetime.toISOString(),
          duration_minutes: durationMinutes,
        }

        const response = await appointmentService.updateAppointment(rescheduleMode.appointmentId, updateRequest)

        // Update local state - remove old appointment from its original date/time slot
        // and add the updated one
        setAppointments(prev => prev.map(appt => {
          if (appt.id === rescheduleMode.appointmentId) {
            return {
              ...appt,
              time: booking.startTime,
              endTime: booking.endTime,
              serviceId: booking.serviceId,
              service: booking.serviceName,
              groomer: response.staff_name,
              groomerId: response.staff_id,
              date: formatDateToISO(booking.date),
            }
          }
          return appt
        }))

        // Clear reschedule mode
        setSearchParams({}, { replace: true })
        setRescheduleMode({
          active: false,
          appointmentId: null,
          originalAppointment: null,
        })
        setSelectedPet(null)
        setSelectedGroomerIds(new Set(groomers.map(g => g.id)))

        return
      }

      // Normal booking flow - create new appointment
      const request: CreateAppointmentRequest = {
        pet_id: booking.petId,
        staff_id: booking.groomerId,
        service_ids: [booking.serviceId],
        appointment_datetime: appointmentDatetime.toISOString(),
        duration_minutes: durationMinutes,
      }

      const response = await appointmentService.createAppointment(request)

      // Add the new appointment to local state (optimistic update without full reload)
      const newAppointment: Appointment = {
        id: response.id,
        time: booking.startTime,
        endTime: booking.endTime,
        petId: response.pet_id,
        petName: response.pet_name,
        owner: response.customer_name,
        serviceId: booking.serviceId,
        service: booking.serviceName,
        groomer: response.staff_name,
        groomerId: response.staff_id,
        date: formatDateToISO(booking.date),
        tags: [],
        status: response.status ?? undefined,
        isConfirmed: response.is_confirmed,
      }

      setAppointments(prev => [...prev, newAppointment])
    } catch (err) {
      console.error('Failed to create appointment:', err)
      alert('Failed to create appointment. Please try again.')
    }
  }

  // Appointment update handler
  const handleAppointmentUpdate = async (appointmentId: number, booking: {
    petId: number
    petName: string
    groomerId: number
    groomerName: string
    serviceId: number
    serviceName: string
    date: Date
    startTime: string
    endTime: string
  }) => {
    try {
      // Build the appointment datetime (keep the same date, update time)
      const { hours, minutes } = parseTimeString(booking.startTime)
      const appointmentDatetime = new Date(booking.date)
      appointmentDatetime.setHours(hours, minutes, 0, 0)

      // Calculate duration from start and end times
      const durationMinutes = calculateDurationMinutes(booking.startTime, booking.endTime)

      const request: UpdateAppointmentRequest = {
        staff_id: booking.groomerId,
        service_ids: [booking.serviceId],
        appointment_datetime: appointmentDatetime.toISOString(),
        duration_minutes: durationMinutes,
      }

      const response = await appointmentService.updateAppointment(appointmentId, request)

      // Update local state with the response
      setAppointments(prev => prev.map(appt => {
        if (appt.id === appointmentId) {
          return {
            ...appt,
            time: booking.startTime,
            endTime: booking.endTime,
            petId: response.pet_id,
            petName: response.pet_name,
            serviceId: booking.serviceId,
            service: booking.serviceName,
            groomer: response.staff_name,
            groomerId: response.staff_id,
          }
        }
        return appt
      }))
    } catch (err) {
      console.error('Failed to update appointment:', err)
      alert('Failed to update appointment. Please try again.')
    }
  }

  if (isLoadingPet) {
    return (
      <AppLayout>
        <div className="flex h-full flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col overflow-hidden">

        <div className="flex flex-1 flex-col gap-4 p-6 overflow-hidden">
          {/* Pet Search / Selection / Reschedule Banner */}
          <div className="flex items-center gap-3 shrink-0">
            {rescheduleMode.active && rescheduleMode.originalAppointment ? (
              // Reschedule Mode Banner
              <div className="flex items-center gap-4 p-3 bg-amber-50 border border-amber-200 rounded-lg w-full">
                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base text-amber-900">
                    Rescheduling appointment for {rescheduleMode.originalAppointment.petName}
                  </p>
                  <p className="text-xs text-amber-700">
                    Original: {new Date(rescheduleMode.originalAppointment.datetime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })} • {rescheduleMode.originalAppointment.serviceName} • {rescheduleMode.originalAppointment.groomerName}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelReschedule}
                  className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel Reschedule
                </Button>
              </div>
            ) : selectedPet ? (
              <div className="flex items-center gap-4 py-4 px-6 bg-green-50 border border-green-200 rounded-lg w-full max-w-2xl">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Dog className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg text-green-900">{selectedPet.name}</p>
                  <p className="text-sm text-green-700">
                    {selectedPet.breed} • {selectedPet.owner}
                  </p>
                </div>
                {(selectedPet.primaryContactName || selectedPet.phone) && (
                  <div className="flex flex-col items-end text-right shrink-0">
                    {selectedPet.primaryContactName && (
                      <p className="text-sm font-medium text-green-900">{selectedPet.primaryContactName}</p>
                    )}
                    {selectedPet.phone && (
                      <p className="text-sm text-green-700">{selectedPet.phone}</p>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearPet}
                  className="shrink-0 border-green-300 text-green-700 hover:bg-green-100"
                >
                  Change Pet
                </Button>
              </div>
            ) : (
              <div className="relative w-full max-w-md">
                <div className="relative">
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input
                    placeholder="Search pet to book an appointment..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowSearchDropdown(true)
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    onBlur={() => {
                      // Delay hiding to allow click on results
                      setTimeout(() => setShowSearchDropdown(false), 200)
                    }}
                    className="pl-10"
                  />
                </div>
                {/* Search Results Dropdown */}
                {showSearchDropdown && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((pet) => (
                        <div
                          key={pet.id}
                          className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                          onMouseDown={() => handleSelectPet(pet)}
                        >
                          <Dog className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{pet.name}</p>
                            <p className="text-xs text-muted-foreground">{pet.owner} • {pet.breed}</p>
                          </div>
                        </div>
                      ))
                    ) : !isSearching ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No pets found
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date Header with Navigation and View Toggle */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                      <ChevronsLeft className="!h-[1.5rem] !w-[1.5rem]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {[2, 3, 4, 5, 6, 7, 8].map((weeks) => (
                      <DropdownMenuItem key={weeks} onClick={() => handleJumpWeeks(-weeks)}>
                        {weeks} weeks
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  className="h-10 w-10 shrink-0"
                >
                  <ChevronLeft className="!h-[1.5rem] !w-[1.5rem]" />
                </Button>
              </div>
              <div className="flex flex-col gap-1 min-w-[280px]">
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="text-2xl font-bold tracking-tight text-left hover:text-primary transition-colors cursor-pointer">
                      {dateRangeLabel}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={currentDate}
                      onSelect={handleDateSelect}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : `${appointments.length} appointments`}
                </p>
              </div>
              <div className="flex items-center gap-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="h-10 w-10 shrink-0"
                >
                  <ChevronRight className="!h-[1.5rem] !w-[1.5rem]" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                      <ChevronsRight className="!h-[1.5rem] !w-[1.5rem]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[2, 3, 4, 5, 6, 7, 8].map((weeks) => (
                      <DropdownMenuItem key={weeks} onClick={() => handleJumpWeeks(weeks)}>
                        {weeks} weeks
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
              >
                Today
              </Button>
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className="rounded-r-none"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Day
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="rounded-l-none"
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Week
                </Button>
              </div>
            </div>
          </div>

          {/* Groomer Filter Pills */}
          {groomers.length > 0 && (
            <div className="space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Filter by Groomer</Label>
                {selectedGroomerIds.size < groomers.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllGroomers}
                    className="h-7 text-xs"
                  >
                    Select All
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {groomers.map((groomer) => {
                  const isSelected = selectedGroomerIds.has(groomer.id)
                  const groomerAppointments = appointments.filter(a => a.groomerId === groomer.id).length
                  return (
                    <Button
                      key={groomer.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleGroomer(groomer.id)}
                      className="transition-all"
                    >
                      {groomer.name}
                      <span className={`ml-1.5 text-xs ${isSelected ? 'opacity-70' : 'text-muted-foreground'}`}>
                        ({groomerAppointments})
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Booking Instructions when pet is selected */}
          {selectedPet && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg shrink-0">
              Click on an empty time slot to book an appointment for <strong>{selectedPet.name}</strong>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-destructive mb-2">{error}</p>
                  <Button variant="outline" onClick={() => setCurrentDate(new Date(currentDate))}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : filteredGroomers.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No groomers available</p>
              </div>
            ) : (
              <AppointmentsCalendar
                appointments={filteredAppointments}
                groomers={filteredGroomers}
                dates={calendarDates}
                viewMode={viewMode}
                onAppointmentClick={handleAppointmentClick}
                preSelectedPet={selectedPet ? {
                  id: parseInt(selectedPet.id),
                  name: selectedPet.name,
                  owner: selectedPet.owner,
                  breed: selectedPet.breed
                } : undefined}
                onPetSearch={handlePetSearch}
                services={services}
                rescheduleMode={rescheduleMode.active ? {
                  active: true,
                  appointmentId: rescheduleMode.appointmentId,
                  originalServiceName: rescheduleMode.originalAppointment?.serviceName,
                } : undefined}
                onBookingConfirm={handleBookingConfirm}
                onAppointmentUpdate={handleAppointmentUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
