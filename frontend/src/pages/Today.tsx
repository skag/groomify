import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { Plus, Clock, Dog, User, Calendar, X, ExternalLink, CheckCircle2, XCircle, AlertCircle, LayoutGrid, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AppointmentsCalendar } from "@/components/AppointmentsCalendar"

type AppointmentStatus = "scheduled" | "checked-in" | "in-process" | "ready-for-pickup" | "checked-out"
type ViewMode = "kanban" | "calendar"

interface Appointment {
  id: number
  time: string
  endTime?: string
  petName: string
  owner: string
  service: string
  groomer: string
  status: AppointmentStatus
  amount: string
  petId: string
  rabiesVaccination: {
    exists: boolean
    valid: boolean
  }
  notes: string
  tags?: string[]
}

export default function Today() {
  const navigate = useNavigate()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [appointmentNotes, setAppointmentNotes] = useState("")
  const [editedStartTime, setEditedStartTime] = useState("")
  const [editedEndTime, setEditedEndTime] = useState("")
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutAmount, setCheckoutAmount] = useState("")
  const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("kanban")

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      'FRE': 'bg-orange-500 text-white hover:bg-orange-600',
      'NOF': 'bg-pink-500 text-white hover:bg-pink-600',
      'NoK': 'bg-purple-500 text-white hover:bg-purple-600',
      'KDR': 'bg-blue-500 text-white hover:bg-blue-600',
      'Jmp': 'bg-red-500 text-white hover:bg-red-600',
      'KEN': 'bg-red-600 text-white hover:bg-red-700',
      'ESC': 'bg-red-700 text-white hover:bg-red-800',
    }
    return colors[tag] || 'bg-gray-500 text-white hover:bg-gray-600'
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setAppointmentNotes(appointment.notes)
    setEditedStartTime(appointment.time)
    setEditedEndTime(appointment.endTime || "")
  }

  const handleCloseModal = () => {
    setSelectedAppointment(null)
    setAppointmentNotes("")
    setEditedStartTime("")
    setEditedEndTime("")
  }

  const handleTimeUpdate = () => {
    if (selectedAppointment && editedStartTime && editedEndTime) {
      setAppointments(appointments.map(apt =>
        apt.id === selectedAppointment.id
          ? { ...apt, time: editedStartTime, endTime: editedEndTime }
          : apt
      ))
      setSelectedAppointment({ ...selectedAppointment, time: editedStartTime, endTime: editedEndTime })
    }
  }

  const handleCheckIn = () => {
    alert(`Checking in ${selectedAppointment?.petName}`)
    handleCloseModal()
  }

  const handleReschedule = () => {
    alert(`Rescheduling appointment for ${selectedAppointment?.petName}`)
  }

  const handleBookNext = () => {
    handleCloseModal()
    navigate('/appointments/book')
  }

  const handleCancel = () => {
    alert(`Cancelling appointment for ${selectedAppointment?.petName}`)
    handleCloseModal()
  }

  const handleViewPetDetails = () => {
    alert(`Viewing details for ${selectedAppointment?.petName} (ID: ${selectedAppointment?.petId})`)
  }

  const handleCheckout = () => {
    // Save the appointment for checkout
    setCheckoutAppointment(selectedAppointment)
    // Pre-fill the checkout amount with the appointment amount
    if (selectedAppointment?.amount) {
      setCheckoutAmount(selectedAppointment.amount.replace('$', ''))
    }
    // Close the appointment details modal first
    setSelectedAppointment(null)
    // Then open the checkout modal
    setShowCheckoutModal(true)
  }

  const handleChargeNow = () => {
    alert(`Charging $${checkoutAmount} for ${checkoutAppointment?.petName}`)
    setShowCheckoutModal(false)
    setCheckoutAppointment(null)
    setCheckoutAmount("")
  }

  const handleCloseCheckoutModal = () => {
    setShowCheckoutModal(false)
    setCheckoutAppointment(null)
    setCheckoutAmount("")
  }

  const groomers = ["Sarah Johnson", "Mike Chen", "Emily Rodriguez", "James Wilson", "Lisa Parker"]

  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 1,
      time: "9:00 AM",
      endTime: "10:30 AM",
      petName: "Max",
      owner: "Smith Family",
      service: "Full Grooming",
      groomer: "Sarah Johnson",
      status: "checked-out",
      amount: "$65",
      petId: "PET001",
      rabiesVaccination: { exists: true, valid: true },
      notes: "Completed grooming session. Customer satisfied.",
      tags: ["FRE", "KDR"]
    },
    {
      id: 9,
      time: "12:00 PM",
      endTime: "2:00 PM",
      petName: "Rocky",
      owner: "Brown Family",
      service: "Full Grooming",
      groomer: "Sarah Johnson",
      status: "ready-for-pickup",
      amount: "$68",
      petId: "PET009",
      rabiesVaccination: { exists: true, valid: true },
      notes: "Grooming completed. Ready for owner to pick up.",
      tags: ["FRE"]
    },
    {
      id: 2,
      time: "10:00 AM",
      endTime: "11:15 AM",
      petName: "Bella",
      owner: "Smith Family",
      service: "Bath & Brush",
      groomer: "Mike Chen",
      status: "in-process",
      amount: "$45",
      petId: "PET002",
      rabiesVaccination: { exists: true, valid: true },
      notes: "Currently being groomed. Going well.",
      tags: ["NOF"]
    },
    {
      id: 3,
      time: "11:00 AM",
      endTime: "12:30 PM",
      petName: "Charlie",
      owner: "Johnson Household",
      service: "Full Grooming",
      groomer: "Sarah Johnson",
      status: "checked-in",
      amount: "$70",
      petId: "PET003",
      rabiesVaccination: { exists: true, valid: false },
      notes: "Needs nail trim. Rabies vaccine expired.",
      tags: ["KEN", "ESC"]
    },
    {
      id: 4,
      time: "1:00 PM",
      endTime: "2:00 PM",
      petName: "Luna",
      owner: "Williams Pets",
      service: "Nail Trim",
      groomer: "Emily Rodriguez",
      status: "scheduled",
      amount: "$25",
      petId: "PET004",
      rabiesVaccination: { exists: false, valid: false },
      notes: "",
      tags: ["NoK"]
    },
    {
      id: 5,
      time: "2:00 PM",
      endTime: "3:30 PM",
      petName: "Cooper",
      owner: "Williams Pets",
      service: "Full Grooming",
      groomer: "Mike Chen",
      status: "scheduled",
      amount: "$75",
      petId: "PET005",
      rabiesVaccination: { exists: true, valid: true },
      notes: "Regular customer. Prefers shorter cut.",
      tags: ["FRE"]
    },
    {
      id: 6,
      time: "3:00 PM",
      endTime: "4:15 PM",
      petName: "Daisy",
      owner: "Williams Pets",
      service: "Bath & Brush",
      groomer: "Sarah Johnson",
      status: "scheduled",
      amount: "$45",
      petId: "PET006",
      rabiesVaccination: { exists: true, valid: true },
      notes: "",
      tags: ["Jmp", "NOF"]
    },
    {
      id: 7,
      time: "4:00 PM",
      endTime: "5:30 PM",
      petName: "Milo",
      owner: "Davis Residence",
      service: "Full Grooming",
      groomer: "Emily Rodriguez",
      status: "scheduled",
      amount: "$55",
      petId: "PET007",
      rabiesVaccination: { exists: true, valid: true },
      notes: "Sensitive skin. Use hypoallergenic shampoo.",
      tags: ["FRE", "KDR"]
    },
    {
      id: 8,
      time: "5:00 PM",
      endTime: "6:15 PM",
      petName: "Sadie",
      owner: "Davis Residence",
      service: "Bath & Brush",
      groomer: "Mike Chen",
      status: "scheduled",
      amount: "$45",
      petId: "PET008",
      rabiesVaccination: { exists: true, valid: true },
      notes: "",
      tags: ["NoK"]
    },
  ])

  const columns: { status: AppointmentStatus; title: string; count: number }[] = [
    { status: "scheduled", title: "Scheduled", count: appointments.filter(a => a.status === "scheduled").length },
    { status: "checked-in", title: "Checked In", count: appointments.filter(a => a.status === "checked-in").length },
    { status: "in-process", title: "In Process", count: appointments.filter(a => a.status === "in-process").length },
    { status: "ready-for-pickup", title: "Ready for Pickup", count: appointments.filter(a => a.status === "ready-for-pickup").length },
    { status: "checked-out", title: "Checked Out", count: appointments.filter(a => a.status === "checked-out").length },
  ]

  const handleBookAppointment = () => {
    navigate('/appointments/book')
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
                  <BreadcrumbPage>Today</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button onClick={handleBookAppointment} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Book Appointment
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6 pt-0">
          {/* Date Header and View Selector */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold tracking-tight">{todayDate}</h1>
              <p className="text-sm text-muted-foreground">
                {appointments.length} appointments today
              </p>
            </div>

            {/* View Mode Selector */}
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Kanban Board */}
          {viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 flex-1">
            {columns.map((column) => (
              <div key={column.status} className="flex flex-col gap-3">
                {/* Column Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <Badge variant="secondary" className="rounded-full">
                    {column.count}
                  </Badge>
                </div>

                {/* Appointment Cards */}
                <div className="flex flex-col gap-2 min-h-[200px]">
                  {appointments
                    .filter(apt => apt.status === column.status)
                    .map((appointment) => (
                      <div
                        key={appointment.id}
                        className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleAppointmentClick(appointment)}
                      >
                        <div className="flex flex-col gap-3">
                          {/* Time */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{appointment.time}</span>
                          </div>

                          {/* Pet and Owner */}
                          <div className="flex items-start gap-2">
                            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                              <Dog className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">
                                {appointment.petName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {appointment.owner}
                              </p>
                            </div>
                          </div>

                          {/* Service */}
                          <p className="text-sm text-muted-foreground">
                            {appointment.service}
                          </p>

                          {/* Groomer */}
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{appointment.groomer}</span>
                          </div>

                          {/* Tags */}
                          {appointment.tags && appointment.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {appointment.tags.map((tag) => (
                                <div
                                  key={tag}
                                  className={`text-xs px-1.5 py-0.5 h-5 font-medium rounded-md flex items-center ${getTagColor(tag)}`}
                                >
                                  {tag}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Calendar View */}
          {viewMode === "calendar" && (
            <AppointmentsCalendar
              appointments={appointments.map(apt => ({
                id: apt.id,
                time: apt.time,
                endTime: apt.endTime || apt.time,
                petName: apt.petName,
                owner: apt.owner,
                service: apt.service,
                groomer: apt.groomer,
                tags: apt.tags,
                status: apt.status
              }))}
              groomers={groomers}
              onAppointmentClick={(appointment) => {
                const fullAppointment = appointments.find(a => a.id === appointment.id)
                if (fullAppointment) {
                  handleAppointmentClick(fullAppointment)
                }
              }}
              onSlotClick={(groomer, timeSlot) => {
                // Calculate end time (1 hour later)
                const parseTime = (timeStr: string) => {
                  const [time, period] = timeStr.split(' ')
                  let [hours, minutes] = time.split(':').map(Number)
                  if (period === 'PM' && hours !== 12) hours += 12
                  if (period === 'AM' && hours === 12) hours = 0
                  return hours * 60 + minutes
                }

                const formatTime = (minutes: number) => {
                  let hours = Math.floor(minutes / 60)
                  const mins = minutes % 60
                  const period = hours >= 12 ? 'PM' : 'AM'
                  if (hours > 12) hours -= 12
                  if (hours === 0) hours = 12
                  return `${hours}:${mins.toString().padStart(2, '0')} ${period}`
                }

                const startMinutes = parseTime(timeSlot)
                const endMinutes = startMinutes + 60
                const endTime = formatTime(endMinutes)

                // Create a new appointment
                const newAppointment: Appointment = {
                  id: Math.max(...appointments.map(a => a.id)) + 1,
                  time: timeSlot,
                  endTime: endTime,
                  petName: "New Appointment",
                  owner: "TBD",
                  service: "To be scheduled",
                  groomer: groomer,
                  status: "scheduled",
                  amount: "$0",
                  petId: "TBD",
                  rabiesVaccination: { exists: false, valid: false },
                  notes: "",
                  tags: []
                }

                setAppointments([...appointments, newAppointment])
              }}
            />
          )}
        </div>
      </SidebarInset>

      {/* Appointment Details Modal */}
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5" />
              <button
                onClick={handleViewPetDetails}
                className="hover:underline flex items-center gap-2"
              >
                {selectedAppointment?.petName}
                <ExternalLink className="h-4 w-4" />
              </button>
              <span className="text-sm font-normal text-muted-foreground">• {selectedAppointment?.owner}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Time Editing */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Appointment Time</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="start-time"
                  value={editedStartTime}
                  onChange={(e) => setEditedStartTime(e.target.value)}
                  onBlur={handleTimeUpdate}
                  placeholder="Start Time"
                  className="text-sm"
                />
                <Input
                  id="end-time"
                  value={editedEndTime}
                  onChange={(e) => setEditedEndTime(e.target.value)}
                  onBlur={handleTimeUpdate}
                  placeholder="End Time"
                  className="text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Appointment Details */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">{selectedAppointment?.service}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Groomer:</span>
                <span className="font-medium">{selectedAppointment?.groomer}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{selectedAppointment?.amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary">{selectedAppointment?.status}</Badge>
              </div>
            </div>

            <Separator />

            {/* Rabies Vaccination Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rabies Vaccination</Label>
              <div className="flex items-center gap-2">
                {selectedAppointment?.rabiesVaccination.exists ? (
                  selectedAppointment.rabiesVaccination.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Valid</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-600">Expired - Update Required</span>
                    </>
                  )
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">No Record</span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={appointmentNotes}
                onChange={(e) => setAppointmentNotes(e.target.value)}
                placeholder="Add notes about this appointment..."
                className="min-h-[80px]"
              />
            </div>

           
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={selectedAppointment?.status === "scheduled" ? handleReschedule : handleBookNext}
                className="flex-1"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedAppointment?.status === "scheduled" ? "Reschedule" : "Book Next"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
            {selectedAppointment?.status === "scheduled" && (
              <Button onClick={handleCheckIn} className="w-full sm:w-auto">
                Check In
              </Button>
            )}
            {selectedAppointment?.status === "ready-for-pickup" && (
              <Button onClick={handleCheckout} className="w-full sm:w-auto">
                Checkout
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={showCheckoutModal} onOpenChange={(open) => !open && handleCloseCheckoutModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Complete payment for {checkoutAppointment?.petName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Appointment Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pet:</span>
                <span className="font-medium">{checkoutAppointment?.petName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Owner:</span>
                <span className="font-medium">{checkoutAppointment?.owner}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium">{checkoutAppointment?.service}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Groomer:</span>
                <span className="font-medium">{checkoutAppointment?.groomer}</span>
              </div>
            </div>

            <Separator />

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={checkoutAmount}
                  onChange={(e) => setCheckoutAmount(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCheckoutModal}>
              Cancel
            </Button>
            <Button onClick={handleChargeNow}>
              Charge Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
