import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Reminder {
  id: string
  name: string
  description: string
  type: string
  channel: string
  isEnabled: boolean
}

export default function RemindersSettings() {
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: "1",
      name: "Appointment booked",
      description: "Notify clients when a new appointment is booked",
      type: "Transactional",
      channel: "SMS & Email",
      isEnabled: true,
    },
    {
      id: "2",
      name: "Appointment rescheduled",
      description: "Notify clients when their appointments are rescheduled",
      type: "Transactional",
      channel: "SMS & Email",
      isEnabled: true,
    },
    {
      id: "3",
      name: "Appointment cancelled",
      description: "Notify clients when their appointments are cancelled",
      type: "Transactional",
      channel: "SMS & Email",
      isEnabled: true,
    },
    {
      id: "4",
      name: "Appointment moved to waitlist",
      description: "Notify clients when their appointments are moved to waitlist",
      type: "Transactional",
      channel: "SMS & Email",
      isEnabled: false,
    },
    {
      id: "5",
      name: "Appointment confirmed by client",
      description: "Send a message to clients automatically after they reply Y to an appointment reminder",
      type: "Automated Response",
      channel: "SMS",
      isEnabled: false,
    },
    {
      id: "6",
      name: "Appointment cancelled by client",
      description: "Send a message to clients automatically after they reply N to an appointment reminder",
      type: "Automated Response",
      channel: "SMS",
      isEnabled: false,
    },
    {
      id: "7",
      name: "Appointment ready for pickup",
      description: "Notify clients when an appointment is marked as ready",
      type: "Transactional",
      channel: "SMS & Email",
      isEnabled: true,
    },
  ])

  const handleToggleReminder = (id: string) => {
    setReminders(reminders.map(reminder =>
      reminder.id === id
        ? { ...reminder, isEnabled: !reminder.isEnabled }
        : reminder
    ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auto Reminders</h1>
        <p className="text-muted-foreground mt-2">
          Configure automatic reminder notifications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Settings</CardTitle>
          <CardDescription>
            Manage your automated reminder preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reminder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((reminder) => (
                <TableRow key={reminder.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{reminder.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {reminder.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{reminder.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{reminder.channel}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.isEnabled}
                        onCheckedChange={() => handleToggleReminder(reminder.id)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {reminder.isEnabled ? "On" : "Off"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
