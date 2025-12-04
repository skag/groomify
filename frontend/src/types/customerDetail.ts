// Enhanced types for Customer Detail page

export interface CustomerUser {
  id: string
  name: string
  phone: string
  email: string
  isPrimary: boolean
}

export interface VaccinationRecord {
  code: string // e.g., "EKF", "GKF", "LKF"
  name: string // Full name of vaccination
}

export interface DetailedPet {
  id: string
  name: string
  breed: string
  imageUrl?: string
  groomerName: string
  vaccinationStatus: "active" | "inactive" | "due"
  vaccinations: VaccinationRecord[]
  nextBooking: string | null // ISO date string
  lastBooked: string | null // ISO date string
}

export interface AppointmentService {
  name: string
  price: number
}

export interface BookingHistory {
  id: string
  petName: string
  date: string // ISO date string
  startTime: string // e.g., "1:15 pm"
  endTime: string // e.g., "2:30 pm"
  durationMinutes: number
  services: AppointmentService[]
  tip: number
  hasNote: boolean
  note?: string
}

export interface Note {
  id: string
  date: string // ISO date string
  content: string
  authorName: string
}

export interface CustomerDetailData {
  familyName: string // e.g., "Brown Family"
  customerUsers: CustomerUser[]
  pets: DetailedPet[]
  bookingHistory: BookingHistory[]
  clientNotes: Note[]
  petNotes: Note[]
  serviceAgreementSigned: boolean
}
