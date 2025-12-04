import type { ColumnDef } from "@tanstack/react-table"
import { Dog } from "lucide-react"
import { statuses } from "@/data/statuses"
import type { Pet } from "@/types/pet"
import { DataTableColumnHeader } from "./data-table-column-header"
import { Badge } from "@/components/ui/badge"

export const petsColumns: ColumnDef<Pet>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pet Name" />
    ),
    cell: ({ row }) => {
      const pet = row.original
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Dog className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium">{pet.name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "accountName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account" />
    ),
    cell: ({ row }) => {
      return <span className="text-sm">{row.getValue("accountName")}</span>
    },
  },
  {
    accessorKey: "breed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Breed" />
    ),
    cell: ({ row }) => {
      return <span className="text-sm">{row.getValue("breed")}</span>
    },
  },
  {
    accessorKey: "lastGroomed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Groomed" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("lastGroomed") as string | null
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
    accessorKey: "nextGrooming",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Next Grooming" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("nextGrooming") as string | null
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
    accessorKey: "overdue",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Overdue" />
    ),
    cell: ({ row }) => {
      const daysOverdue = row.getValue("overdue") as number
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
    accessorKey: "notes",
    header: () => <div>Notes</div>,
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string
      return (
        <div className="max-w-[200px] truncate text-sm text-muted-foreground">
          {notes || "—"}
        </div>
      )
    },
    enableSorting: false,
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
