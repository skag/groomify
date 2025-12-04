import type { Customer } from "@/types/customer"

export const mockCustomers: Customer[] = [
  {
    id: "1",
    account: "Smith Family",
    contact: {
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "(555) 123-4567",
    },
    pets: 2,
    lastAppointment: "2024-11-15",
    nextAppointment: "2024-12-20",
    due: 0,
    status: "active",
  },
  {
    id: "2",
    account: "Johnson Household",
    contact: {
      name: "Emily Johnson",
      email: "emily.j@email.com",
      phone: "(555) 234-5678",
    },
    pets: 1,
    lastAppointment: "2024-10-28",
    nextAppointment: null,
    due: 15,
    status: "active",
  },
  {
    id: "3",
    account: "Williams Pets",
    contact: {
      name: "Michael Williams",
      email: "m.williams@email.com",
      phone: "(555) 345-6789",
    },
    pets: 3,
    lastAppointment: "2024-11-22",
    nextAppointment: "2024-12-15",
    due: 0,
    status: "active",
  },
  {
    id: "4",
    account: "Brown Family",
    contact: {
      name: "Sarah Brown",
      email: "sarah.brown@email.com",
      phone: "(555) 456-7890",
    },
    pets: 1,
    lastAppointment: "2024-09-10",
    nextAppointment: null,
    due: 83,
    status: "inactive",
  },
  {
    id: "5",
    account: "Davis Residence",
    contact: {
      name: "David Davis",
      email: "d.davis@email.com",
      phone: "(555) 567-8901",
    },
    pets: 2,
    lastAppointment: "2024-11-30",
    nextAppointment: "2024-12-28",
    due: 0,
    status: "active",
  },
]
