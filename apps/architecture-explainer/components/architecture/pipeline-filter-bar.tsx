'use client';

import * as React from 'react';
import type { ArchitecturePipelineFilter } from '@/lib/architecture/contracts';
import { cn } from '@/lib/utils';

const FILTERS: ArchitecturePipelineFilter[] = [
  'All',
  'Overview',
  'Snapshot',
  'Trend',
  'Closed Won',
  'Filters',
];

export function PipelineFilterBar({
  value,
  onValueChange,
}: {
  value: ArchitecturePipelineFilter;
  onValueChange: (value: ArchitecturePipelineFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-background/35 p-1">
      {FILTERS.map((filter) => {
        const active = filter === value;

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onValueChange(filter)}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border/70'
                : 'text-muted-foreground hover:bg-accent/45 hover:text-foreground',
            )}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
}
