'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CircleCheck,
  ExternalLink,
  FileText,
  Loader,
  MoreHorizontal,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { HomepageModuleRow } from '@/lib/suite/homepage-metadata';
import { cn } from '@/lib/utils';

type DashboardModulesTableProps = {
  rows: HomepageModuleRow[];
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function DashboardRowActions({ row }: { row: HomepageModuleRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'size-7 cursor-pointer rounded-[5px] border border-white/0 bg-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-white aria-expanded:border-white/10 aria-expanded:bg-white/[0.04] aria-expanded:text-white data-[popup-open]:border-white/10 data-[popup-open]:bg-white/[0.04] data-[popup-open]:text-white',
            )}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        }
        aria-label={`Open actions for ${row.dashboardName}`}
      />
      <DropdownMenuContent
        align="end"
        className="w-48 rounded-[9px] border border-white/10 bg-[#111111] p-1 text-white shadow-2xl"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{row.dashboardName}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={!row.href}
            nativeButton={false}
            render={
              row.href ? <Link href={row.href} /> : <div />
            }
          >
            <ExternalLink className="size-4" />
            Open dashboard
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!row.changelogHref}
            nativeButton={false}
            render={
              row.changelogHref ? (
                <Link
                  href={row.changelogHref}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer"
                />
              ) : (
                <div />
              )
            }
          >
            <FileText className="size-4" />
            Open changelog
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns: ColumnDef<HomepageModuleRow>[] = [
  {
    accessorKey: 'dashboardName',
    header: () => <span>Dashboard name</span>,
    cell: ({ row }) =>
      row.original.href ? (
        <Link
          href={row.original.href}
          className="cursor-pointer text-[14px] font-semibold tracking-[-0.01em] text-white transition-colors hover:text-white/88 hover:underline"
        >
          {row.original.dashboardName}
        </Link>
      ) : (
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-white">
          {row.original.dashboardName}
        </span>
      ),
  },
  {
    accessorKey: 'owner',
    header: () => <span>Owner</span>,
    cell: ({ row }) => <span className="text-white/82">{row.original.owner}</span>,
  },
  {
    accessorKey: 'author',
    header: () => <span>Author</span>,
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar size="sm" className="border border-white/10 bg-white/[0.04]">
          <AvatarImage
            src={row.original.author.avatarUrl}
            alt={row.original.author.name}
          />
          <AvatarFallback className="bg-white/[0.06] text-[10px] font-medium text-white/72">
            {getInitials(row.original.author.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-white/82">{row.original.author.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: () => <span>Updated at</span>,
    cell: ({ row }) =>
      row.original.changelogHref ? (
        <Link
          href={row.original.changelogHref}
          target="_blank"
          rel="noreferrer"
          className="cursor-pointer text-white/64 transition-colors hover:text-white/88 hover:underline"
        >
          {new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(row.original.updatedAt))}
        </Link>
      ) : (
        <span className="text-white/64">
          {new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(row.original.updatedAt))}
        </span>
      ),
  },
  {
    accessorKey: 'statusLabel',
    header: () => <span>Status</span>,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="inline-flex h-6 items-center gap-1.5 rounded-[999px] border-white/10 bg-transparent px-2 py-0 text-[11px] font-medium text-white/78"
      >
        {row.original.statusLabel === 'Live' ? (
          <CircleCheck className="size-3 fill-emerald-400 text-[#0b0b0b]" />
        ) : (
          <Loader className="size-3 text-white/56" />
        )}
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
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="overflow-hidden rounded-[12px] border border-white/10 bg-[#0b0b0b] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
      <Table className="table-fixed text-[13px] text-white/88">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-white/10 bg-[#242424] hover:bg-[#242424]"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    header.column.id === 'dashboardName' && 'w-[32%]',
                    header.column.id === 'owner' && 'w-[14%]',
                    header.column.id === 'author' && 'w-[16%]',
                    header.column.id === 'updatedAt' && 'w-[16%]',
                    header.column.id === 'statusLabel' && 'w-[14%]',
                    header.column.id === 'actions' && 'w-16 text-right',
                    'h-11 px-5 text-[14px] font-medium tracking-[-0.01em] text-white/92',
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
            <TableRow
              key={row.id}
              className="border-white/10 bg-transparent hover:bg-white/[0.05]"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    cell.column.id === 'actions' && 'text-right',
                    'h-12 px-5 py-0 text-white/88',
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:gap-5">
        <div className="flex items-center gap-3 text-[13px] text-white/58">
          <span>Rows per page</span>
          <div className="inline-flex h-7 items-center gap-2 rounded-[7px] border border-white/10 bg-white/[0.04] px-2.5 text-white/88">
            <span>{table.getState().pagination.pageSize}</span>
            <ChevronDown className="size-3.5 text-white/45" />
          </div>
        </div>

        <p className="text-[13px] text-white/58">
          Page {currentPage} of {pageCount}
        </p>

        <Pagination className="mx-0 w-auto justify-start">
          <PaginationContent className="gap-2">
            <PaginationItem>
              <button
                type="button"
                aria-label="First page"
                className="flex size-8 items-center justify-center rounded-[7px] border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="size-3.5" />
              </button>
            </PaginationItem>
            <PaginationItem>
              <button
                type="button"
                aria-label="Previous"
                className="flex size-8 items-center justify-center rounded-[7px] border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </PaginationItem>
            <PaginationItem>
              <button
                type="button"
                aria-label="Next"
                className="flex size-8 items-center justify-center rounded-[7px] border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </PaginationItem>
            <PaginationItem>
              <button
                type="button"
                aria-label="Last page"
                className="flex size-8 items-center justify-center rounded-[7px] border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => table.setPageIndex(pageCount - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="size-3.5" />
              </button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
