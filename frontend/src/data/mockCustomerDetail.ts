import { CustomerDetailData } from "@/types/customerDetail"

export const mockCustomerDetail: CustomerDetailData = {
  familyName: "Brown Family",
  customerUsers: [
    {
      id: "cu1",
      name: "Sarah Brown",
      phone: "503-544-3755",
      email: "sarah@gmail.com",
      isPrimary: true,
    },
    {
      id: "cu2",
      name: "John Brown",
      phone: "503-544-3755",
      email: "sarah@gmail.com",
      isPrimary: false,
    },
  ],
  pets: [
    {
      id: "pet1",
      name: "Sam",
      breed: "German Shephard",
      imageUrl: "https://images.unsplash.com/photo-1568572933382-74d440642117?w=200&h=200&fit=crop",
      groomerName: "Yuli Lang",
      vaccinationStatus: "active",
      vaccinations: [
        { code: "EKF", name: "Canine Distemper" },
        { code: "GKF", name: "Canine Parvovirus" },
        { code: "LKF", name: "Rabies" },
      ],
      nextBooking: "2005-01-23T10:00:00",
      lastBooked: "2004-12-22T15:15:00",
    },
  ],
  bookingHistory: [
    {
      id: "b1",
      petName: "Sam",
      date: "2004-11-22T13:15:00",
      startTime: "1:15 pm",
      endTime: "2:30 pm",
      durationMinutes: 75,
      services: [
        { name: "Full Grooming", price: 127.00 },
        { name: "nail trim", price: 0 },
      ],
      tip: 20,
      hasNote: true,
      note: "Client paid a good tip",
    },
    {
      id: "b2",
      petName: "Sam",
      date: "2004-12-22T15:15:00",
      startTime: "3:15 pm",
      endTime: "3:30 pm",
      durationMinutes: 75,
      services: [
        { name: "Full Grooming", price: 127.00 },
        { name: "nail trim", price: 0 },
      ],
      tip: 18,
      hasNote: true,
      note: "Client was late last time",
    },
  ],
  clientNotes: [
    {
      id: "cn1",
      date: "2004-12-22T15:15:00",
      content: "Client was late last time",
      authorName: "Piper",
    },
    {
      id: "cn2",
      date: "2004-11-22T13:15:00",
      content: "Client paid a good tip",
      authorName: "Mykayla",
    },
  ],
  petNotes: [
    {
      id: "pn1",
      date: "2004-12-22T15:15:00",
      content: "Sam is super hyper",
      authorName: "Piper",
    },
    {
      id: "pn2",
      date: "2004-11-22T13:15:00",
      content: "Sam had lot of matting",
      authorName: "Mykayla",
    },
  ],
  serviceAgreementSigned: true,
}
