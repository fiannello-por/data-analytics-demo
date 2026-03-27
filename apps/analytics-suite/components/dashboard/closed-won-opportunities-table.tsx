'use client';

import * as React from 'react';
import {
  functionalUpdate,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnSizingState,
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
const COLUMN_SIZING_STORAGE_KEY =
  'analytics-suite.closed-won-opportunities.column-sizing.v1';

type ColumnMeta = {
  headClassName?: string;
  cellClassName?: string;
};

const COLUMN_WIDTHS = {
  accountName: { size: 220, minSize: 160, maxSize: 320 },
  opportunityName: { size: 240, minSize: 180, maxSize: 340 },
  closeDate: { size: 132, minSize: 116, maxSize: 180 },
  createdDate: { size: 132, minSize: 116, maxSize: 180 },
  division: { size: 132, minSize: 100, maxSize: 180 },
  type: { size: 120, minSize: 96, maxSize: 160 },
  productFamily: { size: 140, minSize: 108, maxSize: 200 },
  bookingPlanOppType2025: { size: 220, minSize: 160, maxSize: 320 },
  owner: { size: 140, minSize: 112, maxSize: 220 },
  sdr: { size: 120, minSize: 96, maxSize: 180 },
  oppRecordType: { size: 128, minSize: 104, maxSize: 180 },
  age: { size: 112, minSize: 88, maxSize: 150 },
  se: { size: 112, minSize: 88, maxSize: 180 },
  quarter: { size: 120, minSize: 100, maxSize: 160 },
  contractStartDate: { size: 168, minSize: 136, maxSize: 220 },
  users: { size: 108, minSize: 88, maxSize: 160 },
  acv: { size: 132, minSize: 108, maxSize: 180 },
} satisfies Record<string, { size: number; minSize: number; maxSize: number }>;

function readStoredColumnSizing(): ColumnSizingState {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(COLUMN_SIZING_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed == null) {
      return {};
    }

    return Object.entries(parsed).reduce<ColumnSizingState>(
      (accumulator, [key, value]) => {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          accumulator[key] = value;
        }

        return accumulator;
      },
      {},
    );
  } catch {
    return {};
  }
}

function OpportunityLink({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return (
      <span className="block w-full truncate text-foreground">{label}</span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block w-full truncate font-medium text-foreground transition-colors hover:text-accent-brand"
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

function renderCellContent(content: React.ReactNode): React.ReactNode {
  if (typeof content === 'string' || typeof content === 'number') {
    return <span className="block w-full truncate">{content}</span>;
  }

  return content;
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
  const iconClassName =
    sortState === false
      ? 'opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'
      : 'opacity-100';

  return (
    <button
      type="button"
      className={cn(
        'group flex h-full w-full items-center gap-1.5 bg-transparent px-0 py-0 text-left font-medium text-foreground/90 outline-none transition-colors hover:bg-transparent hover:text-foreground focus-visible:outline-none',
        className,
      )}
      onClick={() => column.toggleSorting(sortState === 'asc')}
    >
      <span>{title}</span>
      <Icon
        className={cn('size-3.5 shrink-0 text-muted-foreground', iconClassName)}
      />
    </button>
  );
}

function getColumns(): Array<ColumnDef<ClosedWonOpportunityRow>> {
  return [
    {
      accessorKey: 'accountName',
      ...COLUMN_WIDTHS.accountName,
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
        cellClassName: 'text-foreground',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'opportunityName',
      ...COLUMN_WIDTHS.opportunityName,
      sortingFn: 'text',
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
        cellClassName: 'text-foreground',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'closeDate',
      ...COLUMN_WIDTHS.closeDate,
      header: ({ column }) => (
        <SortableHeader column={column} title="Close Date" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'createdDate',
      ...COLUMN_WIDTHS.createdDate,
      header: ({ column }) => (
        <SortableHeader column={column} title="Created Date" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'division',
      ...COLUMN_WIDTHS.division,
      header: ({ column }) => (
        <SortableHeader column={column} title="Division" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'type',
      ...COLUMN_WIDTHS.type,
      header: ({ column }) => <SortableHeader column={column} title="Type" />,
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'productFamily',
      ...COLUMN_WIDTHS.productFamily,
      header: ({ column }) => (
        <SortableHeader column={column} title="Product" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'bookingPlanOppType2025',
      ...COLUMN_WIDTHS.bookingPlanOppType2025,
      header: ({ column }) => (
        <SortableHeader column={column} title="Booking Plan Opp Type 2025" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'owner',
      ...COLUMN_WIDTHS.owner,
      header: ({ column }) => <SortableHeader column={column} title="Owner" />,
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'sdr',
      ...COLUMN_WIDTHS.sdr,
      header: ({ column }) => <SortableHeader column={column} title="SDR" />,
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'oppRecordType',
      ...COLUMN_WIDTHS.oppRecordType,
      header: ({ column }) => (
        <SortableHeader column={column} title="POR / R360" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'age',
      ...COLUMN_WIDTHS.age,
      header: ({ column }) => <SortableHeader column={column} title="Age" />,
      sortingFn: (rowA, rowB, columnId) =>
        parseInteger(String(rowA.getValue(columnId))) -
        parseInteger(String(rowB.getValue(columnId))),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'se',
      ...COLUMN_WIDTHS.se,
      header: ({ column }) => <SortableHeader column={column} title="SE" />,
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'quarter',
      ...COLUMN_WIDTHS.quarter,
      header: ({ column }) => (
        <SortableHeader column={column} title="Quarter" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'contractStartDate',
      ...COLUMN_WIDTHS.contractStartDate,
      header: ({ column }) => (
        <SortableHeader column={column} title="Contract Start Date" />
      ),
      meta: {} satisfies ColumnMeta,
    },
    {
      accessorKey: 'users',
      ...COLUMN_WIDTHS.users,
      header: ({ column }) => (
        <SortableHeader column={column} title="Users" className="justify-end" />
      ),
      sortingFn: (rowA, rowB, columnId) =>
        parseInteger(String(rowA.getValue(columnId))) -
        parseInteger(String(rowB.getValue(columnId))),
      meta: {
        headClassName: 'text-right',
        cellClassName: 'text-right tabular-nums text-foreground',
      } satisfies ColumnMeta,
    },
    {
      accessorKey: 'acv',
      ...COLUMN_WIDTHS.acv,
      header: ({ column }) => (
        <SortableHeader column={column} title="ACV $" className="justify-end" />
      ),
      sortingFn: (rowA, rowB, columnId) =>
        parseCurrency(String(rowA.getValue(columnId))) -
        parseCurrency(String(rowB.getValue(columnId))),
      meta: {
        headClassName: 'text-right',
        cellClassName: 'text-right font-medium tabular-nums text-foreground',
      } satisfies ColumnMeta,
    },
  ];
}

function getColumnWidthStyle(size: number): React.CSSProperties {
  return {
    width: `${size}px`,
    minWidth: `${size}px`,
    maxWidth: `${size}px`,
  };
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
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [hasLoadedColumnSizing, setHasLoadedColumnSizing] =
    React.useState(false);

  React.useEffect(() => {
    setColumnSizing(readStoredColumnSizing());
    setHasLoadedColumnSizing(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoadedColumnSizing || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      COLUMN_SIZING_STORAGE_KEY,
      JSON.stringify(columnSizing),
    );
  }, [columnSizing, hasLoadedColumnSizing]);

  const table = useReactTable({
    data: payload.rows,
    columns,
    defaultColumn: {
      minSize: 96,
      size: 140,
      maxSize: 360,
    },
    state: { sorting, pagination, columnSizing },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnSizingChange: (updater) =>
      setColumnSizing((current) => functionalUpdate(updater, current)),
    columnResizeMode: 'onChange',
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
              <Table
                className="table-fixed"
                style={{ width: table.getTotalSize(), minWidth: '100%' }}
              >
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
                              'relative h-11 overflow-hidden border-border/80 text-xs font-semibold tracking-wide text-foreground/90',
                              meta?.headClassName,
                            )}
                            style={getColumnWidthStyle(header.getSize())}
                          >
                            {header.isPlaceholder ? null : (
                              <div className="flex h-full items-center pr-3">
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                </div>
                              </div>
                            )}
                            {header.column.getCanResize() ? (
                              <button
                                type="button"
                                aria-label={`Resize ${header.column.id} column`}
                                data-column-resizer={header.column.id}
                                className={cn(
                                  'absolute top-0 right-0 h-full w-3 cursor-col-resize touch-none select-none border-0 bg-transparent p-0 outline-none',
                                  header.column.getIsResizing()
                                    ? 'bg-transparent'
                                    : 'hover:bg-transparent',
                                )}
                                onClick={(event) => event.preventDefault()}
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    'absolute top-1/2 right-1 h-6 w-px -translate-y-1/2 bg-border/80 transition-colors',
                                    header.column.getIsResizing() &&
                                      'bg-border',
                                  )}
                                />
                              </button>
                            ) : null}
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
                              'min-w-0 overflow-hidden py-3 align-top',
                              meta?.cellClassName,
                            )}
                            style={getColumnWidthStyle(cell.column.getSize())}
                          >
                            <div className="min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap">
                              {renderCellContent(
                                flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                ),
                              )}
                            </div>
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
