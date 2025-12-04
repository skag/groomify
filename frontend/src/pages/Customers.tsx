import { useState, useCallback, useEffect } from "react"
import { Plus, Users as UsersIcon } from "lucide-react"
import { useSearchParams, useNavigate } from "react-router-dom"
import type { SortingState } from "@tanstack/react-table"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import type { Customer } from "@/types/customer"
import { CustomersTable } from "@/components/data-table/customers-table"
import { customersColumns } from "@/components/data-table/customers-columns"
import { mockCustomers } from "@/data/mockCustomers"
import { customerService } from "@/services/customerService"
import { toast } from "sonner"

export default function Customers() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize state from URL params
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCustomers, setTotalCustomers] = useState(0)

  // Get initial values from URL or defaults
  const initialPage = parseInt(searchParams.get('page') || '0')
  const initialPageSize = parseInt(searchParams.get('pageSize') || '20')
  const initialSearch = searchParams.get('search') || ''
  const initialSortBy = searchParams.get('sortBy') || 'account'
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
      newParams.set('sortBy', 'account')
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
    const sortBy = searchParams.get('sortBy') || 'account'
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

  // Fetch customers function
  const loadCustomers = useCallback(async (page: number, perPage: number, statuses?: string[], search?: string) => {
    try {
      setIsLoading(true)

      // Fetch from API
      const apiCustomers = await customerService.getAllCustomers()

      // Transform API data to match table format
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
          lastAppointment: null, // TODO: Get from appointments
          nextAppointment: null, // TODO: Get from appointments
          due: 0, // TODO: Calculate from last appointment
          status: apiCustomer.status as "active" | "inactive",
        }
      })

      // Apply status filter
      if (statuses && statuses.length > 0) {
        transformedCustomers = transformedCustomers.filter(c => statuses.includes(c.status))
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase()
        transformedCustomers = transformedCustomers.filter(c =>
          c.account.toLowerCase().includes(searchLower) ||
          c.contact.name.toLowerCase().includes(searchLower) ||
          c.contact.email.toLowerCase().includes(searchLower)
        )
      }

      // Apply sorting
      const sortBy = sorting[0]?.id || 'account'
      const sortOrder = sorting[0]?.desc ? -1 : 1
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

      // Apply pagination
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
    const sortBy = newSorting[0]?.id || 'account'
    const sortOrder = newSorting[0]?.desc ? 'desc' : 'asc'
    updateUrlParams({ sortBy, sortOrder })
  }, [updateUrlParams])

  // Handle search change from toolbar
  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search)
    setCurrentPage(0)
    updateUrlParams({ page: 0, search })
  }, [updateUrlParams])

  // Load customers when URL params change
  useEffect(() => {
    loadCustomers(currentPage, currentPageSize, statusFilter, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, currentPageSize, statusFilter, searchQuery, sorting])

  const handleCreate = () => {
    navigate('/customers/add')
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
                  <BreadcrumbPage>Customers</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <Button onClick={handleCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {isLoading && customers.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading customers...</p>
            </div>
          ) : (
            <CustomersTable
              data={customers}
              columns={customersColumns}
              pageCount={Math.ceil(totalCustomers / currentPageSize)}
              totalItems={totalCustomers}
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
      </SidebarInset>
    </SidebarProvider>
  )
}
