export interface Customer {
  id: string
  account: string
  contact: {
    name: string
    email: string
    phone: string
  }
  pets: number
  lastAppointment: string | null
  nextAppointment: string | null
  due: number // Number of days overdue for grooming
  status: "active" | "inactive"
}

export interface CustomerResponse {
  customers: Customer[]
  total: number
}
