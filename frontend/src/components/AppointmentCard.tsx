import { Clock, Dog } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Status is a string that comes from the database - no fixed enum
export type AppointmentStatus = string

interface AppointmentCardProps {
  petName: string
  owner: string
  service: string
  time: string
  endTime: string
  tags?: string[]
  status?: AppointmentStatus
  onClick?: (e?: React.MouseEvent) => void
  style?: React.CSSProperties
  className?: string
}

const getTagColor = (tag: string) => {
  const colors: { [key: string]: string } = {
    'FRE': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'NOF': 'bg-red-100 text-red-800 border-red-300',
    'NoK': 'bg-orange-100 text-orange-800 border-orange-300',
    'KDR': 'bg-purple-100 text-purple-800 border-purple-300',
    'Jmp': 'bg-blue-100 text-blue-800 border-blue-300',
    'KEN': 'bg-green-100 text-green-800 border-green-300',
    'ESC': 'bg-pink-100 text-pink-800 border-pink-300'
  }
  return colors[tag] || 'bg-gray-100 text-gray-800 border-gray-300'
}

const getStatusColor = (status: AppointmentStatus): string => {
  const colors: Record<string, string> = {
    'scheduled': 'bg-gray-100 text-gray-800 border-gray-300',
    'checked_in': 'bg-blue-100 text-blue-800 border-blue-300',
    'in_progress': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'ready_for_pickup': 'bg-green-100 text-green-800 border-green-300',
    'completed': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'cancelled': 'bg-red-100 text-red-800 border-red-300',
    'no_show': 'bg-slate-100 text-slate-800 border-slate-300'
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
}

const getStatusLabel = (status: AppointmentStatus): string => {
  const labels: Record<string, string> = {
    'scheduled': 'Scheduled',
    'checked_in': 'Checked In',
    'in_progress': 'In Progress',
    'ready_for_pickup': 'Ready for Pickup',
    'completed': 'Done',
    'cancelled': 'Cancelled',
    'no_show': 'No Show'
  }
  // Return mapped label or format the status name as fallback
  return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function AppointmentCard({
  petName,
  owner,
  service,
  time,
  endTime,
  tags,
  status,
  onClick,
  style,
  className = ""
}: AppointmentCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border-2 border-blue-600 bg-blue-100 p-3 shadow-lg hover:shadow-xl transition-all cursor-pointer hover:bg-blue-200 ${className}`}
      style={style}
    >
      <div className="flex flex-col gap-2 relative">
        {/* Status Badge - Top Right */}
        {status && (
          <div className="absolute -top-1 -right-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(status)}`}>
              {getStatusLabel(status)}
            </span>
          </div>
        )}
        {/* Time Range */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <Clock className="h-3 w-3 text-primary" />
          <span className="text-primary">
            {time} - {endTime}
          </span>
        </div>

        {/* Pet and Owner with Tags */}
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <Dog className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm truncate">
                {petName}
              </p>
              {/* Tags next to pet name */}
              {tags && tags.length > 0 && (
                <>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium border ${getTagColor(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {owner}
            </p>
          </div>
        </div>

        {/* Service */}
        <p className="text-xs text-muted-foreground truncate">
          {service}
        </p>
      </div>
    </div>
  )
}
