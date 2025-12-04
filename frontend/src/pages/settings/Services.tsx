import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox"
import { animalService } from "@/services/animalService"
import { serviceCategoryService } from "@/services/serviceCategoryService"
import { serviceService } from "@/services/serviceService"
import { staffService } from "@/services/staffService"
import type { AnimalType, AnimalBreed } from "@/types/animal"
import type { ServiceCategory } from "@/types/serviceCategory"
import type { Service } from "@/types/service"
import type { StaffMember } from "@/types/staff"

export default function ServicesSettings() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [serviceName, setServiceName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [fee, setFee] = useState("")
  const [taxPercent, setTaxPercent] = useState("")
  const [duration, setDuration] = useState("")

  // Animal type and breed state
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])
  const [selectedAnimalType, setSelectedAnimalType] = useState<string>("all")
  const [breeds, setBreeds] = useState<AnimalBreed[]>([])
  const [selectedBreeds, setSelectedBreeds] = useState<number[]>([])
  const [isLoadingBreeds, setIsLoadingBreeds] = useState(false)

  // Service categories state
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // Services state
  const [services, setServices] = useState<Service[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)

  // Staff state
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [isLoadingStaff, setIsLoadingStaff] = useState(false)
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([])

  // Load all initial data on mount
  useEffect(() => {
    const loadAnimalTypes = async () => {
      try {
        const types = await animalService.getAnimalTypes()
        setAnimalTypes(types)
      } catch (error) {
        console.error("Failed to load animal types:", error)
      }
    }

    const loadServiceCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const categories = await serviceCategoryService.getServiceCategories()
        setServiceCategories(categories)
      } catch (error) {
        console.error("Failed to load service categories:", error)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    const loadServices = async () => {
      setIsLoadingServices(true)
      try {
        const fetchedServices = await serviceService.getServices()
        setServices(fetchedServices)
      } catch (error) {
        console.error("Failed to load services:", error)
      } finally {
        setIsLoadingServices(false)
      }
    }

    const loadStaffMembers = async () => {
      setIsLoadingStaff(true)
      try {
        const staff = await staffService.getAllStaff()
        setStaffMembers(staff)
      } catch (error) {
        console.error("Failed to load staff:", error)
      } finally {
        setIsLoadingStaff(false)
      }
    }

    loadAnimalTypes()
    loadServiceCategories()
    loadServices()
    loadStaffMembers()
  }, [])

  // Load breeds when animal type is selected
  useEffect(() => {
    const loadBreeds = async () => {
      if (!selectedAnimalType || selectedAnimalType === "all") {
        setBreeds([])
        setSelectedBreeds([])
        return
      }

      setIsLoadingBreeds(true)
      try {
        const animalTypeId = parseInt(selectedAnimalType)
        const fetchedBreeds = await animalService.getBreedsByAnimalType(animalTypeId)
        setBreeds(fetchedBreeds)
      } catch (error) {
        console.error("Failed to load breeds:", error)
        setBreeds([])
      } finally {
        setIsLoadingBreeds(false)
      }
    }

    loadBreeds()
  }, [selectedAnimalType])

  // Handle animal type selection
  const handleAnimalTypeChange = (value: string) => {
    setSelectedAnimalType(value)
    setSelectedBreeds([])
  }

  const handleAddService = async () => {
    if (!serviceName || !category || !fee || !duration) {
      alert("Please fill in all required fields")
      return
    }

    const feeNum = parseFloat(fee)
    const taxNum = taxPercent ? parseFloat(taxPercent) : null
    const durationNum = parseInt(duration)

    // Determine animal type and breed handling
    const appliesToAllAnimals = selectedAnimalType === "all"
    const appliesToAllBreeds = selectedBreeds.length === 0 || selectedBreeds.includes("all" as any)

    // Filter out "all" from breed IDs if it was selected
    const breedIds = appliesToAllBreeds ? [] : selectedBreeds.filter(id => id !== "all")
    const animalTypeIds = appliesToAllAnimals ? [] : [parseInt(selectedAnimalType)]

    try {
      const newService = await serviceService.createService({
        name: serviceName,
        description: description || null,
        category_id: parseInt(category),
        duration_minutes: durationNum,
        price: feeNum,
        tax_rate: taxNum,
        is_active: true,
        applies_to_all_animal_types: appliesToAllAnimals,
        applies_to_all_breeds: appliesToAllBreeds,
        staff_member_ids: selectedStaffIds,
        animal_type_ids: animalTypeIds,
        animal_breed_ids: breedIds,
      })

      setServices([...services, newService])

      // Reset form
      setServiceName("")
      setCategory("")
      setDescription("")
      setFee("")
      setTaxPercent("")
      setDuration("")
      setSelectedStaffIds([])
      setSelectedAnimalType("all")
      setSelectedBreeds([])
      setIsAddModalOpen(false)
    } catch (error) {
      console.error("Failed to create service:", error)
      alert("Failed to create service. Please try again.")
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${mins}m`
    }
  }

  const calculateTax = (price: number, taxPercent: number) => {
    return (price * taxPercent) / 100
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-2">
            Manage your grooming services and pricing
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Catalog</CardTitle>
          <CardDescription>
            Configure your grooming services, pricing, and duration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Services</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Animal Types</TableHead>
                <TableHead>Breeds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingServices ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading services...
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No services found. Create your first service to get started.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.category.name}</TableCell>
                    <TableCell>${Number(service.price).toFixed(2)}</TableCell>
                    <TableCell>
                      {service.tax_rate ? `$${calculateTax(Number(service.price), Number(service.tax_rate)).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{formatDuration(service.duration_minutes)}</TableCell>
                    <TableCell>
                      {service.applies_to_all_animal_types ? (
                        <span className="text-sm text-muted-foreground">All</span>
                      ) : (
                        <div className="text-sm">
                          {service.animal_types.map(t => t.name).join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {service.applies_to_all_breeds ? (
                        <span className="text-sm text-muted-foreground">All</span>
                      ) : (
                        <div className="text-sm">
                          {service.animal_breeds.map(b => b.name).join(", ")}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Service Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>
              Create a new grooming service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input
                id="serviceName"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g., Full Grooming"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory} disabled={isLoadingCategories}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"} />
                </SelectTrigger>
                <SelectContent>
                  {serviceCategories.length === 0 && !isLoadingCategories ? (
                    <SelectItem value="none" disabled>No categories available</SelectItem>
                  ) : (
                    serviceCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Animal Type and Breed Selection - Horizontal Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Animal Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="animalType">Animal Type</Label>
                <Select
                  value={selectedAnimalType}
                  onValueChange={handleAnimalTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select animal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Animal Types</SelectItem>
                    {animalTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Breed Selection */}
              <div className="space-y-2">
                {selectedAnimalType !== "all" && (
                  <>
                    <Label>Breeds</Label>
                    <MultiSelectCombobox
                      options={[
                        { value: "all", label: "All Breeds" },
                        ...breeds.map((breed) => ({
                          value: breed.id,
                          label: breed.name.charAt(0).toUpperCase() + breed.name.slice(1),
                        }))
                      ]}
                      selected={selectedBreeds}
                      onChange={(selected) => setSelectedBreeds(selected as number[])}
                      placeholder="Select breeds..."
                      searchPlaceholder="Search breeds..."
                      emptyText={isLoadingBreeds ? "Loading breeds..." : "No breeds found."}
                      disabled={isLoadingBreeds}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this service..."
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Fee ($) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxPercent">Tax (%) *</Label>
                <Input
                  id="taxPercent"
                  type="number"
                  step="0.01"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                  placeholder="8.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
            </div>

            <div className="space-y-2">
              <Label>Staff (optional)</Label>
              <MultiSelectCombobox
                options={staffMembers.map((staff) => ({
                  value: staff.id,
                  label: `${staff.first_name} ${staff.last_name}`,
                }))}
                selected={selectedStaffIds}
                onChange={(selected) => setSelectedStaffIds(selected as number[])}
                placeholder="Select staff members..."
                searchPlaceholder="Search staff..."
                emptyText={isLoadingStaff ? "Loading staff..." : "No staff found."}
                disabled={isLoadingStaff}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddService}>Add Service</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
