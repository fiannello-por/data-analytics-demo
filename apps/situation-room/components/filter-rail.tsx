'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FilterKey, ScorecardFilters } from '@/lib/contracts';
import { FILTER_DEFINITIONS } from '@/lib/filters';
import type { FilterDictionaryPayload } from '@/lib/data-adapters/types';
import { formatCommaSeparatedValues } from '@/hooks/use-filters';
import { FilterChip } from './filter-chip';

type FilterDictionaryOption = FilterDictionaryPayload['options'][number];
type FilterDictionaryMap = Partial<Record<FilterKey, FilterDictionaryOption[]>>;
type FetchLike = typeof fetch;

const STRING_FILTER_DEFINITIONS = FILTER_DEFINITIONS.filter(
  (filter) => filter.type === 'string',
);

const filterDictionaryCache = new WeakMap<FetchLike, Promise<FilterDictionaryMap>>();

export async function loadFilterDictionaries(
  fetchImpl: FetchLike = fetch,
): Promise<FilterDictionaryMap> {
  const cached = filterDictionaryCache.get(fetchImpl);
  if (cached) {
    return cached;
  }

  const loadPromise = Promise.all(
    STRING_FILTER_DEFINITIONS.map(async (filter) => {
      const response = await fetchImpl(
        `/api/filter-dictionaries/${encodeURIComponent(filter.key)}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to load filter dictionary for ${filter.key}.`);
      }

      const payload = (await response.json()) as FilterDictionaryPayload;
      return [filter.key, payload.options] as const;
    }),
  ).then((entries) => Object.fromEntries(entries) as FilterDictionaryMap);

  filterDictionaryCache.set(fetchImpl, loadPromise);
  return loadPromise;
}

interface FilterRailProps {
  activeFilters: ScorecardFilters;
  activeCount: number;
  onSetFilter: (key: FilterKey, values: string[]) => void;
  onSetFilterFromInput: (key: FilterKey, input: string) => void;
  onClearAll: () => void;
}

interface StringFilterInputProps {
  keyName: FilterKey;
  label: string;
  values: string[];
  options: FilterDictionaryOption[];
  onCommit: (key: FilterKey, input: string) => void;
}

function StringFilterInput({
  keyName,
  label,
  values,
  options,
  onCommit,
}: StringFilterInputProps) {
  const [inputValue, setInputValue] = useState(() =>
    formatCommaSeparatedValues(values),
  );

  useEffect(() => {
    setInputValue(formatCommaSeparatedValues(values));
  }, [values]);

  const datalistId = useMemo(() => `filter-dictionary-${keyName}`, [keyName]);

  return (
    <div className="relative">
      <input
        type="text"
        list={datalistId}
        placeholder={label}
        className="h-8 px-3 text-xs rounded-md border border-border bg-surface text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-brand w-[140px]"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => onCommit(keyName, inputValue)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
      />
      <datalist id={datalistId}>
        {options.map((option) => (
          <option key={`${option.sortOrder}-${option.value}`} value={option.value} />
        ))}
      </datalist>
    </div>
  );
}

export function FilterRail({
  activeFilters,
  activeCount,
  onSetFilter,
  onSetFilterFromInput,
  onClearAll,
}: FilterRailProps) {
  const [filterDictionaries, setFilterDictionaries] = useState<FilterDictionaryMap>({});

  useEffect(() => {
    let cancelled = false;

    void loadFilterDictionaries()
      .then((loaded) => {
        if (!cancelled) {
          setFilterDictionaries(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilterDictionaries({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="py-4 border-b border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary">
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
          {FILTER_DEFINITIONS.filter((f) => (activeFilters[f.key] ?? []).length > 0).map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              values={activeFilters[f.key] ?? []}
              onRemove={() => onSetFilter(f.key, [])}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STRING_FILTER_DEFINITIONS.map((f) => (
          <StringFilterInput
            key={f.key}
            keyName={f.key}
            label={f.label}
            values={activeFilters[f.key] ?? []}
            options={filterDictionaries[f.key] ?? []}
            onCommit={onSetFilterFromInput}
          />
        ))}
      </div>
    </div>
  );
}
