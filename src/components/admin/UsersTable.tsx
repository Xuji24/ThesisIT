'use client';

import { useState } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: 'STUDENT' | 'ADMIN';
  created_at: string;
  last_seen_at: string;
}

const columns: ColumnDef<AdminUserRow>[] = [
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'full_name',
    header: 'Name',
    cell: ({ getValue }) => (getValue<string | null>() ?? '—'),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ getValue }) => {
      const role = getValue<string>();
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            role === 'ADMIN' ? 'bg-accent-soft text-accent-hover' : 'bg-surface-sunken text-ink-secondary'
          }`}
        >
          {role}
        </span>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
  },
  {
    accessorKey: 'last_seen_at',
    header: 'Last seen',
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
  },
];

export default function UsersTable({ data }: { data: AdminUserRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <Input
          placeholder="Search by email or name…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-line-hairline bg-surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line-hairline text-left text-ink-muted">
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2.5 font-medium">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-ink-primary transition-colors"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <ArrowUpDown className="w-3 h-3" />}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line-hairline">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 text-ink-primary">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-ink-muted">
                  No users match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-ink-muted">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1} ·{' '}
          {table.getFilteredRowModel().rows.length} user{table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-md border border-line-hairline disabled:opacity-40 hover:bg-surface-sunken transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-md border border-line-hairline disabled:opacity-40 hover:bg-surface-sunken transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
