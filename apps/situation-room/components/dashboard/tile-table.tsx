'use client';

import * as React from 'react';
import type { CategorySnapshotPayload } from '@/lib/dashboard/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshot.rows.map((row) => (
            <TableRow
              key={row.tileId}
              data-state={row.tileId === selectedTileId ? 'selected' : undefined}
              className={onRowSelect ? 'cursor-pointer transition-colors hover:bg-muted/50' : undefined}
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
              <TableCell>{row.pctChange}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
