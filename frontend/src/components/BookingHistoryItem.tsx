import { useState } from "react"
import { BookingHistory } from "@/types/customerDetail"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { format } from "date-fns"

interface BookingHistoryItemProps {
  booking: BookingHistory
}

export function BookingHistoryItem({ booking }: BookingHistoryItemProps) {
  const [showNote, setShowNote] = useState(false)

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours} hr ${mins} mins`
  }

  const totalServicePrice = booking.services.reduce(
    (sum, service) => sum + service.price,
    0
  )

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          {/* Left side - Date, Time, Services */}
          <div className="space-y-2 flex-1">
            <div className="flex items-baseline gap-4">
              <span className="text-lg font-semibold">
                {format(new Date(booking.date), "MM/dd/yy")}
              </span>
              <span className="text-base">
                {booking.startTime} - {booking.endTime} ({formatDuration(booking.durationMinutes)})
              </span>
              {booking.hasNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNote(!showNote)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showNote ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Hide note
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      See note
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="text-base">
              {booking.services.map((service, idx) => (
                <span key={idx}>
                  {service.name}
                  {idx < booking.services.length - 1 ? " + " : ""}
                </span>
              ))}
            </div>
            {showNote && booking.note && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                <p className="text-sm text-gray-700">{booking.note}</p>
              </div>
            )}
          </div>

          {/* Right side - Price */}
          <div className="text-right text-lg font-semibold whitespace-nowrap ml-4">
            ${totalServicePrice.toFixed(2)} + ${booking.tip}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
