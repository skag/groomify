export interface Pet {
  id: string
  name: string
  accountName: string
  accountId: string
  breed: string
  lastGroomed: string | null
  nextGrooming: string | null
  overdue: number // Number of days overdue for grooming
  notes: string
  status: "active" | "inactive"
}

export interface PetResponse {
  pets: Pet[]
  total: number
}
