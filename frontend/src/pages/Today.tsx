import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { AppLayout } from "@/components/app-layout"
import { Separator } from "@/components/ui/separator"
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
import { orderService } from "@/services/orderService"
import { integrationService } from "@/services/integrationService"
import type { AppointmentStatusResponse, DailyAppointmentItem } from "@/services/appointmentService"
import type { AppointmentStatus as BackendAppointmentStatus } from "@/components/AppointmentCard"
import type { Order, PaymentStatusResponse } from "@/types/order"
import type { PaymentDevice } from "@/types/integration"
import { toast } from "sonner"


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
  const [checkoutAppointment, setCheckoutAppointment] = useState<Appointment | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null)

  // Payment processing state
  const [order, setOrder] = useState<Order | null>(null)
  const [editedSubtotal, setEditedSubtotal] = useState<string>("")
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState<string>("")
  const [paymentDevices, setPaymentDevices] = useState<PaymentDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse | null>(null)
  const pollingIntervalRef = useRef<number | null>(null)

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
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
    amount: apt.service_price ? `$${apt.service_price.toFixed(2)}` : "$0.00",
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

  const handleStartWork = async () => {
    if (!selectedAppointment) return
    await handleStatusChange(selectedAppointment.id, "in_progress")
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

  const handleCheckout = async () => {
    if (!selectedAppointment) return

    setCheckoutAppointment(selectedAppointment)
    setSelectedAppointment(null)
    setShowCheckoutModal(true)
    setIsProcessingPayment(false)
    setPaymentStatus(null)

    try {
      // Load payment devices
      const devices = await integrationService.getDevices()
      setPaymentDevices(devices)

      // Auto-select first active device
      const activeDevice = devices.find(d => d.is_active)
      if (activeDevice) {
        setSelectedDeviceId(activeDevice.id)
      }

      // Check if order already exists for this appointment
      const existingOrder = await orderService.getAppointmentOrder(selectedAppointment.id)
      if (existingOrder) {
        setOrder(existingOrder)
        setEditedSubtotal(Number(existingOrder.subtotal).toFixed(2))

        // Load discount from existing order if present
        if (existingOrder.discount_type && existingOrder.discount_value) {
          setShowDiscount(true)
          // Convert backend "dollar" to frontend "fixed"
          const frontendDiscountType = existingOrder.discount_type === "dollar" ? "fixed" : "percentage"
          setDiscountType(frontendDiscountType as "percentage" | "fixed")
          setDiscountValue(existingOrder.discount_value.toString())
        }
      } else {
        // Create order from appointment
        const newOrder = await orderService.createFromAppointment({
          appointment_id: selectedAppointment.id,
          tax_rate: 0.08, // 8% tax rate - can be made configurable
        })
        setOrder(newOrder)
        setEditedSubtotal(Number(newOrder.subtotal).toFixed(2))
      }
    } catch (error) {
      console.error("Failed to prepare checkout:", error)
      toast.error("Failed to prepare checkout. Please try again.")
      setShowCheckoutModal(false)
      setCheckoutAppointment(null)
    }
  }

  const handleInitiatePayment = async () => {
    if (!order || !selectedDeviceId) {
      toast.error("Please select a payment device")
      return
    }

    setIsProcessingPayment(true)

    try {
      // STEP 1: Update order with discount if it has changed
      let updatedOrder = order

      // Convert frontend "fixed" to backend "dollar"
      const backendDiscountType = discountType === "fixed" ? "dollar" : "percentage"
      const currentDiscountValue = showDiscount && discountValue ? Number(discountValue) : null
      const currentDiscountType = showDiscount && discountValue ? backendDiscountType : null

      // Check if discount has changed from what's in the order
      const discountChanged = (
        order.discount_type !== currentDiscountType ||
        order.discount_value !== currentDiscountValue
      )

      if (discountChanged) {
        console.log("Discount changed, updating order...")
        updatedOrder = await orderService.updateOrderDiscount(
          order.id,
          currentDiscountType,
          currentDiscountValue
        )
        setOrder(updatedOrder)
        console.log("Updated order with discount:", updatedOrder)
      } else {
        console.log("Discount unchanged, skipping update")
      }

      // STEP 2: Initiate terminal checkout with updated order
      const paymentResponse = await orderService.createTerminalCheckout({
        order_id: updatedOrder.id,
        payment_device_id: selectedDeviceId,
      })

      setPaymentId(paymentResponse.payment_id)

      // Start polling for payment status
      const interval = setInterval(() => {
        pollPaymentStatus(paymentResponse.payment_id)
      }, 3000) // Poll every 3 seconds

      pollingIntervalRef.current = interval
    } catch (error) {
      console.error("Failed to initiate payment:", error)
      toast.error("Failed to start payment. Please try again.")
      setIsProcessingPayment(false)
    }
  }

  const pollPaymentStatus = async (pId: number) => {
    try {
      const status = await orderService.getPaymentStatus(pId)
      setPaymentStatus(status)

      // Check if payment is completed
      if (status.status === "completed") {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }

        // Extract tip amount if present
        const tipAmount = status.tip_money?.amount
          ? (status.tip_money.amount / 100).toFixed(2)
          : "0.00"

        toast.success(
          `Payment completed! ${tipAmount !== "0.00" ? `Tip: $${tipAmount}` : ""}`
        )

        // Update appointment status to completed
        await handleStatusChange(checkoutAppointment!.id, "completed")

        setIsProcessingPayment(false)

        // Auto-close modal after successful payment
        setTimeout(() => {
          handleCloseCheckoutModal()
        }, 1500)
      } else if (status.status === "failed" || status.status === "cancelled") {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }

        toast.error(`Payment ${status.status}`)
        setIsProcessingPayment(false)
      }
    } catch (error) {
      console.error("Failed to poll payment status:", error)
    }
  }

  const handleCancelPayment = async () => {
    if (!paymentId) return

    try {
      await orderService.cancelPayment(paymentId)

      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      toast.info("Payment cancelled")
      setIsProcessingPayment(false)
      setPaymentStatus(null)
    } catch (error) {
      console.error("Failed to cancel payment:", error)
      toast.error("Failed to cancel payment")
    }
  }

  const handleCloseCheckoutModal = () => {
    // Stop polling if active
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    setShowCheckoutModal(false)
    setCheckoutAppointment(null)
    setOrder(null)
    setPaymentDevices([])
    setSelectedDeviceId(null)
    setIsProcessingPayment(false)
    setPaymentId(null)
    setPaymentStatus(null)
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
          <Button onClick={handleStartWork} className="w-full sm:w-auto">
            Start Work
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
      <AppLayout>
        <div className="flex items-center justify-center h-full flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full flex-1 gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <header className="flex h-12 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 w-full">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 flex-1">
            {columns
              .filter(column => column.status !== "no_show" && column.status !== "cancelled")
              .map((column) => {
              const columnAppointments = appointments.filter(a => a.status === column.status)
              return (
                <div key={column.status} className="flex flex-col gap-3">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                    <h3 className="font-semibold text-sm whitespace-nowrap">{column.displayText}</h3>
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
            {selectedAppointment?.status !== "in_progress" && selectedAppointment?.status !== "ready_for_pickup" && selectedAppointment?.status !== "completed" && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                className="sm:mr-auto"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            {selectedAppointment?.status !== "in_progress" && selectedAppointment?.status !== "ready_for_pickup" && (
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Process payment for {checkoutAppointment?.petName}
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

            {/* Order Details - Cart Style */}
            {order && (
              <div className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Services</h3>
                  <div className="space-y-2">
                    {/* Service Line Item */}
                    <div className="flex justify-between items-start p-3 bg-muted/30 rounded-md">
                      <div className="flex-1">
                        <p className="font-medium">{checkoutAppointment?.service}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {checkoutAppointment?.groomer}
                        </p>
                      </div>
                      {!isProcessingPayment ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editedSubtotal}
                          onChange={(e) => setEditedSubtotal(e.target.value)}
                          className="w-24 text-right"
                        />
                      ) : (
                        <span className="font-medium">${editedSubtotal}</span>
                      )}
                    </div>
                  </div>

                  {/* Add Discount Button/Form */}
                  {!isProcessingPayment && (
                    <div className="pt-2">
                      {!showDiscount ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDiscount(true)}
                        >
                          + Add Discount
                        </Button>
                      ) : (
                        <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/20">
                          <span className="text-sm font-medium whitespace-nowrap">Discount:</span>

                          {/* Toggle between % and $ */}
                          <div className="flex rounded-md border border-input overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setDiscountType("percentage")}
                              className={`px-3 py-1 text-sm font-medium transition-colors ${
                                discountType === "percentage"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background hover:bg-muted"
                              }`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiscountType("fixed")}
                              className={`px-3 py-1 text-sm font-medium transition-colors ${
                                discountType === "fixed"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background hover:bg-muted"
                              }`}
                            >
                              $
                            </button>
                          </div>

                          {/* Discount Input */}
                          <Input
                            id="discount-value"
                            type="number"
                            step={discountType === "percentage" ? "1" : "0.01"}
                            min="0"
                            max={discountType === "percentage" ? "100" : undefined}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder={discountType === "percentage" ? "0" : "0.00"}
                            className="w-24"
                          />

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowDiscount(false)
                              setDiscountValue("")
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${editedSubtotal}</span>
                  </div>

                  {/* Discount Line */}
                  {discountValue && Number(discountValue) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        Discount {discountType === "percentage" ? `(${discountValue}%)` : ""}:
                      </span>
                      <span>
                        -${discountType === "percentage"
                          ? (Number(editedSubtotal) * Number(discountValue) / 100).toFixed(2)
                          : Number(discountValue).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (8%):</span>
                    <span className="font-medium">
                      ${(() => {
                        const subtotal = Number(editedSubtotal)
                        const discount = discountType === "percentage"
                          ? subtotal * Number(discountValue || 0) / 100
                          : Number(discountValue || 0)
                        const afterDiscount = Math.max(0, subtotal - discount)
                        return (afterDiscount * 0.08).toFixed(2)
                      })()}
                    </span>
                  </div>

                  {paymentStatus?.tip_money?.amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tip:</span>
                      <span className="font-medium text-green-600">
                        ${(paymentStatus.tip_money.amount / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold">
                      ${paymentStatus?.total_money?.amount
                        ? (paymentStatus.total_money.amount / 100).toFixed(2)
                        : (() => {
                            const subtotal = Number(editedSubtotal)
                            const discount = discountType === "percentage"
                              ? subtotal * Number(discountValue || 0) / 100
                              : Number(discountValue || 0)
                            const afterDiscount = Math.max(0, subtotal - discount)
                            return (afterDiscount * 1.08).toFixed(2)
                          })()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Device Selection */}
            {!isProcessingPayment && paymentDevices.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="device" className="text-sm font-medium">Payment Device</Label>
                <select
                  id="device"
                  value={selectedDeviceId || ""}
                  onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a device...</option>
                  {paymentDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.device_name} {!device.is_active && "(Inactive)"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Processing Status */}
            {isProcessingPayment && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div className="text-sm">
                    {!paymentStatus ? (
                      <span>Initiating payment on terminal...</span>
                    ) : paymentStatus.square_status === "PENDING" ? (
                      <span>Waiting for customer on terminal...</span>
                    ) : paymentStatus.square_status === "IN_PROGRESS" ? (
                      <span>Processing payment...</span>
                    ) : (
                      <span>Finalizing payment...</span>
                    )}
                  </div>
                </div>

                {paymentStatus?.square_status && (
                  <div className="text-xs text-center text-muted-foreground">
                    Status: {paymentStatus.square_status}
                  </div>
                )}
              </div>
            )}

            {/* Payment Success */}
            {paymentStatus?.status === "completed" && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="text-sm font-medium text-green-600">
                    Payment completed successfully!
                  </div>
                </div>

                {paymentStatus.receipt_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(paymentStatus.receipt_url!, "_blank")}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Receipt
                  </Button>
                )}
              </div>
            )}

            {/* Payment Failed */}
            {(paymentStatus?.status === "failed" || paymentStatus?.status === "cancelled") && (
              <div className="flex items-center justify-center gap-3 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
                <div className="text-sm font-medium text-red-600">
                  Payment {paymentStatus.status}
                </div>
              </div>
            )}

            {/* No Devices Warning */}
            {!isProcessingPayment && paymentDevices.length === 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div className="text-sm text-amber-600">
                  No payment devices available. Please pair a device first.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {paymentStatus?.status === "completed" ? (
              <Button onClick={handleCloseCheckoutModal} className="w-full">
                Close
              </Button>
            ) : isProcessingPayment ? (
              <Button variant="outline" onClick={handleCancelPayment} className="w-full">
                Cancel Payment
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Button variant="outline" onClick={handleCloseCheckoutModal} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiatePayment}
                  disabled={!selectedDeviceId || !order}
                  className="flex-[2] h-12 text-lg font-semibold"
                  size="lg"
                >
                  Charge Now
                </Button>
              </div>
            )}
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
    </AppLayout>
  )
}
