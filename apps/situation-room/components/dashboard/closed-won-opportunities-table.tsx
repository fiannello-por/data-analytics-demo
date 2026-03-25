'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import type {
  ClosedWonOpportunitiesPayload,
  ClosedWonOpportunityRow,
} from '@/lib/dashboard/contracts';
import { TileBackendSheet } from '@/components/dashboard/tile-backend-sheet';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 10;

type ColumnMeta = {
  headClassName?: string;
  cellClassName?: string;
};

function OpportunityLink({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return <span className="text-foreground">{label}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-foreground transition-colors hover:text-accent-brand"
    >
      {label}
    </a>
  );
}

function parseInteger(value: string): number {
  const normalized = value.replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCurrency(value: string): number {
  const normalized = value.replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function SortableHeader({
  column,
  title,
  className,
}: {
  column: {
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
  title: string;
  className?: string;
}) {
  const sortState = column.getIsSorted();
  const Icon =
    sortState === 'asc'
      ? ArrowUpIcon
      : sortState === 'desc'
        ? ArrowDownIcon
        : ArrowUpDownIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-auto justify-start gap-1.5 px-0 py-0 font-medium text-foreground/90 hover:bg-transparent hover:text-foreground',
        className,
      )}
      onClick={() => column.toggleSorting(sortState === 'asc')}
    >
      <span>{title}</span>
      <Icon className="size-3.5 text-muted-foreground" />
    </Button>
  );
}

function getColumns(): Array<ColumnDef<ClosedWonOpportunityRow>> {
  return [
    {
      accessorKey: 'accountName',
      header: ({ column }) => (
        <SortableHeader column={column} title="Account" />
      ),
      cell: ({ row }) => (
        <OpportunityLink
          href={row.original.accountLink}
          label={row.original.accountName}
        />
      ),
      meta: {
        headClassName: 'min-w-40',
        cellClassName: 'min-w-40 text-foreground',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'opportunityName',
      header: ({ column }) => (
        <SortableHeader column={column} title="Opportunity" />
      ),
      cell: ({ row }) => (
        <OpportunityLink
          href={row.original.opportunityLink}
          label={row.original.opportunityName}
        />
      ),
      meta: {
        headClassName: 'min-w-44',
        cellClassName: 'min-w-44 text-foreground',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'closeDate',
      header: ({ column }) => (
        <SortableHeader column={column} title="Close Date" />
      ),
      meta: {
        headClassName: 'min-w-28',
        cellClassName: 'min-w-28',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'createdDate',
      header: ({ column }) => (
        <SortableHeader column={column} title="Created Date" />
      ),
      meta: {
        headClassName: 'min-w-28',
        cellClassName: 'min-w-28',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'division',
      header: 'Division',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-24',
        cellClassName: 'min-w-24',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-20',
        cellClassName: 'min-w-20',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'productFamily',
      header: 'Product',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-28',
        cellClassName: 'min-w-28',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'bookingPlanOppType2025',
      header: 'Booking Plan Opp Type 2025',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-44',
        cellClassName: 'min-w-44',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'owner',
      header: ({ column }) => <SortableHeader column={column} title="Owner" />,
      meta: {
        headClassName: 'min-w-28',
        cellClassName: 'min-w-28',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'sdr',
      header: 'SDR',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-20',
        cellClassName: 'min-w-20',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'oppRecordType',
      header: 'POR / R360',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-24',
        cellClassName: 'min-w-24',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'age',
      header: 'Age',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-20',
        cellClassName: 'min-w-20',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'se',
      header: 'SE',
      enableSorting: false,
      meta: {
        headClassName: 'min-w-20',
        cellClassName: 'min-w-20',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'quarter',
      header: ({ column }) => (
        <SortableHeader column={column} title="Quarter" />
      ),
      meta: {
        headClassName: 'min-w-24',
        cellClassName: 'min-w-24',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'contractStartDate',
      header: ({ column }) => (
        <SortableHeader column={column} title="Contract Start Date" />
      ),
      meta: {
        headClassName: 'min-w-36',
        cellClassName: 'min-w-36',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'users',
      header: ({ column }) => (
        <SortableHeader column={column} title="Users" className="justify-end" />
      ),
      sortingFn: (rowA, rowB, columnId) =>
        parseInteger(String(rowA.getValue(columnId))) -
        parseInteger(String(rowB.getValue(columnId))),
      meta: {
        headClassName: 'min-w-20 text-right',
        cellClassName: 'min-w-20 text-right tabular-nums text-foreground',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'acv',
      header: ({ column }) => (
        <SortableHeader column={column} title="ACV $" className="justify-end" />
      ),
      sortingFn: (rowA, rowB, columnId) =>
        parseCurrency(String(rowA.getValue(columnId))) -
        parseCurrency(String(rowB.getValue(columnId))),
      meta: {
        headClassName: 'min-w-24 text-right',
        cellClassName:
          'min-w-24 text-right font-medium tabular-nums text-foreground',
      } satisfies ColumnMeta,
    },
  ];
}

export function ClosedWonOpportunitiesTable({
  payload,
}: {
  payload: ClosedWonOpportunitiesPayload;
}) {
  const columns = React.useMemo(() => getColumns(), []);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'acv', desc: true },
  ]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const table = useReactTable({
    data: payload.rows,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRows = payload.rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow =
    totalRows === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <Card className="group border-border/70 bg-card shadow-none">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Closed Won Opportunities</CardTitle>
            <CardDescription>
              Current-period closed won opportunities for {payload.category}.
              Sort by key columns and paginate through the current result set.
            </CardDescription>
          </div>
          <TileBackendSheet
            title="Closed Won Opportunities"
            trace={payload.backendTrace}
            triggerClassName="group-hover:opacity-100"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalRows === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-background/50 px-4 py-8 text-sm text-muted-foreground">
            No closed won opportunities for the selected filters and current
            period.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-md border border-border/70 bg-background/60">
              <Table>
                <TableHeader className="[&_tr]:border-border/80">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="bg-muted/30 hover:bg-muted/30"
                    >
                      {headerGroup.headers.map((header) => {
                        const meta = header.column.columnDef.meta as
                          | ColumnMeta
                          | undefined;

                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              'h-11 border-border/80 text-xs font-semibold tracking-wide text-foreground/90',
                              meta?.headClassName,
                            )}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="text-muted-foreground">
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-border/60 hover:bg-muted/20"
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as
                          | ColumnMeta
                          | undefined;

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              'py-3 align-top',
                              meta?.cellClassName,
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {startRow}-{endRow} of {totalRows}
              </div>

              <div className="flex items-center justify-end gap-2">
                <div className="text-sm text-muted-foreground">
                  Page {pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeftIcon className="size-3.5" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ClosedWonOpportunitiesTableSkeleton() {
  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <CardTitle>Closed Won Opportunities</CardTitle>
        <CardDescription>
          Loading current-period closed won opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-md border border-border/70 bg-background/60">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {Array.from({ length: 8 }).map((_, index) => (
                  <TableHead key={index} className="h-11">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {Array.from({ length: 8 }).map((__, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
