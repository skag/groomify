import { useState, useEffect } from "react"
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
import { Plus, Clock, Dog, User, Calendar, X, ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
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
import { CancelAppointmentModal } from "@/components/CancelAppointmentModal"
import { appointmentService } from "@/services/appointmentService"
import type { AppointmentStatusResponse, DailyAppointmentItem } from "@/services/appointmentService"
import type { AppointmentStatus as BackendAppointmentStatus } from "@/components/AppointmentCard"


// Internal appointment type for Today page
interface Appointment {
  id: number
  time: string
  endTime?: string
  petId: number
  petName: string
  owner: string
  service: string
  serviceId: number | null
  groomer: string
  groomerId: number
  status: BackendAppointmentStatus
  amount: string
  rabiesVaccination: {
    exists: boolean
    valid: boolean
  }
  notes: string
  tags?: string[]
}

// Status column configuration from backend
interface KanbanColumn {
  status: BackendAppointmentStatus
  displayText: string
  order: number
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
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null)

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch statuses and daily appointments in parallel
        const [statusesData, dailyData] = await Promise.all([
          appointmentService.getStatuses(),
          appointmentService.getDailyAppointments(new Date()),
        ])

        // Build columns from statuses - show all statuses from API
        const kanbanColumns: KanbanColumn[] = statusesData
          .sort((a: AppointmentStatusResponse, b: AppointmentStatusResponse) => a.order - b.order)
          .map((s: AppointmentStatusResponse) => ({
            status: s.name as BackendAppointmentStatus,
            displayText: s.display_text,
            order: s.order,
          }))
        setColumns(kanbanColumns)

        // Transform daily appointments to internal format
        const allAppointments: Appointment[] = []
        for (const groomer of dailyData.groomers) {
          for (const apt of groomer.appointments) {
            allAppointments.push(transformAppointment(apt))
          }
        }
        setAppointments(allAppointments)
      } catch (err) {
        console.error("Failed to fetch data:", err)
        setError("Failed to load appointments. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Transform backend appointment to internal format
  const transformAppointment = (apt: DailyAppointmentItem): Appointment => ({
    id: apt.id,
    time: apt.time,
    endTime: apt.end_time,
    petId: apt.pet_id,
    petName: apt.pet_name,
    owner: apt.owner,
    service: apt.service,
    serviceId: apt.service_id,
    groomer: apt.groomer,
    groomerId: apt.groomer_id,
    status: apt.status || "scheduled",
    amount: "$0", // Placeholder until transactions are implemented
    rabiesVaccination: { exists: false, valid: false }, // Placeholder until pet records are enhanced
    notes: apt.notes || "",
    tags: apt.tags,
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

  const handleStatusChange = async (appointmentId: number, newStatus: BackendAppointmentStatus) => {
    // Optimistic update
    const oldAppointments = [...appointments]
    setAppointments(appointments.map(apt =>
      apt.id === appointmentId ? { ...apt, status: newStatus } : apt
    ))

    try {
      await appointmentService.updateAppointment(appointmentId, { status: newStatus })
    } catch (err) {
      console.error("Failed to update status:", err)
      // Revert on error
      setAppointments(oldAppointments)
      alert("Failed to update appointment status. Please try again.")
    }
  }

  const handleCheckIn = async () => {
    if (!selectedAppointment) return
    await handleStatusChange(selectedAppointment.id, "checked_in")
    handleCloseModal()
  }

  const handleMarkReady = async () => {
    if (!selectedAppointment) return
    await handleStatusChange(selectedAppointment.id, "ready_for_pickup")
    handleCloseModal()
  }

  const handleReschedule = () => {
    if (selectedAppointment) {
      handleCloseModal()
      navigate(`/appointments?reschedule=${selectedAppointment.id}`)
    }
  }

  const handleBookNext = () => {
    if (selectedAppointment) {
      navigate(`/appointments?pet=${selectedAppointment.petId}`)
    }
    handleCloseModal()
  }

  const handleCancel = () => {
    if (!selectedAppointment) return
    setCancelAppointment(selectedAppointment)
    setSelectedAppointment(null)
    setShowCancelModal(true)
  }

  const handleConfirmCancel = async (appointmentId: number, chargeAmount: number | null) => {
    await handleStatusChange(appointmentId, "cancelled")
    // TODO: Handle chargeAmount when transaction system is implemented
    if (chargeAmount !== null) {
      console.log(`Cancellation fee of $${chargeAmount} to be charged`)
    }
    setShowCancelModal(false)
    setCancelAppointment(null)
  }

  const handleViewPetDetails = () => {
    if (selectedAppointment) {
      navigate(`/pets/${selectedAppointment.petId}`)
    }
  }

  const handleCheckout = () => {
    setCheckoutAppointment(selectedAppointment)
    if (selectedAppointment?.amount) {
      setCheckoutAmount(selectedAppointment.amount.replace('$', ''))
    }
    setSelectedAppointment(null)
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

  const handleBookAppointment = () => {
    navigate('/appointments/book')
  }

  const handleSaveNotes = async () => {
    if (!selectedAppointment) return

    // Optimistic update
    const oldAppointments = [...appointments]
    setAppointments(appointments.map(apt =>
      apt.id === selectedAppointment.id ? { ...apt, notes: appointmentNotes } : apt
    ))
    setSelectedAppointment({ ...selectedAppointment, notes: appointmentNotes })

    try {
      await appointmentService.updateAppointment(selectedAppointment.id, { notes: appointmentNotes })
    } catch (err) {
      console.error("Failed to save notes:", err)
      // Revert on error
      setAppointments(oldAppointments)
      setSelectedAppointment({ ...selectedAppointment, notes: selectedAppointment.notes })
      alert("Failed to save notes. Please try again.")
    }
  }

  // Get display text for a status
  const getStatusDisplayText = (status: BackendAppointmentStatus): string => {
    const column = columns.find(c => c.status === status)
    return column?.displayText || status
  }

  // Determine which action button to show based on status
  const getActionButton = () => {
    if (!selectedAppointment) return null

    switch (selectedAppointment.status) {
      case "scheduled":
        return (
          <Button onClick={handleCheckIn} className="w-full sm:w-auto">
            Check In
          </Button>
        )
      case "checked_in":
        return (
          <Button onClick={handleMarkReady} className="w-full sm:w-auto">
            Ready for pick-up
          </Button>
        )
      case "in_progress":
        return (
          <Button onClick={handleMarkReady} className="w-full sm:w-auto">
            Mark Ready
          </Button>
        )
      case "ready_for_pickup":
        return (
          <Button onClick={handleCheckout} className="w-full sm:w-auto">
            Checkout
          </Button>
        )
      case "completed":
        // No action for completed appointments
        return null
      default:
        return null
    }
  }

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
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
          {/* Date Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{todayDate}</h1>
            <p className="text-sm text-muted-foreground">
              {appointments.length} appointments today
            </p>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
            {columns.map((column) => {
              const columnAppointments = appointments.filter(a => a.status === column.status)
              return (
                <div key={column.status} className="flex flex-col gap-3">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                    <h3 className="font-semibold text-sm">{column.displayText}</h3>
                    <Badge variant="secondary" className="rounded-full">
                      {columnAppointments.length}
                    </Badge>
                  </div>

                  {/* Appointment Cards */}
                  <div className="flex flex-col gap-2 min-h-[200px]">
                    {columnAppointments.map((appointment) => (
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
              )
            })}
          </div>
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
                <Badge variant="secondary">
                  {selectedAppointment && getStatusDisplayText(selectedAppointment.status)}
                </Badge>
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
              {appointmentNotes !== selectedAppointment?.notes && (
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  className="w-full"
                >
                  Save Notes
                </Button>
              )}
            </div>


          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedAppointment?.status !== "checked_in" && selectedAppointment?.status !== "ready_for_pickup" && selectedAppointment?.status !== "completed" && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                className="sm:mr-auto"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            {selectedAppointment?.status !== "checked_in" && selectedAppointment?.status !== "ready_for_pickup" && (
              <Button
                variant="outline"
                onClick={selectedAppointment?.status === "scheduled" ? handleReschedule : handleBookNext}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedAppointment?.status === "scheduled" ? "Reschedule" : "Book Next"}
              </Button>
            )}
            {getActionButton()}
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

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        appointment={cancelAppointment}
        onConfirmCancel={handleConfirmCancel}
      />
    </SidebarProvider>
  )
}
