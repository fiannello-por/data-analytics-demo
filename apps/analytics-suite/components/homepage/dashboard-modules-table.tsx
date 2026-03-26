'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink, FileText, MoreHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BadgeProps } from '@/components/ui/badge';
import type { HomepageModuleRow } from '@/lib/suite/homepage-metadata';
import { cn } from '@/lib/utils';

type DashboardModulesTableProps = {
  rows: HomepageModuleRow[];
};

function SortableColumnHeader({
  label,
  canSort,
  isSorted,
  onToggle,
}: {
  label: string;
  canSort: boolean;
  isSorted: false | 'asc' | 'desc';
  onToggle: () => void;
}) {
  if (!canSort) {
    return <span>{label}</span>;
  }

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        'h-auto px-0 text-left font-medium hover:bg-transparent',
      )}
      onClick={onToggle}
    >
      <span>{label}</span>
      <ArrowUpDown
        className={cn(
          'size-3.5 text-muted-foreground transition-transform',
          isSorted === 'desc' && 'rotate-180',
        )}
      />
    </button>
  );
}

function getStatusVariant(
  statusLabel: HomepageModuleRow['statusLabel'],
): BadgeProps['variant'] {
  return statusLabel === 'Live' ? 'success' : 'warning';
}

function DashboardRowActions({ row }: { row: HomepageModuleRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8')}
        aria-label={`Open actions for ${row.dashboardName}`}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{row.dashboardName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          nativeButton={false}
          render={<Link href={row.href} />}
        >
          <ExternalLink className="size-4" />
          Open dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!row.changelogHref}
          nativeButton={false}
          render={
            row.changelogHref ? <Link href={row.changelogHref} /> : <div />
          }
        >
          <FileText className="size-4" />
          Open changelog
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns: ColumnDef<HomepageModuleRow>[] = [
  {
    accessorKey: 'dashboardName',
    header: ({ column }) => (
      <SortableColumnHeader
        label="Dashboard name"
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Link href={row.original.href} className="font-medium text-foreground">
          {row.original.dashboardName}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: 'owner',
    header: ({ column }) => (
      <SortableColumnHeader
        label="Owner"
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => row.original.owner,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => (
      <SortableColumnHeader
        label="Updated at"
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <time dateTime={row.original.updatedAt}>{row.original.updatedAt}</time>
    ),
  },
  {
    accessorKey: 'changelogLabel',
    header: ({ column }) => (
      <SortableColumnHeader
        label="Changelog"
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) =>
      row.original.changelogHref ? (
        <Link
          href={row.original.changelogHref}
          className="text-sm font-medium text-primary"
        >
          {row.original.changelogLabel}
        </Link>
      ) : (
        <span className="text-muted-foreground">{row.original.changelogLabel}</span>
      ),
  },
  {
    accessorKey: 'statusLabel',
    header: ({ column }) => (
      <SortableColumnHeader
        label="Status"
        canSort={column.getCanSort()}
        isSorted={column.getIsSorted()}
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => (
      <Badge variant={getStatusVariant(row.original.statusLabel)}>
        {row.original.statusLabel}
      </Badge>
    ),
  },
  {
    id: 'actions',
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DashboardRowActions row={row.original} />
      </div>
    ),
  },
];

export function DashboardModulesTable({ rows }: DashboardModulesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 5,
  });

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <Card className="overflow-hidden bg-card">
      <CardContent className="px-0 py-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === 'actions' && 'w-16 text-right',
                      'px-4',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.id === 'actions' && 'text-right',
                      'px-4 py-3',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Rows per page</span>
            <span>{table.getState().pagination.pageSize}</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {pageCount}
            </p>
            <Pagination className="mx-0 w-auto justify-start">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    type="button"
                    variant="outline"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    type="button"
                    variant="outline"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
