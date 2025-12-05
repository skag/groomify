import { AppLayout } from "@/components/app-layout"
import { Calendar, Users, DollarSign, TrendingUp } from "lucide-react"

export default function DashboardHome() {
  const stats = [
    {
      title: "Total Appointments",
      value: "124",
      change: "+12%",
      icon: Calendar,
      trend: "up"
    },
    {
      title: "Active Clients",
      value: "89",
      change: "+8%",
      icon: Users,
      trend: "up"
    },
    {
      title: "Revenue",
      value: "$12,450",
      change: "+23%",
      icon: DollarSign,
      trend: "up"
    },
    {
      title: "Growth",
      value: "18%",
      change: "+5%",
      icon: TrendingUp,
      trend: "up"
    },
  ]

  return (
    <AppLayout>

      <div className="flex flex-1 flex-col gap-6 p-6 w-full">
          {/* Welcome Section */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your grooming business today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.title}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-green-600 font-medium">
                          {stat.change}
                        </span>{" "}
                        from last month
                      </p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Main Content Area */}
          <div className="grid gap-4 lg:grid-cols-7">
            {/* Recent Activity */}
            <div className="lg:col-span-4 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                  <p className="text-sm text-muted-foreground">
                    Your latest appointments and bookings
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Haircut & Styling</p>
                        <p className="text-sm text-muted-foreground">
                          Client Name • Today at 2:00 PM
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        $45.00
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-3 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Quick Actions</h2>
                  <p className="text-sm text-muted-foreground">
                    Common tasks and shortcuts
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent">
                    <p className="font-medium">New Appointment</p>
                    <p className="text-sm text-muted-foreground">
                      Schedule a new booking
                    </p>
                  </button>
                  <button className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent">
                    <p className="font-medium">Add Client</p>
                    <p className="text-sm text-muted-foreground">
                      Register a new client
                    </p>
                  </button>
                  <button className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent">
                    <p className="font-medium">View Schedule</p>
                    <p className="text-sm text-muted-foreground">
                      Check today's appointments
                    </p>
                  </button>
                  <button className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent">
                    <p className="font-medium">Reports</p>
                    <p className="text-sm text-muted-foreground">
                      View business analytics
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </AppLayout>
  )
}
