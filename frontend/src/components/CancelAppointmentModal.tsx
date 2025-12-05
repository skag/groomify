import { useState } from "react"
import { Dog, User, Clock, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface CancelAppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: {
    id: number
    petName: string
    owner: string
    groomer: string
    time: string
    endTime?: string
    service: string
  } | null
  onConfirmCancel: (appointmentId: number, chargeAmount: number | null) => void
}

export function CancelAppointmentModal({
  open,
  onOpenChange,
  appointment,
  onConfirmCancel,
}: CancelAppointmentModalProps) {
  const [cancellationFee, setCancellationFee] = useState("50")
  const [chargeCancellation, setChargeCancellation] = useState(true)

  const handleConfirmCancel = () => {
    if (!appointment) return
    const chargeAmount = chargeCancellation ? parseFloat(cancellationFee) || 0 : null
    onConfirmCancel(appointment.id, chargeAmount)
    onOpenChange(false)
  }

  if (!appointment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pet and Owner */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Dog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{appointment.petName}</p>
              <p className="text-sm text-muted-foreground">{appointment.owner}</p>
            </div>
          </div>

          <Separator />

          {/* Appointment Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Groomer:</span>
              <span className="font-medium">{appointment.groomer}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">
                {appointment.time}
                {appointment.endTime && ` - ${appointment.endTime}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Service:</span>
              <span className="font-medium">{appointment.service}</span>
            </div>
          </div>

          <Separator />

          {/* Cancellation Fee */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="charge-cancellation"
                checked={chargeCancellation}
                onCheckedChange={(checked) => setChargeCancellation(checked === true)}
              />
              <Label htmlFor="charge-cancellation" className="text-sm font-medium cursor-pointer">
                Charge Cancellation Fee
              </Label>
            </div>

            {chargeCancellation && (
              <div className="space-y-2">
                <Label htmlFor="cancellation-fee" className="text-sm text-muted-foreground">
                  Cancellation Fee Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="cancellation-fee"
                    type="number"
                    step="0.01"
                    value={cancellationFee}
                    onChange={(e) => setCancellationFee(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleConfirmCancel}>
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
