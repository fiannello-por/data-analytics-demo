'use client';

// apps/challenger/components/closed-won-section.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  CLOSED_WON_DIMENSIONS,
  type Category,
  type DashboardFilters,
  type DateRange,
} from '@por/dashboard-constants';

import type { ClosedWonSort, DashboardAction } from '@/lib/dashboard-reducer';
import type { ClosedWonRow } from '@/lib/closed-won-loader';
import { useClosedWon } from '@/lib/query-hooks';

import { RefreshingIndicator } from './refreshing-indicator';
import { SectionError } from './section-error';
import { SectionSkeleton } from './section-skeleton';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert snake_case dimension name to Title Case label. */
function formatHeader(dim: string): string {
  return dim
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** localStorage key for persisted column widths. */
function colWidthsKey(category: Category): string {
  return `cw-col-widths-${category}`;
}

function loadPersistedWidths(category: Category): Record<string, number> {
  try {
    const raw = localStorage.getItem(colWidthsKey(category));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function savePersistedWidths(
  category: Category,
  widths: Record<string, number>,
): void {
  try {
    localStorage.setItem(colWidthsKey(category), JSON.stringify(widths));
  } catch {
    // silently ignore quota errors
  }
}

// ── Column definitions (stable across renders) ──────────────────────────────

const columns: ColumnDef<ClosedWonRow, string>[] = CLOSED_WON_DIMENSIONS.map(
  (dim) => ({
    accessorKey: dim,
    header: formatHeader(dim),
    size: 150,
    minSize: 60,
  }),
);

// ── Props ────────────────────────────────────────────────────────────────────

type ClosedWonSectionProps = {
  category: Category;
  filters: DashboardFilters;
  dateRange: DateRange;
  page: number;
  sort: ClosedWonSort;
  enabled: boolean;
  dispatch: React.Dispatch<DashboardAction>;
};

// ── Component ────────────────────────────────────────────────────────────────

export function ClosedWonSection({
  category,
  filters,
  dateRange,
  page,
  sort,
  enabled,
  dispatch,
}: ClosedWonSectionProps) {
  const { data, isPending, isFetching, isError, error, refetch, isPlaceholderData } =
    useClosedWon(category, filters, dateRange, page, sort, { enabled });

  // Track whether the current loading is a sort change (vs page change).
  // Sort changes produce isPending (no placeholder data).
  // Page changes produce isFetching with isPlaceholderData.
  const isSortLoading = isPending && enabled;

  // ── Column widths from localStorage ──────────────────────────────────────

  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
    () => loadPersistedWidths(category),
  );

  const columnSizingRef = useRef(columnSizing);
  columnSizingRef.current = columnSizing;

  // Persist widths when they change
  useEffect(() => {
    if (Object.keys(columnSizing).length > 0) {
      savePersistedWidths(category, columnSizing);
    }
  }, [category, columnSizing]);

  // ── Sorting state bridged to reducer ─────────────────────────────────────

  const sorting: SortingState = useMemo(
    () => [{ id: sort.field, desc: sort.direction === 'desc' }],
    [sort.field, sort.direction],
  );

  const onSortingChange = useCallback(
    (updaterOrValue: SortingState | ((prev: SortingState) => SortingState)) => {
      const nextSorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(sorting)
          : updaterOrValue;
      if (nextSorting.length > 0) {
        dispatch({
          type: 'SET_CW_SORT',
          category,
          field: nextSorting[0].id,
        });
      }
    },
    [sorting, category, dispatch],
  );

  // ── Table instance ───────────────────────────────────────────────────────

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange,
    onColumnSizingChange: setColumnSizing,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
  });

  // ── Render states ────────────────────────────────────────────────────────

  if (isSortLoading) {
    return <SectionSkeleton height={400} label="closed won" />;
  }

  if (isError && !data) {
    return (
      <SectionError
        message={
          error instanceof Error
            ? error.message
            : 'Failed to load closed-won data'
        }
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data) {
    return <SectionSkeleton height={400} label="closed won" />;
  }

  const tableContent = renderTable();

  // Show error banner above stale content
  if (isError) {
    return (
      <SectionError
        message={
          error instanceof Error
            ? error.message
            : 'Failed to load closed-won data'
        }
        onRetry={() => void refetch()}
        staleContent={tableContent}
      />
    );
  }

  // Refreshing indicator for background refetches (page changes show stale data)
  if (isFetching && !isPlaceholderData) {
    return <RefreshingIndicator isRefreshing>{tableContent}</RefreshingIndicator>;
  }

  return tableContent;

  // ── Table renderer ─────────────────────────────────────────────────────

  function renderTable() {
    return (
      <div data-testid="section-ready">
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              borderCollapse: 'collapse',
              fontSize: 12,
              whiteSpace: 'nowrap',
              width: table.getTotalSize(),
            }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        style={{
                          ...thStyle,
                          width: header.getSize(),
                          position: 'relative',
                          cursor: header.column.getCanSort()
                            ? 'pointer'
                            : 'default',
                          userSelect: 'none',
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {isSorted === 'asc'
                          ? ' \u2191'
                          : isSorted === 'desc'
                            ? ' \u2193'
                            : ''}
                        {/* Column resize handle */}
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            height: '100%',
                            width: 4,
                            cursor: 'col-resize',
                            backgroundColor: header.column.getIsResizing()
                              ? '#2563eb'
                              : 'transparent',
                          }}
                        />
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      ...tdStyle,
                      color: '#9ca3af',
                      textAlign: 'center',
                    }}
                  >
                    No data
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ ...tdStyle, width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            fontSize: 13,
            color: '#374151',
          }}
        >
          <span>
            Page {data!.page} of {data!.totalPageCount} ({data!.totalResults}{' '}
            rows)
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => dispatch({ type: 'SET_CW_PAGE', page: page - 1 })}
              style={paginationBtnStyle}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= (data?.totalPageCount ?? 1)}
              onClick={() => dispatch({ type: 'SET_CW_PAGE', page: page + 1 })}
              style={paginationBtnStyle}
            >
              Next
            </button>
          </div>
        </div>

        {/* Subtle loading overlay for page changes */}
        {isPlaceholderData && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: '#9ca3af',
              padding: '2px 0',
            }}
          >
            Loading page {page}...
          </div>
        )}
      </div>
    );
  }
}

// ── Inline styles ────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '2px solid #e5e7eb',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: 12,
};

const paginationBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: 12,
  borderRadius: 4,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
};
