'use client';

import { Button } from '@/components/ui/button';
import { FILTER_DEFINITIONS } from '@/lib/filters';
import { FilterChip } from './filter-chip';

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
    <div className="py-4 border-b border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <p className="heading-overline">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 text-accent-brand font-semibold">
              {activeCount} active
            </span>
          )}
        </p>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Clear all
          </Button>
        )}
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {FILTER_DEFINITIONS.filter(
            (f) => activeFilters[f.key]?.length > 0,
          ).map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              values={activeFilters[f.key]}
              onRemove={() => onSetFilter(f.key, [])}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTER_DEFINITIONS.filter((f) => f.type === 'string').map((f) => (
          <div key={f.key} className="relative">
            <input
              type="text"
              placeholder={f.label}
              className="h-8 px-3 text-xs rounded-md border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-brand w-[140px]"
              defaultValue={activeFilters[f.key]?.join(', ') ?? ''}
              onBlur={(e) => {
                const vals = e.target.value
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean);
                onSetFilter(f.key, vals);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
