"use client"

import * as React from "react"
import {
  Users,
  UserCircle,
  FileText,
  Bell,
  Plug,
  ArrowLeft,
  Scissors,
  Dog,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

// Settings sidebar data
const data = {
  user: {
    name: "John Doe",
    email: "john@groomify.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Account",
      url: "/settings/account",
      icon: UserCircle,
      isActive: true,
      items: [],
    },
    {
      title: "Staff",
      url: "/settings/staff",
      icon: Users,
      items: [],
    },
    {
      title: "Groomers",
      url: "/settings/groomers",
      icon: Dog,
      items: [],
    },
    {
      title: "Services",
      url: "/settings/services",
      icon: Scissors,
      items: [],
    },
    {
      title: "Agreements",
      url: "/settings/agreements",
      icon: FileText,
      items: [],
    },
    {
      title: "Auto Reminders",
      url: "/settings/reminders",
      icon: Bell,
      items: [],
    },
    {
      title: "Integrations",
      url: "/settings/integrations",
      icon: Plug,
      items: [],
    },
  ],
}

export function SettingsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/today')}
            className="w-full justify-start"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
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
