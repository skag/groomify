import { useState, useCallback, useEffect } from "react"
import { Plus } from "lucide-react"
import { useSearchParams, useNavigate } from "react-router-dom"
import type { SortingState } from "@tanstack/react-table"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Customer } from "@/types/customer"
import type { Pet } from "@/types/pet"
import { CustomersTable } from "@/components/data-table/customers-table"
import { customersColumns } from "@/components/data-table/customers-columns"
import { PetsTable } from "@/components/data-table/pets-table"
import { petsColumns } from "@/components/data-table/pets-columns"
import { customerService } from "@/services/customerService"
import { petService } from "@/services/petService"
import { toast } from "sonner"

export default function Customers() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get active tab from URL, default to "customers"
  const activeTab = searchParams.get('tab') || 'customers'

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [totalCustomers, setTotalCustomers] = useState(0)

  // Pet state
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoadingPets, setIsLoadingPets] = useState(true)
  const [totalPets, setTotalPets] = useState(0)

  // Customer pagination/filter state
  const initialCustomerPage = parseInt(searchParams.get('customerPage') || '0')
  const initialCustomerPageSize = parseInt(searchParams.get('customerPageSize') || '20')
  const initialCustomerSearch = searchParams.get('customerSearch') || ''
  const initialCustomerSortBy = searchParams.get('customerSortBy') || 'account'
  const initialCustomerSortOrder = searchParams.get('customerSortOrder') === 'desc'
  const initialCustomerStatuses = searchParams.get('customerStatuses')?.split(',').filter(Boolean) || []

  const [customerStatusFilter, setCustomerStatusFilter] = useState<string[]>(initialCustomerStatuses)
  const [customerSorting, setCustomerSorting] = useState<SortingState>([{ id: initialCustomerSortBy, desc: initialCustomerSortOrder }])
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>(initialCustomerSearch)
  const [customerCurrentPage, setCustomerCurrentPage] = useState(initialCustomerPage)
  const [customerCurrentPageSize, setCustomerCurrentPageSize] = useState(initialCustomerPageSize)

  // Pet pagination/filter state
  const initialPetPage = parseInt(searchParams.get('petPage') || '0')
  const initialPetPageSize = parseInt(searchParams.get('petPageSize') || '20')
  const initialPetSearch = searchParams.get('petSearch') || ''
  const initialPetSortBy = searchParams.get('petSortBy') || 'name'
  const initialPetSortOrder = searchParams.get('petSortOrder') === 'desc'
  const initialPetStatuses = searchParams.get('petStatuses')?.split(',').filter(Boolean) || []

  const [petStatusFilter, setPetStatusFilter] = useState<string[]>(initialPetStatuses)
  const [petSorting, setPetSorting] = useState<SortingState>([{ id: initialPetSortBy, desc: initialPetSortOrder }])
  const [petSearchQuery, setPetSearchQuery] = useState<string>(initialPetSearch)
  const [petCurrentPage, setPetCurrentPage] = useState(initialPetPage)
  const [petCurrentPageSize, setPetCurrentPageSize] = useState(initialPetPageSize)

  // Handle tab change
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', value)
    setSearchParams(newParams, { replace: true })
  }

  // Update URL params for customers
  const updateCustomerUrlParams = useCallback((params: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortOrder?: string
    statuses?: string[]
  }) => {
    const newParams = new URLSearchParams(searchParams)

    if (params.page !== undefined) newParams.set('customerPage', params.page.toString())
    if (params.pageSize !== undefined) newParams.set('customerPageSize', params.pageSize.toString())
    if (params.search !== undefined) {
      if (params.search) {
        newParams.set('customerSearch', params.search)
      } else {
        newParams.delete('customerSearch')
      }
    }
    if (params.sortBy !== undefined) newParams.set('customerSortBy', params.sortBy)
    if (params.sortOrder !== undefined) newParams.set('customerSortOrder', params.sortOrder)
    if (params.statuses !== undefined) {
      if (params.statuses.length > 0) {
        newParams.set('customerStatuses', params.statuses.join(','))
      } else {
        newParams.delete('customerStatuses')
      }
    }

    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams])

  // Update URL params for pets
  const updatePetUrlParams = useCallback((params: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortOrder?: string
    statuses?: string[]
  }) => {
    const newParams = new URLSearchParams(searchParams)

    if (params.page !== undefined) newParams.set('petPage', params.page.toString())
    if (params.pageSize !== undefined) newParams.set('petPageSize', params.pageSize.toString())
    if (params.search !== undefined) {
      if (params.search) {
        newParams.set('petSearch', params.search)
      } else {
        newParams.delete('petSearch')
      }
    }
    if (params.sortBy !== undefined) newParams.set('petSortBy', params.sortBy)
    if (params.sortOrder !== undefined) newParams.set('petSortOrder', params.sortOrder)
    if (params.statuses !== undefined) {
      if (params.statuses.length > 0) {
        newParams.set('petStatuses', params.statuses.join(','))
      } else {
        newParams.delete('petStatuses')
      }
    }

    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams])

  // Fetch customers function
  const loadCustomers = useCallback(async (page: number, perPage: number, statuses?: string[], search?: string) => {
    try {
      setIsLoadingCustomers(true)

      const apiCustomers = await customerService.getAllCustomers()

      let transformedCustomers: Customer[] = apiCustomers.map(apiCustomer => {
        const primaryContact = apiCustomer.customer_users.find(cu => cu.is_primary_contact) || apiCustomer.customer_users[0]

        return {
          id: apiCustomer.id.toString(),
          account: apiCustomer.account_name,
          contact: {
            name: primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : 'No contact',
            email: primaryContact?.email || '',
            phone: primaryContact?.phone || '',
          },
          pets: apiCustomer.pets.length,
          lastAppointment: null,
          nextAppointment: null,
          due: 0,
          status: apiCustomer.status as "active" | "inactive",
        }
      })

      if (statuses && statuses.length > 0) {
        transformedCustomers = transformedCustomers.filter(c => statuses.includes(c.status))
      }

      if (search) {
        const searchLower = search.toLowerCase()
        transformedCustomers = transformedCustomers.filter(c =>
          c.account.toLowerCase().includes(searchLower) ||
          c.contact.name.toLowerCase().includes(searchLower) ||
          c.contact.email.toLowerCase().includes(searchLower)
        )
      }

      const sortBy = customerSorting[0]?.id || 'account'
      const sortOrder = customerSorting[0]?.desc ? -1 : 1
      transformedCustomers.sort((a, b) => {
        let aVal: any = a[sortBy as keyof Customer]
        let bVal: any = b[sortBy as keyof Customer]

        if (sortBy === 'contact') {
          aVal = a.contact.name
          bVal = b.contact.name
        }

        if (aVal < bVal) return -1 * sortOrder
        if (aVal > bVal) return 1 * sortOrder
        return 0
      })

      const start = page * perPage
      const end = start + perPage
      const paginatedCustomers = transformedCustomers.slice(start, end)

      setCustomers(paginatedCustomers)
      setTotalCustomers(transformedCustomers.length)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to load customers')
      setCustomers([])
      setTotalCustomers(0)
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [customerSorting])

  // Fetch pets function
  const loadPets = useCallback(async (page: number, perPage: number, statuses?: string[], search?: string) => {
    try {
      setIsLoadingPets(true)

      const apiPets = await petService.getAllPets()

      let transformedPets: Pet[] = apiPets.map(pet => ({
        id: pet.id.toString(),
        name: pet.name,
        accountName: pet.account_name || "",
        accountId: pet.customer_id.toString(),
        breed: pet.breed || pet.species,
        lastGroomed: null,
        nextGrooming: null,
        overdue: 0,
        notes: pet.special_notes || "",
        status: "active" as const,
      }))

      if (statuses && statuses.length > 0) {
        transformedPets = transformedPets.filter(p => statuses.includes(p.status))
      }

      if (search) {
        const searchLower = search.toLowerCase()
        transformedPets = transformedPets.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.breed.toLowerCase().includes(searchLower) ||
          p.accountName.toLowerCase().includes(searchLower)
        )
      }

      const sortBy = petSorting[0]?.id || 'name'
      const sortOrder = petSorting[0]?.desc ? -1 : 1
      transformedPets.sort((a, b) => {
        let aVal: any = a[sortBy as keyof Pet]
        let bVal: any = b[sortBy as keyof Pet]

        if (aVal < bVal) return -1 * sortOrder
        if (aVal > bVal) return 1 * sortOrder
        return 0
      })

      const start = page * perPage
      const end = start + perPage
      const paginatedPets = transformedPets.slice(start, end)

      setPets(paginatedPets)
      setTotalPets(transformedPets.length)
    } catch (error) {
      console.error('Error fetching pets:', error)
      toast.error('Failed to load pets')
      setPets([])
      setTotalPets(0)
    } finally {
      setIsLoadingPets(false)
    }
  }, [petSorting])

  // Customer handlers
  const handleCustomerPaginationChange = useCallback((pageIndex: number, pageSize: number) => {
    setCustomerCurrentPage(pageIndex)
    setCustomerCurrentPageSize(pageSize)
    updateCustomerUrlParams({ page: pageIndex, pageSize })
  }, [updateCustomerUrlParams])

  const handleCustomerFilterChange = useCallback((statuses: string[]) => {
    setCustomerStatusFilter(statuses)
    setCustomerCurrentPage(0)
    updateCustomerUrlParams({ page: 0, statuses })
  }, [updateCustomerUrlParams])

  const handleCustomerSortingChange = useCallback((newSorting: SortingState) => {
    setCustomerSorting(newSorting)
    const sortBy = newSorting[0]?.id || 'account'
    const sortOrder = newSorting[0]?.desc ? 'desc' : 'asc'
    updateCustomerUrlParams({ sortBy, sortOrder })
  }, [updateCustomerUrlParams])

  const handleCustomerSearchChange = useCallback((search: string) => {
    setCustomerSearchQuery(search)
    setCustomerCurrentPage(0)
    updateCustomerUrlParams({ page: 0, search })
  }, [updateCustomerUrlParams])

  // Pet handlers
  const handlePetPaginationChange = useCallback((pageIndex: number, pageSize: number) => {
    setPetCurrentPage(pageIndex)
    setPetCurrentPageSize(pageSize)
    updatePetUrlParams({ page: pageIndex, pageSize })
  }, [updatePetUrlParams])

  const handlePetFilterChange = useCallback((statuses: string[]) => {
    setPetStatusFilter(statuses)
    setPetCurrentPage(0)
    updatePetUrlParams({ page: 0, statuses })
  }, [updatePetUrlParams])

  const handlePetSortingChange = useCallback((newSorting: SortingState) => {
    setPetSorting(newSorting)
    const sortBy = newSorting[0]?.id || 'name'
    const sortOrder = newSorting[0]?.desc ? 'desc' : 'asc'
    updatePetUrlParams({ sortBy, sortOrder })
  }, [updatePetUrlParams])

  const handlePetSearchChange = useCallback((search: string) => {
    setPetSearchQuery(search)
    setPetCurrentPage(0)
    updatePetUrlParams({ page: 0, search })
  }, [updatePetUrlParams])

  // Load customers when their params change
  useEffect(() => {
    loadCustomers(customerCurrentPage, customerCurrentPageSize, customerStatusFilter, customerSearchQuery)
  }, [customerCurrentPage, customerCurrentPageSize, customerStatusFilter, customerSearchQuery, customerSorting, loadCustomers])

  // Load pets when their params change
  useEffect(() => {
    loadPets(petCurrentPage, petCurrentPageSize, petStatusFilter, petSearchQuery)
  }, [petCurrentPage, petCurrentPageSize, petStatusFilter, petSearchQuery, petSorting, loadPets])

  const handleCreateCustomer = () => {
    navigate('/customers/add')
  }

  const handleCreatePet = () => {
    alert('Create pet functionality would go here')
  }

  return (
    <AppLayout>
      <header className="flex h-12 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 w-full">
          <div className="ml-auto">
            {activeTab === 'customers' ? (
              <Button onClick={handleCreateCustomer} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            ) : (
              <Button onClick={handleCreatePet} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Pet
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:px-6 lg:px-8 pt-0 w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="pets">Pets</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="flex-1">
            {isLoadingCustomers && customers.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading customers...</p>
              </div>
            ) : (
              <CustomersTable
                data={customers}
                columns={customersColumns}
                pageCount={Math.ceil(totalCustomers / customerCurrentPageSize)}
                totalItems={totalCustomers}
                currentPage={customerCurrentPage}
                currentPageSize={customerCurrentPageSize}
                onPaginationChange={handleCustomerPaginationChange}
                onFilterChange={handleCustomerFilterChange}
                sorting={customerSorting}
                onSortingChange={handleCustomerSortingChange}
                searchQuery={customerSearchQuery}
                onSearchChange={handleCustomerSearchChange}
              />
            )}
          </TabsContent>

          <TabsContent value="pets" className="flex-1">
            {isLoadingPets && pets.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading pets...</p>
              </div>
            ) : (
              <PetsTable
                data={pets}
                columns={petsColumns}
                pageCount={Math.ceil(totalPets / petCurrentPageSize)}
                totalItems={totalPets}
                currentPage={petCurrentPage}
                currentPageSize={petCurrentPageSize}
                onPaginationChange={handlePetPaginationChange}
                onFilterChange={handlePetFilterChange}
                sorting={petSorting}
                onSortingChange={handlePetSortingChange}
                searchQuery={petSearchQuery}
                onSearchChange={handlePetSearchChange}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
