import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  PaginationState,
} from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Customer } from "@/types/customer"
import { DataTablePagination } from "./data-table-pagination"
import { CustomersToolbar } from "./customers-toolbar"

interface Props {
  columns: ColumnDef<Customer>[]
  data: Customer[]
  pageCount: number
  totalItems: number
  currentPage: number
  currentPageSize: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onFilterChange?: (statuses: string[]) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  searchQuery: string
  onSearchChange: (search: string) => void
}

export function CustomersTable({ columns, data, pageCount, totalItems, currentPage, currentPageSize, onPaginationChange, onFilterChange, sorting, onSortingChange, searchQuery, onSearchChange }: Props) {
  const navigate = useNavigate()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: currentPage,
    pageSize: currentPageSize,
  })

  // Sync pagination state with parent props
  useEffect(() => {
    setPagination({ pageIndex: currentPage, pageSize: currentPageSize })
  }, [currentPage, currentPageSize])

  // Use ref to store latest callback without triggering re-renders
  const onFilterChangeRef = useRef(onFilterChange)
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange
  }, [onFilterChange])

  // Notify parent when filters change (but not on initial mount)
  const isInitialMount = useRef(true)
  const prevColumnFiltersRef = useRef<ColumnFiltersState>([])
  useEffect(() => {
    // Skip the first run (initial mount)
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevColumnFiltersRef.current = columnFilters
      return
    }

    // Only notify parent if filters actually changed
    const prevFilters = prevColumnFiltersRef.current
    const filtersChanged = JSON.stringify(prevFilters) !== JSON.stringify(columnFilters)

    if (!filtersChanged) {
      return
    }

    prevColumnFiltersRef.current = columnFilters

    const statusFilter = columnFilters.find(f => f.id === 'status')
    if (onFilterChangeRef.current && statusFilter) {
      onFilterChangeRef.current(statusFilter.value as string[])
    } else if (onFilterChangeRef.current && !statusFilter) {
      onFilterChangeRef.current([])
    }
  }, [columnFilters])

  // Notify parent when pagination changes
  const handlePaginationChange = (updater: any) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater
    setPagination(newPagination)
    onPaginationChange(newPagination.pageIndex, newPagination.pageSize)
  }

  // Notify parent when sorting changes
  const handleSortingChange = (updater: any) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater
    onSortingChange(newSorting)
  }

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    manualSorting: true,
  })

  return (
    <div className="space-y-4">
      <CustomersToolbar table={table} searchQuery={searchQuery} onSearchChange={onSearchChange} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/customers/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} totalItems={totalItems} itemLabel="customers" />
    </div>
  )
}
