import { useState, useCallback, useEffect } from "react"
import { Plus } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import type { SortingState } from "@tanstack/react-table"
import { petService } from "@/services/petService"
import { toast } from "sonner"

import { AppLayout } from "@/components/app-layout"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import type { Pet } from "@/types/pet"
import { PetsTable } from "@/components/data-table/pets-table"
import { petsColumns } from "@/components/data-table/pets-columns"

export default function Pets() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize state from URL params
  const [pets, setPets] = useState<Pet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPets, setTotalPets] = useState(0)

  // Get initial values from URL or defaults
  const initialPage = parseInt(searchParams.get('page') || '0')
  const initialPageSize = parseInt(searchParams.get('pageSize') || '20')
  const initialSearch = searchParams.get('search') || ''
  const initialSortBy = searchParams.get('sortBy') || 'name'
  const initialSortOrder = searchParams.get('sortOrder') === 'desc'
  const initialStatuses = searchParams.get('statuses')?.split(',').filter(Boolean) || []

  const [statusFilter, setStatusFilter] = useState<string[]>(initialStatuses)
  const [sorting, setSorting] = useState<SortingState>([{ id: initialSortBy, desc: initialSortOrder }])
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize)

  // Initialize URL params on first load if they don't exist
  useEffect(() => {
    const hasParams = searchParams.toString().length > 0
    if (!hasParams) {
      const newParams = new URLSearchParams()
      newParams.set('page', '0')
      newParams.set('pageSize', '20')
      newParams.set('sortBy', 'name')
      newParams.set('sortOrder', 'asc')
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync state with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '0')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') === 'desc'
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || []

    setCurrentPage(page)
    setCurrentPageSize(pageSize)
    setSearchQuery(search)
    setSorting([{ id: sortBy, desc: sortOrder }])
    setStatusFilter(statuses)
  }, [searchParams])

  // Update URL params whenever state changes
  const updateUrlParams = useCallback((params: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortOrder?: string
    statuses?: string[]
  }) => {
    const newParams = new URLSearchParams(searchParams)

    if (params.page !== undefined) newParams.set('page', params.page.toString())
    if (params.pageSize !== undefined) newParams.set('pageSize', params.pageSize.toString())
    if (params.search !== undefined) {
      if (params.search) {
        newParams.set('search', params.search)
      } else {
        newParams.delete('search')
      }
    }
    if (params.sortBy !== undefined) newParams.set('sortBy', params.sortBy)
    if (params.sortOrder !== undefined) newParams.set('sortOrder', params.sortOrder)
    if (params.statuses !== undefined) {
      if (params.statuses.length > 0) {
        newParams.set('statuses', params.statuses.join(','))
      } else {
        newParams.delete('statuses')
      }
    }

    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams])

  // Fetch pets function from API
  const loadPets = useCallback(async (page: number, perPage: number, statuses?: string[], search?: string) => {
    try {
      setIsLoading(true)

      // Fetch all pets from API
      const apiPets = await petService.getAllPets()

      // Transform API data to Pet type expected by frontend
      let transformedPets: Pet[] = apiPets.map(pet => ({
        id: pet.id.toString(),
        name: pet.name,
        accountName: pet.account_name || "",
        accountId: pet.customer_id.toString(),
        breed: pet.breed || pet.species,
        lastGroomed: null, // TODO: Get from appointments
        nextGrooming: null, // TODO: Get from appointments
        overdue: 0, // TODO: Calculate from appointments
        notes: pet.special_notes || "",
        status: "active" as const, // TODO: Determine status logic
      }))

      // Apply status filter
      if (statuses && statuses.length > 0) {
        transformedPets = transformedPets.filter(p => statuses.includes(p.status))
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase()
        transformedPets = transformedPets.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.breed.toLowerCase().includes(searchLower) ||
          p.accountName.toLowerCase().includes(searchLower)
        )
      }

      // Apply sorting
      const sortBy = sorting[0]?.id || 'name'
      const sortOrder = sorting[0]?.desc ? -1 : 1
      transformedPets.sort((a, b) => {
        let aVal: any = a[sortBy as keyof Pet]
        let bVal: any = b[sortBy as keyof Pet]

        if (aVal < bVal) return -1 * sortOrder
        if (aVal > bVal) return 1 * sortOrder
        return 0
      })

      // Apply pagination
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
      setIsLoading(false)
    }
  }, [sorting])

  // Handle pagination change from table
  const handlePaginationChange = useCallback((pageIndex: number, pageSize: number) => {
    setCurrentPage(pageIndex)
    setCurrentPageSize(pageSize)
    updateUrlParams({ page: pageIndex, pageSize })
  }, [updateUrlParams])

  // Handle filter change from table
  const handleFilterChange = useCallback((statuses: string[]) => {
    setStatusFilter(statuses)
    setCurrentPage(0)
    updateUrlParams({ page: 0, statuses })
  }, [updateUrlParams])

  // Handle sorting change from table
  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting)
    const sortBy = newSorting[0]?.id || 'name'
    const sortOrder = newSorting[0]?.desc ? 'desc' : 'asc'
    updateUrlParams({ sortBy, sortOrder })
  }, [updateUrlParams])

  // Handle search change from toolbar
  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search)
    setCurrentPage(0)
    updateUrlParams({ page: 0, search })
  }, [updateUrlParams])

  // Load pets when URL params change
  useEffect(() => {
    loadPets(currentPage, currentPageSize, statusFilter, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, currentPageSize, statusFilter, searchQuery, sorting])

  const handleCreate = () => {
    alert('Create pet functionality would go here')
  }

  return (
    <AppLayout>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 w-full">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Pets</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <Button onClick={handleCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:px-6 lg:px-8 pt-0 w-full">
        {isLoading && pets.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading pets...</p>
          </div>
        ) : (
          <PetsTable
            data={pets}
            columns={petsColumns}
            pageCount={Math.ceil(totalPets / currentPageSize)}
            totalItems={totalPets}
            currentPage={currentPage}
            currentPageSize={currentPageSize}
            onPaginationChange={handlePaginationChange}
            onFilterChange={handleFilterChange}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
