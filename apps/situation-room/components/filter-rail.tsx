'use client';

import { Button } from '@/components/ui/button';
import { FILTER_DEFINITIONS } from '@/lib/filters';
import { FilterDropdown } from './filter-dropdown';

interface FilterRailProps {
  activeFilters: Record<string, string[]>;
  activeCount: number;
  onSetFilter: (key: string, values: string[]) => void;
  onClearAll: () => void;
}

export function FilterRail({
  activeFilters,
  activeCount,
  onSetFilter,
  onClearAll,
}: FilterRailProps) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-heading-overline">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-filter-badge-bg text-filter-badge-text text-[10px] font-bold px-1.5 py-0.5 min-w-[18px]">
              {activeCount}
            </span>
          )}
        </p>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-text-secondary hover:text-text-primary hover:bg-interactive-ghost-hover"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_DEFINITIONS.map((f) => (
          <FilterDropdown
            key={f.key}
            definition={f}
            values={activeFilters[f.key] ?? []}
            onSetValues={(vals) => onSetFilter(f.key, vals)}
          />
        ))}
      </div>
    </div>
  );
}
