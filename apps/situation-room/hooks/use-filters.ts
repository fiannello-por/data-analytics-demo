'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { normalizeFilters } from '@/lib/filter-normalization';
import {
  type FilterKey,
  type ScorecardFilters,
} from '@/lib/contracts';
import { FILTER_DEFINITIONS, parseFilterParams } from '@/lib/filters';

const filterParsers = Object.fromEntries(
  FILTER_DEFINITIONS.map((f) => [f.key, parseAsString.withDefault('')]),
) as Record<FilterKey, ReturnType<typeof parseAsString.withDefault>>;

type FilterUrlState = Partial<Record<FilterKey, string>>;

export function parseCommaSeparatedValues(input: string) {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function formatCommaSeparatedValues(values: string[]) {
  return values.join(', ');
}

export function useFilters() {
  const [params, setParams] = useQueryStates(filterParsers, {
    history: 'push',
  });

  const activeFilters = useMemo(
    () => parseFilterParams(params as Record<string, string>),
    [params],
  );

  const activeCount = useMemo(
    () => Object.values(activeFilters).filter((v) => v.length > 0).length,
    [activeFilters],
  );

  const setFilter = useCallback(
    (key: FilterKey, values: string[]) => {
      const normalized = normalizeFilters({ [key]: values } as ScorecardFilters);
      const nextValue = normalized[key]?.join(',') ?? '';

      setParams({ [key]: nextValue } as FilterUrlState);
    },
    [setParams],
  );

  const setFilterFromInput = useCallback(
    (key: FilterKey, input: string) => {
      setFilter(key, parseCommaSeparatedValues(input));
    },
    [setFilter],
  );

  const clearAll = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_DEFINITIONS.map((f) => [f.key, '']),
    ) as FilterUrlState;
    setParams(cleared);
  }, [setParams]);

  return {
    activeFilters,
    activeCount,
    setFilter,
    setFilterFromInput,
    clearAll,
    params,
  };
}
