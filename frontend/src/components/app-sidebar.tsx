"use client"

import * as React from "react"
import {
  Users,
  Calendar,
  Scissors,
  CalendarDays,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "John Doe",
    email: "john@groomify.com",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "Groomify",
      logo: Scissors,
      plan: "Pro",
    },
  ],
  navMain: [
    {
      title: "Today",
      url: "/today",
      icon: CalendarDays,
      isActive: true,
      items: [],
    },
    {
      title: "Appointments",
      url: "/appointments",
      icon: Calendar,
      items: [],
    },
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      items: [
        {
          title: "People",
          url: "/customers",
        },
        {
          title: "Pets",
          url: "/pets",
        },
      ],
    },
  ],
  projects: [],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
