import type { ColumnDef } from "@tanstack/react-table"
import { UserCircle, Dog } from "lucide-react"
import { statuses } from "@/data/statuses"
import type { Customer } from "@/types/customer"
import { DataTableColumnHeader } from "./data-table-column-header"
import { Badge } from "@/components/ui/badge"

export const customersColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: "account",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account" />
    ),
    cell: ({ row }) => {
      const customer = row.original
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium">{customer.account}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "contact",
    header: () => <div>Contact</div>,
    cell: ({ row }) => {
      const contact = row.original.contact
      return (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{contact.name}</span>
          <span className="text-xs text-muted-foreground">{contact.email}</span>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "phone",
    header: () => <div>Phone</div>,
    cell: ({ row }) => {
      const contact = row.original.contact
      return (
        <span className="text-sm">{contact.phone}</span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "pets",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pets" />
    ),
    cell: ({ row }) => {
      const pets = row.getValue("pets") as number
      return (
        <div className="flex items-center gap-2">
          <Dog className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{pets} {pets === 1 ? 'pet' : 'pets'}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "lastAppointment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Appointment" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("lastAppointment") as string | null
      if (!date) {
        return <span className="text-muted-foreground text-sm">—</span>
      }
      return (
        <div className="text-sm">
          {new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "nextAppointment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Next Appointment" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("nextAppointment") as string | null
      if (!date) {
        return <span className="text-muted-foreground text-sm">—</span>
      }
      return (
        <div className="text-sm">
          {new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "due",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Due" />
    ),
    cell: ({ row }) => {
      const daysOverdue = row.getValue("due") as number
      if (daysOverdue === 0) {
        return <span className="text-muted-foreground text-sm">—</span>
      }
      return (
        <div className="text-sm font-medium text-red-600">
          {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (s) => s.value === row.getValue("status")
      )

      if (!status) {
        return null
      }

      return (
        <Badge variant={status.value === "active" ? "default" : "secondary"}>
          <status.icon className="mr-1 h-3 w-3" />
          {status.label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
]
