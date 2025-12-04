import { useState, useEffect, useRef } from "react"
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
import type { Pet } from "@/types/pet"
import { DataTablePagination } from "./data-table-pagination"
import { PetsToolbar } from "./pets-toolbar"

interface Props {
  columns: ColumnDef<Pet>[]
  data: Pet[]
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

export function PetsTable({ columns, data, pageCount, totalItems, currentPage, currentPageSize, onPaginationChange, onFilterChange, sorting, onSortingChange, searchQuery, onSearchChange }: Props) {
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
      <PetsToolbar table={table} searchQuery={searchQuery} onSearchChange={onSearchChange} />
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
                  className="cursor-pointer"
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
      <DataTablePagination table={table} totalItems={totalItems} />
    </div>
  )
}
