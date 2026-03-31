'use client';

import * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { parseChange } from '@/components/change-indicator';
import { TileBackendSheet } from '@/components/dashboard/tile-backend-sheet';
import type { CategorySnapshotPayload } from '@/lib/dashboard/contracts';
import type { Category } from '@/lib/dashboard/catalog';
import { getCategoryTiles } from '@/lib/dashboard/catalog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const changeCellStyles = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-neutral-change',
} as const;

export function getTileTableDisplayRows(snapshot: CategorySnapshotPayload) {
  const rowsByTileId = new Map(
    snapshot.rows.map((row) => [row.tileId, row] as const),
  );

  return getCategoryTiles(snapshot.category).map((tile) => {
    const row = rowsByTileId.get(tile.tileId);

    if (row) {
      return {
        kind: 'loaded' as const,
        tileId: row.tileId,
        label: row.label,
        row,
      };
    }

    return {
      kind: 'skeleton' as const,
      tileId: tile.tileId,
      label: tile.label,
      formatType: tile.formatType,
    };
  });
}

export function TileTable({
  snapshot,
  selectedTileId,
  onRowSelect,
}: {
  snapshot: CategorySnapshotPayload;
  selectedTileId: string;
  onRowSelect?: (tileId: string) => void;
}) {
  const displayRows = getTileTableDisplayRows(snapshot);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Previous</TableHead>
            <TableHead>Change</TableHead>
            <TableHead className="w-8">
              <span className="sr-only">Trend detail</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((displayRow) =>
            displayRow.kind === 'loaded' ? (
              <TableRow
                key={displayRow.tileId}
                data-state={
                  displayRow.tileId === selectedTileId ? 'selected' : undefined
                }
                className={
                  onRowSelect
                    ? 'group cursor-pointer transition-colors hover:bg-muted/50'
                    : undefined
                }
                role={onRowSelect ? 'button' : undefined}
                tabIndex={onRowSelect ? 0 : undefined}
                aria-label={
                  onRowSelect
                    ? `Select trend for ${displayRow.row.label}`
                    : undefined
                }
                onClick={
                  onRowSelect
                    ? () => onRowSelect(displayRow.row.tileId)
                    : undefined
                }
                onKeyDown={
                  onRowSelect
                    ? (event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        onRowSelect(displayRow.row.tileId);
                      }
                    : undefined
                }
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{displayRow.row.label}</span>
                    <TileBackendSheet
                      title={displayRow.row.label}
                      trace={displayRow.row.backendTrace}
                      triggerStopsPropagation
                      triggerClassName="shrink-0 group-hover:opacity-100"
                    />
                  </div>
                </TableCell>
                <TableCell>{displayRow.row.currentValue}</TableCell>
                <TableCell>{displayRow.row.previousValue}</TableCell>
                <TableCell
                  className={cn(
                    changeCellStyles[
                      parseChange(displayRow.row.pctChange).direction
                    ],
                  )}
                >
                  {displayRow.row.pctChange}
                </TableCell>
                <TableCell className="w-8 pr-3 text-right">
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="ml-auto size-4 text-muted-foreground/50 transition-all group-hover:text-foreground/80 group-data-[state=selected]:translate-x-0.5 group-data-[state=selected]:text-foreground"
                  />
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={displayRow.tileId}>
                <TableCell className="font-medium">
                  {displayRow.label}
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
                <TableCell className="w-8 pr-3">
                  <Skeleton className="ml-auto h-4 w-4 rounded-full" />
                </TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function TileTableSkeleton({ category }: { category: Category }) {
  const rows = getCategoryTiles(category);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Previous</TableHead>
            <TableHead>Change</TableHead>
            <TableHead className="w-8">
              <span className="sr-only">Trend detail</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.tileId}>
              <TableCell className="font-medium">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-14" />
              </TableCell>
              <TableCell className="w-8 pr-3">
                <Skeleton className="ml-auto h-4 w-4 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
