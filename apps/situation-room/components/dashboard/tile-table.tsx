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
}: {
  snapshot: CategorySnapshotPayload;
  selectedTileId: string;
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
