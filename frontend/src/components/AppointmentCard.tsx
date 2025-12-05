import { Dog } from "lucide-react"

// Status is a string that comes from the database - no fixed enum
export type AppointmentStatus = string

interface AppointmentCardProps {
  petName: string
  owner: string
  service: string
  tags?: string[]
  status?: AppointmentStatus
  isConfirmed?: boolean
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

const getLeftBorderColor = (status?: AppointmentStatus, isConfirmed?: boolean): string => {
  // Cancelled -> red
  if (status === 'cancelled') {
    return 'border-l-red-500'
  }

  // Scheduled + unconfirmed -> grey
  if (status === 'scheduled' && !isConfirmed) {
    return 'border-l-gray-400'
  }

  // All other cases (confirmed scheduled, checked_in, in_progress, etc.) -> green
  return 'border-l-green-500'
}

export function AppointmentCard({
  petName,
  owner,
  service,
  tags,
  status,
  isConfirmed,
  onClick,
  style,
  className = ""
}: AppointmentCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-gray-300 border-l-4 ${getLeftBorderColor(status, isConfirmed)} bg-white p-3 shadow-lg hover:shadow-xl transition-all cursor-pointer ${className}`}
      style={style}
    >
      <div className="flex flex-col gap-1.5">
        {/* Header Row: Status Badge and Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {status && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(status)}`}>
              {getStatusLabel(status)}
            </span>
          )}
          {tags && tags.length > 0 && tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium border ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Pet Name and Owner */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <Dog className="h-3 w-3 text-primary" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-semibold text-sm truncate leading-tight">
              {petName}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
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
