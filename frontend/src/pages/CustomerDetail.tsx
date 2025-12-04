import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"
import { DetailedPetCard } from "@/components/DetailedPetCard"
import { BookingHistoryItem } from "@/components/BookingHistoryItem"
import { NotesSection } from "@/components/NotesSection"
import { ServiceAgreementStatus } from "@/components/ServiceAgreementStatus"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { customerService } from "@/services/customerService"
import { animalService } from "@/services/animalService"
import { petService } from "@/services/petService"
import { toast } from "sonner"
import type { CustomerDetailData } from "@/types/customerDetail"
import type { AnimalType, AnimalBreed } from "@/types/animal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function CustomerDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [customerData, setCustomerData] = useState<CustomerDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [isAddPetOpen, setIsAddPetOpen] = useState(false)
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])
  const [breeds, setBreeds] = useState<AnimalBreed[]>([])
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [newPet, setNewPet] = useState({
    petName: '',
    animalTypeId: '',
    breedId: '',
    birthDate: '',
    weight: '',
    spayedNeutered: false,
  })

  const loadCustomerData = async () => {
    if (!id) {
      navigate('/customers')
      return
    }

    try {
      setIsLoading(true)
      const [apiCustomer, pets] = await Promise.all([
        customerService.getCustomerById(parseInt(id)),
        petService.getPetsByCustomer(parseInt(id))
      ])

      // Transform API data to CustomerDetailData format
      const transformedData: CustomerDetailData = {
        familyName: apiCustomer.account_name,
        customerUsers: apiCustomer.customer_users.map(cu => ({
          id: cu.id.toString(),
          name: `${cu.first_name} ${cu.last_name}`,
          phone: cu.phone || '',
          email: cu.email,
          isPrimary: cu.is_primary_contact,
        })),
        pets: pets.map(pet => ({
          id: pet.id.toString(),
          name: pet.name,
          breed: pet.breed || pet.species,
          imageUrl: '', // TODO: Add pet images
          groomerName: '', // TODO: Get from appointments
          vaccinationStatus: 'inactive', // TODO: Get from vaccinations API
          vaccinations: [],
          nextBooking: null,
          lastBooked: null,
        })),
        bookingHistory: [], // TODO: Get from appointments API
        clientNotes: [], // TODO: Get from customer notes
        petNotes: [], // TODO: Get from pet notes
        serviceAgreementSigned: false, // TODO: Get from agreements
      }

      setCustomerData(transformedData)
    } catch (error) {
      console.error('Failed to load customer:', error)
      toast.error('Failed to load customer details')
      navigate('/customers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomerData()
  }, [id, navigate])

  // Load animal types on mount
  useEffect(() => {
    const loadAnimalTypes = async () => {
      try {
        const types = await animalService.getAnimalTypes()
        setAnimalTypes(types)
      } catch (error) {
        console.error('Failed to load animal types:', error)
      }
    }

    loadAnimalTypes()
  }, [])

  // Load breeds when animal type changes
  useEffect(() => {
    const loadBreeds = async () => {
      if (newPet.animalTypeId) {
        try {
          console.log('Loading breeds for animal type:', newPet.animalTypeId)
          const breedList = await animalService.getBreedsByAnimalType(parseInt(newPet.animalTypeId))
          console.log('Loaded breeds:', breedList)
          setBreeds(breedList)
        } catch (error) {
          console.error('Failed to load breeds:', error)
          setBreeds([])
        }
      } else {
        console.log('No animal type selected, clearing breeds')
        setBreeds([])
      }
    }

    loadBreeds()
  }, [newPet.animalTypeId])

  const handleAddClientNote = (content: string) => {
    console.log("Adding client note:", content)
    // TODO: API call to add note
  }

  const handleAddPetNote = (content: string) => {
    console.log("Adding pet note:", content)
    // TODO: API call to add note
  }

  const handleAddPet = async () => {
    if (!newPet.petName || !newPet.animalTypeId) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!id) return

    try {
      await petService.addPet(parseInt(id), {
        name: newPet.petName,
        animal_type_id: parseInt(newPet.animalTypeId),
        breed_id: newPet.breedId ? parseInt(newPet.breedId) : undefined,
        birth_date: newPet.birthDate || undefined,
        weight: newPet.weight ? parseFloat(newPet.weight) : undefined,
        spayed_neutered: newPet.spayedNeutered,
      })

      toast.success('Pet added successfully')
      setIsAddPetOpen(false)
      setNewPet({
        petName: '',
        animalTypeId: '',
        breedId: '',
        birthDate: '',
        weight: '',
        spayedNeutered: false,
      })

      // Reload customer data
      const apiCustomer = await customerService.getCustomerById(parseInt(id))
      const transformedData: CustomerDetailData = {
        familyName: apiCustomer.account_name,
        customerUsers: apiCustomer.customer_users.map(cu => ({
          id: cu.id.toString(),
          name: `${cu.first_name} ${cu.last_name}`,
          phone: cu.phone || '',
          email: cu.email,
          isPrimary: cu.is_primary_contact,
        })),
        pets: apiCustomer.pets.map(pet => ({
          id: pet.id.toString(),
          name: pet.name,
          breed: pet.breed || pet.species,
          imageUrl: '',
          groomerName: '',
          vaccinationStatus: 'inactive',
          vaccinations: [],
          nextBooking: null,
          lastBooked: null,
        })),
        bookingHistory: [],
        clientNotes: [],
        petNotes: [],
        serviceAgreementSigned: false,
      }
      setCustomerData(transformedData)
    } catch (error) {
      console.error('Failed to add pet:', error)
      toast.error('Failed to add pet')
    }
  }

  const handleAddContact = async () => {
    if (!newContact.firstName || !newContact.lastName || !newContact.email) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!id) return

    try {
      await customerService.addCustomerUser(parseInt(id), {
        email: newContact.email,
        first_name: newContact.firstName,
        last_name: newContact.lastName,
        phone: newContact.phone || undefined,
      })

      toast.success('Contact added successfully')
      setIsAddContactOpen(false)
      setNewContact({ firstName: '', lastName: '', email: '', phone: '' })

      // Reload customer data
      const apiCustomer = await customerService.getCustomerById(parseInt(id))
      const transformedData: CustomerDetailData = {
        familyName: apiCustomer.account_name,
        customerUsers: apiCustomer.customer_users.map(cu => ({
          id: cu.id.toString(),
          name: `${cu.first_name} ${cu.last_name}`,
          phone: cu.phone || '',
          email: cu.email,
          isPrimary: cu.is_primary_contact,
        })),
        pets: apiCustomer.pets.map(pet => ({
          id: pet.id.toString(),
          name: pet.name,
          breed: pet.breed || pet.species,
          imageUrl: '',
          groomerName: '',
          vaccinationStatus: 'inactive',
          vaccinations: [],
          nextBooking: null,
          lastBooked: null,
        })),
        bookingHistory: [],
        clientNotes: [],
        petNotes: [],
        serviceAgreementSigned: false,
      }
      setCustomerData(transformedData)
    } catch (error) {
      console.error('Failed to add contact:', error)
      toast.error('Failed to add contact')
    }
  }

  if (isLoading || !customerData) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Loading customer details...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/customers">Customers</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{customerData.familyName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Customers
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
          {/* Family Name Header */}
          <h1 className="text-3xl font-bold">{customerData.familyName}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Parent/Customer Users Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    {customerData.customerUsers.map((user, index) => (
                      <div key={user.id} className="flex items-center gap-4 text-base">
                        <div className="font-semibold min-w-40 capitalize">{user.name.toLowerCase()}</div>
                        {user.isPrimary && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
                            Primary
                          </span>
                        )}
                        <div className="text-muted-foreground">{user.phone}</div>
                        <a
                          href={`mailto:${user.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {user.email}
                        </a>
                        {index === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={() => setIsAddContactOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add contact
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Pets</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddPetOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Pet
                  </Button>
                </div>
                {customerData.pets.map((pet) => (
                  <DetailedPetCard key={pet.id} pet={pet} />
                ))}
              </div>

              {/* Booking History Section */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Booking History</h2>
                <div className="space-y-3">
                  {customerData.bookingHistory.map((booking) => (
                    <BookingHistoryItem key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Status & Notes */}
            <div className="space-y-6">
              <ServiceAgreementStatus
                isSigned={customerData.serviceAgreementSigned}
                onClick={() => console.log("Service agreement clicked")}
              />
              <NotesSection
                title="Client Notes"
                notes={customerData.clientNotes}
                onAddNote={handleAddClientNote}
              />
              <NotesSection
                title="Pet Notes"
                notes={customerData.petNotes}
                onAddNote={handleAddPetNote}
              />
            </div>
          </div>
        </div>

        {/* Add Contact Modal */}
        <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>
                Add a new contact person for this customer account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContact}>Add Contact</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Pet Modal */}
        <Dialog open={isAddPetOpen} onOpenChange={setIsAddPetOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Pet</DialogTitle>
              <DialogDescription>
                Add a new pet to this customer account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petName">Pet Name</Label>
                <Input
                  id="petName"
                  value={newPet.petName}
                  onChange={(e) => setNewPet({ ...newPet, petName: e.target.value })}
                  placeholder="Enter pet name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="animalType">Animal Type</Label>
                  <Select
                    value={newPet.animalTypeId}
                    onValueChange={(value) => setNewPet({ ...newPet, animalTypeId: value, breedId: '' })}
                  >
                    <SelectTrigger id="animalType">
                      <SelectValue placeholder="Select animal type" />
                    </SelectTrigger>
                    <SelectContent>
                      {animalTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Breed</Label>
                  <Select
                    value={newPet.breedId}
                    onValueChange={(value) => setNewPet({ ...newPet, breedId: value })}
                    disabled={!newPet.animalTypeId}
                  >
                    <SelectTrigger id="breed">
                      <SelectValue placeholder={!newPet.animalTypeId ? "Select animal type first" : breeds.length === 0 ? "No breeds available" : "Select breed"} />
                    </SelectTrigger>
                    <SelectContent>
                      {breeds.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {!newPet.animalTypeId ? "Select an animal type first" : "No breeds available"}
                        </div>
                      ) : (
                        breeds.map((breed) => (
                          <SelectItem key={breed.id} value={breed.id.toString()}>
                            {breed.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={newPet.birthDate}
                  onChange={(e) => setNewPet({ ...newPet, birthDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={newPet.weight}
                  onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                  placeholder="Enter weight"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spayedNeutered"
                  checked={newPet.spayedNeutered}
                  onCheckedChange={(checked) => setNewPet({ ...newPet, spayedNeutered: checked as boolean })}
                />
                <Label htmlFor="spayedNeutered" className="cursor-pointer">
                  Spayed/Neutered
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPet}>Add Pet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
