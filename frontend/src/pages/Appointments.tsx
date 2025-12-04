import { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Loader2, Calendar, CalendarDays, Search, Dog } from "lucide-react"
import { AppointmentsCalendar, type Appointment, type CalendarDate, type CalendarGroomer, type CalendarPet, type CalendarService } from "@/components/AppointmentsCalendar"
import { appointmentService, type DailyAppointmentsResponse } from "@/services/appointmentService"
import { petService, type PetSearchResult } from "@/services/petService"
import { serviceService } from "@/services/serviceService"
import type { Service } from "@/types/service"

type ViewMode = 'day' | 'week'

interface GroomerInfo {
  id: number
  name: string
}

interface SelectedPet {
  id: string
  name: string
  owner: string
  breed: string
  phone?: string | null
  defaultGroomerId?: number | null
}

// Helper to format date to ISO string (YYYY-MM-DD)
function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateToISO(date1) === formatDateToISO(date2)
}

// Helper to get start of week (Monday)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to generate week dates
function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    dates.push(d)
  }
  return dates
}

export default function Appointments() {
  const navigate = useNavigate()
  const { petId } = useParams<{ petId?: string }>()

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
                petName: appt.pet_name,
                owner: appt.owner,
                service: appt.service,
                groomer: appt.groomer,
                groomerId: appt.groomer_id,
                date: dateStr,
                tags: appt.tags,
                status: appt.status ?? undefined,
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

  const handleSelectPet = (pet: SelectedPet) => {
    // Navigate to the URL with pet ID
    navigate(`/appointments/${pet.id}`)
    setSearchQuery("")
    setShowSearchDropdown(false)
  }

  const handleClearPet = () => {
    navigate("/appointments")
    setSelectedGroomerIds(new Set()) // Reset to trigger select all on next fetch
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
  const handleBookingConfirm = (booking: {
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
    const dateStr = booking.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    // TODO: Call API to create appointment
    alert(`Booking confirmed!\n\nPet: ${booking.petName}\nGroomer: ${booking.groomerName}\nService: ${booking.serviceName}\nDate: ${dateStr}\nTime: ${booking.startTime} - ${booking.endTime}`)
  }

  if (isLoadingPet) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Appointments</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6 pt-0 overflow-hidden">
          {/* Pet Search / Selection */}
          <div className="flex items-center gap-3 shrink-0">
            {selectedPet ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Dog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">{selectedPet.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPet.owner} • {selectedPet.breed}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearPet}
                  className="ml-2"
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
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="h-10 w-10 shrink-0"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div className="flex flex-col gap-1 min-w-[280px]">
                <h1 className="text-2xl font-bold tracking-tight">{dateRangeLabel}</h1>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : `${appointments.length} appointments`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-10 w-10 shrink-0"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
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
                onBookingConfirm={handleBookingConfirm}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
