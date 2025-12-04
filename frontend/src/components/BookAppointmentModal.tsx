import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, ChevronLeft, ChevronRight, X, Dog } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Pet {
  id: string
  name: string
  owner: string
  breed: string
  lastAppointment?: string
}

interface TimeSlot {
  time: string
  availableGroomers: string[]
  fullyBooked: boolean
}

interface BookAppointmentModalProps {
  open: boolean
  onClose: () => void
  preSelectedPet?: Pet
}

export function BookAppointmentModal({ open, onClose, preSelectedPet }: BookAppointmentModalProps) {
  const [selectedPet, setSelectedPet] = useState<Pet | null>(preSelectedPet || null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date())
  const [selectedGroomers, setSelectedGroomers] = useState<string[]>([])

  // Available groomers
  const groomers = ["Sarah Johnson", "Mike Chen", "Emily Rodriguez", "James Wilson", "Lisa Parker"]

  // Mock pet search results
  const mockPets: Pet[] = [
    { id: "PET001", name: "Max", owner: "Smith Family", breed: "Golden Retriever", lastAppointment: "2024-11-15" },
    { id: "PET002", name: "Bella", owner: "Smith Family", breed: "Labrador", lastAppointment: "2024-11-20" },
    { id: "PET003", name: "Charlie", owner: "Johnson Household", breed: "Poodle", lastAppointment: "2024-11-10" },
    { id: "PET004", name: "Luna", owner: "Williams Pets", breed: "Beagle", lastAppointment: "2024-11-25" },
    { id: "PET005", name: "Cooper", owner: "Williams Pets", breed: "German Shepherd", lastAppointment: "2024-11-18" },
  ]

  const filteredPets = mockPets.filter(
    pet =>
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.owner.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Generate 7 days starting from currentWeekStart
  const getDaysOfWeek = () => {
    const days = []
    const start = new Date(currentWeekStart)
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const daysOfWeek = getDaysOfWeek()

  // Time slots for the calendar (9 AM to 5 PM)
  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
  ]

  // Mock availability data - in real app, this would come from API
  const getSlotAvailability = (day: Date, time: string): TimeSlot => {
    const isPast = day < new Date() && day.toDateString() !== new Date().toDateString()

    if (isPast) {
      return { time, availableGroomers: [], fullyBooked: true }
    }

    // Create a seeded random pattern based on day and time for consistent but varied results
    const dayOfWeek = day.getDay()
    const timeIndex = timeSlots.indexOf(time)
    const seed = (dayOfWeek * 31 + timeIndex * 17 + day.getDate() * 7) % 100

    let availableGroomers: string[] = []

    // More varied distribution of availability
    if (seed < 20) {
      // 20% fully booked
      availableGroomers = []
    } else if (seed < 40) {
      // 20% single groomer - vary which groomer
      const groomerIndex = (seed + dayOfWeek) % groomers.length
      availableGroomers = [groomers[groomerIndex]]
    } else if (seed < 65) {
      // 25% two groomers - vary the combination
      const start = seed % groomers.length
      availableGroomers = [groomers[start], groomers[(start + 1) % groomers.length]]
    } else if (seed < 85) {
      // 20% three groomers
      const start = seed % groomers.length
      availableGroomers = [
        groomers[start],
        groomers[(start + 1) % groomers.length],
        groomers[(start + 2) % groomers.length]
      ]
    } else {
      // 15% four or five groomers
      const count = seed % 2 === 0 ? 4 : 5
      availableGroomers = groomers.slice(0, count)
    }

    // If specific groomers are selected for filtering, only show those
    const filteredGroomers = selectedGroomers.length > 0
      ? availableGroomers.filter(g => selectedGroomers.includes(g))
      : availableGroomers

    return {
      time,
      availableGroomers: filteredGroomers,
      fullyBooked: filteredGroomers.length === 0
    }
  }

  const toggleGroomer = (groomer: string) => {
    setSelectedGroomers(prev =>
      prev.includes(groomer)
        ? prev.filter(g => g !== groomer)
        : [...prev, groomer]
    )
  }

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeekStart(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeekStart(newDate)
  }

  const handleSelectPet = (pet: Pet) => {
    setSelectedPet(pet)
    // Set current week to start from today (or 6 weeks after last appointment if in future)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (pet.lastAppointment) {
      const lastAppt = new Date(pet.lastAppointment)
      lastAppt.setDate(lastAppt.getDate() + 42) // 6 weeks = 42 days

      // Use the later of today or 6 weeks after appointment
      if (lastAppt > today) {
        setCurrentWeekStart(lastAppt)
      } else {
        setCurrentWeekStart(today)
      }
    } else {
      setCurrentWeekStart(today)
    }
  }

  const handleBookSlot = (day: Date, slot: TimeSlot, groomer: string) => {
    const dateStr = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    alert(`Booking ${selectedPet?.name} with ${groomer} on ${dateStr} at ${slot.time}`)
  }

  const formatWeekRange = () => {
    const end = new Date(currentWeekStart)
    end.setDate(end.getDate() + 6)
    return `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw]! w-[90vw]! max-h-[90vh]! h-[90vh]! p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b">
            <h2 className="text-base font-semibold">Book Appointment</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {!selectedPet ? (
              /* Pet Search Mode */
              <div className="p-4 h-full overflow-auto">
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet-search">Search for a pet</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="pet-search"
                        placeholder="Search by pet name or owner..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredPets.map((pet) => (
                      <div
                        key={pet.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleSelectPet(pet)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Dog className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{pet.name}</p>
                            <p className="text-sm text-muted-foreground">{pet.owner}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{pet.breed}</p>
                          {pet.lastAppointment && (
                            <p className="text-xs text-muted-foreground">
                              Last: {new Date(pet.lastAppointment).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredPets.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        No pets found matching your search
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Calendar View Mode */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 pb-0 space-y-3 shrink-0">
                  {/* Selected Pet Header */}
                  <div className="flex items-center justify-between">
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPet(null)
                        setSearchQuery("")
                      }}
                    >
                      Change Pet
                    </Button>
                  </div>

                  {/* Groomer Filter Buttons */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Filter by Groomer</Label>
                    <div className="flex flex-wrap gap-2">
                      {groomers.map((groomer) => {
                        const isSelected = selectedGroomers.includes(groomer)
                        return (
                          <Button
                            key={groomer}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleGroomer(groomer)}
                            className="transition-all"
                          >
                            {groomer}
                          </Button>
                        )
                      })}
                    </div>
                    {selectedGroomers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Showing availability for {selectedGroomers.length} groomer{selectedGroomers.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Week Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousWeek}
                      className="h-10 w-10"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h3 className="text-lg font-semibold">{formatWeekRange()}</h3>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextWeek}
                      className="h-10 w-10"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid - Google Calendar Style */}
                <div className="flex-1 min-h-0 p-4 pt-1">
                  <div className="border rounded-lg overflow-hidden h-full flex flex-col">
                  {/* Header Row with Days */}
                  <div className="grid grid-cols-8 border-b bg-muted/50 sticky top-0 z-10">
                    {/* Empty cell for time column */}
                    <div className="border-r"></div>
                    {/* Day headers */}
                    {daysOfWeek.map((day, dayIndex) => {
                      const isToday = day.toDateString() === new Date().toDateString()
                      return (
                        <div key={dayIndex} className="text-center py-2 border-r last:border-r-0 flex items-center justify-center gap-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                              isToday
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {day.getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Time slots as rows - Scrollable */}
                  <div className="overflow-y-auto flex-1">
                  {timeSlots.map((time, timeIndex) => (
                    <div key={timeIndex} className="grid grid-cols-8 border-b last:border-b-0">
                      {/* Time label */}
                      <div className="border-r py-2 px-2 text-xs text-muted-foreground font-medium flex items-start justify-end">
                        {time}
                      </div>
                      {/* Day cells */}
                      {daysOfWeek.map((day, dayIndex) => {
                        const slot = getSlotAvailability(day, time)
                        const isToday = day.toDateString() === new Date().toDateString()
                        const isPast = day < new Date() && !isToday
                        const hasAvailability = slot.availableGroomers.length > 0

                        return (
                          <div
                            key={dayIndex}
                            className="border-r last:border-r-0 p-1"
                          >
                            {slot.fullyBooked || isPast ? (
                              // Fully booked or past slot - not clickable
                              <div className="w-full h-full min-h-[50px] rounded-md bg-gray-200 text-gray-600 flex items-center justify-center">
                                {slot.fullyBooked && !isPast && (
                                  <div className="text-xs font-semibold">Full</div>
                                )}
                              </div>
                            ) : slot.availableGroomers.length === 1 ? (
                              // Single groomer available - click to book
                              <button
                                onClick={() => handleBookSlot(day, slot, slot.availableGroomers[0])}
                                className="w-full h-full min-h-[50px] rounded-md text-sm font-medium transition-colors bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 cursor-pointer"
                              >
                                <div className="text-xs px-2 py-1 truncate font-semibold">
                                  {slot.availableGroomers[0].split(' ')[0]}
                                </div>
                              </button>
                            ) : (
                              // Multiple groomers available - show count
                              <button
                                onClick={() => handleBookSlot(day, slot, slot.availableGroomers[0])}
                                className="w-full h-full min-h-[50px] rounded-md text-sm font-medium transition-colors bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300 cursor-pointer flex flex-col items-center justify-center gap-0.5"
                              >
                                <div className="text-xs font-bold">
                                  {slot.availableGroomers.length} available
                                </div>
                                <div className="text-[10px] font-medium truncate max-w-full px-1">
                                  {slot.availableGroomers.map(g => g.split(' ')[0]).join(', ')}
                                </div>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
