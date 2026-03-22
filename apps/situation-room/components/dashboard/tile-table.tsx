'use client';

import * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { parseChange } from '@/components/change-indicator';
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

export function TileTable({
  snapshot,
  selectedTileId,
  onRowSelect,
}: {
  snapshot: CategorySnapshotPayload;
  selectedTileId: string;
  onRowSelect?: (tileId: string) => void;
}) {
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
          {snapshot.rows.map((row) => (
            <TableRow
              key={row.tileId}
              data-state={row.tileId === selectedTileId ? 'selected' : undefined}
              className={
                onRowSelect
                  ? 'group cursor-pointer transition-colors hover:bg-muted/50'
                  : undefined
              }
              role={onRowSelect ? 'button' : undefined}
              tabIndex={onRowSelect ? 0 : undefined}
              aria-label={onRowSelect ? `Select trend for ${row.label}` : undefined}
              onClick={onRowSelect ? () => onRowSelect(row.tileId) : undefined}
              onKeyDown={
                onRowSelect
                  ? (event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      onRowSelect(row.tileId);
                    }
                  : undefined
              }
            >
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{row.currentValue}</TableCell>
              <TableCell>{row.previousValue}</TableCell>
              <TableCell className={cn(changeCellStyles[parseChange(row.pctChange).direction])}>
                {row.pctChange}
              </TableCell>
              <TableCell className="w-8 pr-3 text-right">
                <ChevronRightIcon
                  aria-hidden="true"
                  className="ml-auto size-4 text-muted-foreground/50 transition-all group-hover:text-foreground/80 group-data-[state=selected]:translate-x-0.5 group-data-[state=selected]:text-foreground"
                />
              </TableCell>
            </TableRow>
          ))}
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
