import { useState } from "react"
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
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { AppointmentsCalendar } from "@/components/AppointmentsCalendar"

interface Appointment {
  id: number
  time: string
  endTime: string
  petName: string
  owner: string
  service: string
  groomer: string
  tags?: string[]
}

export default function Appointments() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const todayDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const handlePreviousDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const appointments: Appointment[] = [
    {
      id: 1,
      time: "9:00 AM",
      endTime: "10:30 AM",
      petName: "Max",
      owner: "Smith Family",
      service: "Full Grooming",
      groomer: "Sarah Johnson",
      tags: ["FRE", "KDR"]
    },
    {
      id: 2,
      time: "10:00 AM",
      endTime: "11:15 AM",
      petName: "Bella",
      owner: "Smith Family",
      service: "Bath & Brush",
      groomer: "Mike Chen",
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
      tags: ["Jmp", "NoK"]
    },
    {
      id: 4,
      time: "1:00 PM",
      endTime: "2:15 PM",
      petName: "Luna",
      owner: "Williams Pets",
      service: "Full Grooming",
      groomer: "Emily Rodriguez",
      tags: ["KEN"]
    },
    {
      id: 5,
      time: "2:00 PM",
      endTime: "3:30 PM",
      petName: "Cooper",
      owner: "Williams Pets",
      service: "Full Grooming",
      groomer: "Mike Chen",
      tags: ["ESC", "FRE"]
    },
    {
      id: 6,
      time: "3:00 PM",
      endTime: "4:15 PM",
      petName: "Daisy",
      owner: "Williams Pets",
      service: "Bath & Brush",
      groomer: "Sarah Johnson",
      tags: ["NOF", "KDR"]
    },
    {
      id: 7,
      time: "4:00 PM",
      endTime: "5:30 PM",
      petName: "Milo",
      owner: "Davis Residence",
      service: "Full Grooming",
      groomer: "Emily Rodriguez",
      tags: ["Jmp"]
    },
    {
      id: 8,
      time: "5:00 PM",
      endTime: "6:15 PM",
      petName: "Sadie",
      owner: "Davis Residence",
      service: "Bath & Brush",
      groomer: "Mike Chen",
      tags: ["KEN", "NoK"]
    },
    {
      id: 9,
      time: "10:00 AM",
      endTime: "11:30 AM",
      petName: "Rocky",
      owner: "Brown Family",
      service: "Full Grooming",
      groomer: "Emily Rodriguez",
      tags: ["FRE"]
    },
    {
      id: 10,
      time: "9:00 AM",
      endTime: "10:15 AM",
      petName: "Buddy",
      owner: "Martinez Family",
      service: "Bath & Brush",
      groomer: "James Wilson",
      tags: ["ESC"]
    },
    {
      id: 11,
      time: "11:00 AM",
      endTime: "12:30 PM",
      petName: "Coco",
      owner: "Anderson Household",
      service: "Full Grooming",
      groomer: "James Wilson",
      tags: ["KDR", "NOF"]
    },
    {
      id: 12,
      time: "2:00 PM",
      endTime: "3:15 PM",
      petName: "Oscar",
      owner: "Lee Residence",
      service: "Bath & Brush",
      groomer: "James Wilson",
      tags: ["Jmp", "FRE"]
    },
    {
      id: 13,
      time: "9:00 AM",
      endTime: "10:30 AM",
      petName: "Zoe",
      owner: "Thompson Family",
      service: "Full Grooming",
      groomer: "Lisa Parker",
      tags: ["NoK"]
    },
    {
      id: 14,
      time: "11:00 AM",
      endTime: "12:15 PM",
      petName: "Tucker",
      owner: "Garcia Pets",
      service: "Bath & Brush",
      groomer: "Lisa Parker",
      tags: ["KEN", "ESC"]
    },
    {
      id: 15,
      time: "1:00 PM",
      endTime: "2:30 PM",
      petName: "Bailey",
      owner: "Clark Household",
      service: "Full Grooming",
      groomer: "Lisa Parker",
      tags: ["FRE", "KDR"]
    },
    {
      id: 16,
      time: "12:15 PM",
      endTime: "1:30 PM",
      petName: "Oliver",
      owner: "Martinez Household",
      service: "Quick Trim",
      groomer: "Sarah Johnson",
      tags: ["NoK"]
    },
  ]

  const groomers = ["Sarah Johnson", "Mike Chen", "Emily Rodriguez", "James Wilson", "Lisa Parker"]

  const handleBookAppointment = () => {
    alert('Book appointment functionality would go here')
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    alert(`Clicked on ${appointment.petName} - ${appointment.service}`)
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
                  <BreadcrumbPage>Appointments</BreadcrumbPage>
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
          {/* Date Header with Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousDay}
                  className="h-10 w-10 shrink-0"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="flex flex-col gap-1 min-w-[400px]">
                  <h1 className="text-2xl font-bold tracking-tight">{todayDate}</h1>
                  <p className="text-sm text-muted-foreground">
                    {appointments.length} appointments scheduled
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextDay}
                  className="h-10 w-10 shrink-0"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
            >
              Today
            </Button>
          </div>

          {/* Calendar Grid */}
          <AppointmentsCalendar
            appointments={appointments}
            groomers={groomers}
            onAppointmentClick={handleAppointmentClick}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
