import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/app-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup } from "@/components/ui/field"
import { animalService } from "@/services/animalService"
import { customerService } from "@/services/customerService"
import type { AnimalType, AnimalBreed } from "@/types/animal"

interface CustomerUserForm {
  firstName: string
  lastName: string
  phone: string
  email: string
}

interface PetForm {
  animalTypeId: string
  petName: string
  breedId: string
  birthDate: string
  weight: string
  spayedNeutered: boolean
}

export default function CustomersAdd() {
  const navigate = useNavigate()

  // Customer User form state
  const [customerUser, setCustomerUser] = useState<CustomerUserForm>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  })

  // Pet form state
  const [pet, setPet] = useState<PetForm>({
    animalTypeId: "",
    petName: "",
    breedId: "",
    birthDate: "",
    weight: "",
    spayedNeutered: false,
  })

  // Animal types and breeds
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])
  const [breeds, setBreeds] = useState<AnimalBreed[]>([])
  const [isLoadingBreeds, setIsLoadingBreeds] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load animal types on mount
  useEffect(() => {
    const loadAnimalTypes = async () => {
      try {
        const types = await animalService.getAnimalTypes()
        setAnimalTypes(types)
      } catch (error) {
        console.error("Failed to load animal types:", error)
        toast.error("Failed to load animal types")
      }
    }
    loadAnimalTypes()
  }, [])

  // Load breeds when animal type changes
  useEffect(() => {
    const loadBreeds = async () => {
      if (!pet.animalTypeId) {
        setBreeds([])
        return
      }

      setIsLoadingBreeds(true)
      try {
        const fetchedBreeds = await animalService.getBreedsByAnimalType(
          parseInt(pet.animalTypeId)
        )
        setBreeds(fetchedBreeds)
      } catch (error) {
        console.error("Failed to load breeds:", error)
        toast.error("Failed to load breeds")
      } finally {
        setIsLoadingBreeds(false)
      }
    }
    loadBreeds()
  }, [pet.animalTypeId])

  const handleCustomerUserChange = (field: keyof CustomerUserForm, value: string) => {
    setCustomerUser(prev => ({ ...prev, [field]: value }))
  }

  const handlePetChange = (field: keyof PetForm, value: string | boolean) => {
    setPet(prev => {
      // Reset breed when animal type changes
      if (field === "animalTypeId") {
        return { ...prev, [field]: value, breedId: "" }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!customerUser.firstName || !customerUser.lastName || !customerUser.email) {
      toast.error("Please fill in all required customer fields")
      return
    }

    if (!pet.petName || !pet.animalTypeId) {
      toast.error("Please fill in all required pet fields")
      return
    }

    setIsSubmitting(true)

    try {
      // Create customer with customer_user and pet
      const createData = {
        customer_user: {
          email: customerUser.email,
          first_name: customerUser.firstName,
          last_name: customerUser.lastName,
          phone: customerUser.phone || undefined,
        },
        pet: {
          name: pet.petName,
          animal_type_id: parseInt(pet.animalTypeId),
          breed_id: pet.breedId ? parseInt(pet.breedId) : undefined,
          birth_date: pet.birthDate || undefined,
          weight: pet.weight ? parseFloat(pet.weight) : undefined,
          spayed_neutered: pet.spayedNeutered,
        },
      }

      const newCustomer = await customerService.createCustomer(createData)

      toast.success("Customer created successfully")
      navigate(`/customers/${newCustomer.id}`)
    } catch (error) {
      console.error("Failed to create customer:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create customer"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate("/customers")
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-section {
          animation: slideInUp 0.4s ease-out backwards;
        }

        .form-section:nth-child(1) {
          animation-delay: 0.1s;
        }

        .form-section:nth-child(2) {
          animation-delay: 0.2s;
        }

        .form-section:nth-child(3) {
          animation-delay: 0.3s;
        }

        .field-label {
          font-size: 0.8125rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: hsl(var(--foreground) / 0.7);
          transition: color 0.2s;
        }

        .field-input:focus-within .field-label {
          color: hsl(var(--foreground));
        }

        .required-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          font-size: 0.6875rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: hsl(var(--muted));
          color: hsl(var(--muted-foreground));
          border-radius: 0.25rem;
          margin-left: 0.5rem;
        }
      `}</style>

      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 w-full">
          <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/customers">Customers</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Add Customer</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 pt-2 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">New Customer</h1>
              <p className="text-sm text-muted-foreground mt-1">Create a customer profile with their pet information</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
            {/* Customer User Information */}
            <div className="form-section">
              <div className="border rounded-lg bg-card">
                <div className="border-b px-6 py-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Customer Information</h2>
                    <span className="required-badge">Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Primary contact details for this account
                  </p>
                </div>
                <div className="p-6 space-y-5">
                  {/* First and Last Name Row */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="field-input space-y-2.5">
                      <Label htmlFor="firstName" className="field-label">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={customerUser.firstName}
                        onChange={(e) => handleCustomerUserChange("firstName", e.target.value)}
                        placeholder="Enter first name"
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="field-input space-y-2.5">
                      <Label htmlFor="lastName" className="field-label">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={customerUser.lastName}
                        onChange={(e) => handleCustomerUserChange("lastName", e.target.value)}
                        placeholder="Enter last name"
                        required
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Email and Phone Row */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="field-input space-y-2.5">
                      <Label htmlFor="email" className="field-label">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerUser.email}
                        onChange={(e) => handleCustomerUserChange("email", e.target.value)}
                        placeholder="customer@example.com"
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="field-input space-y-2.5">
                      <Label htmlFor="phone" className="field-label">
                        Phone Number <span className="text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customerUser.phone}
                        onChange={(e) => handleCustomerUserChange("phone", e.target.value)}
                        placeholder="(555) 000-0000"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pet Information */}
            <div className="form-section">
              <div className="border rounded-lg bg-card">
                <div className="border-b px-6 py-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Pet Information</h2>
                    <span className="required-badge">Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Details about the customer's pet
                  </p>
                </div>
                <div className="p-6 space-y-5">
                  {/* Pet Name - Full Width */}
                  <div className="field-input space-y-2.5">
                    <Label htmlFor="petName" className="field-label">
                      Pet Name
                    </Label>
                    <Input
                      id="petName"
                      value={pet.petName}
                      onChange={(e) => handlePetChange("petName", e.target.value)}
                      placeholder="Enter pet's name"
                      required
                      className="h-10"
                    />
                  </div>

                  {/* Animal Type and Breed Row */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="field-input space-y-2.5">
                      <Label htmlFor="animalType" className="field-label">
                        Animal Type
                      </Label>
                      <Select
                        value={pet.animalTypeId}
                        onValueChange={(value) => handlePetChange("animalTypeId", value)}
                        required
                      >
                        <SelectTrigger id="animalType" className="h-10">
                          <SelectValue placeholder="Select type" />
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

                    <div className="field-input space-y-2.5">
                      <Label htmlFor="breed" className="field-label">
                        Breed <span className="text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                      <Select
                        value={pet.breedId}
                        onValueChange={(value) => handlePetChange("breedId", value)}
                        disabled={!pet.animalTypeId || isLoadingBreeds}
                      >
                        <SelectTrigger id="breed" className="h-10">
                          <SelectValue
                            placeholder={
                              isLoadingBreeds
                                ? "Loading..."
                                : !pet.animalTypeId
                                ? "Select type first"
                                : "Select breed"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {breeds.map((breed) => (
                            <SelectItem key={breed.id} value={breed.id.toString()}>
                              {breed.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Birth Date and Weight Row */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="field-input space-y-2.5">
                      <Label htmlFor="birthDate" className="field-label">
                        Birth Date <span className="text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={pet.birthDate}
                        onChange={(e) => handlePetChange("birthDate", e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="field-input space-y-2.5">
                      <Label htmlFor="weight" className="field-label">
                        Weight (lbs) <span className="text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        min="0"
                        value={pet.weight}
                        onChange={(e) => handlePetChange("weight", e.target.value)}
                        placeholder="0.0"
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* Spayed/Neutered Checkbox */}
                  <div className="flex items-center gap-3 pt-2 pb-1 px-4 -mx-4 rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id="spayedNeutered"
                      checked={pet.spayedNeutered}
                      onCheckedChange={(checked) => handlePetChange("spayedNeutered", checked === true)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="spayedNeutered"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Spayed or Neutered
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Check if the pet has been spayed or neutered
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-section flex items-center justify-between pt-2 pb-4">
              <p className="text-sm text-muted-foreground">
                All required fields must be completed before submitting
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="min-w-24"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-32 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Create Customer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
    </AppLayout>
  )
}
