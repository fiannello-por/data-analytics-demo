'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { FILTER_DEFINITIONS, parseFilterParams } from '@/lib/filters';

const filterParsers = Object.fromEntries(
  FILTER_DEFINITIONS.map((f) => [f.key, parseAsString.withDefault('')]),
);

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
    (key: string, values: string[]) => {
      setParams({ [key]: values.length > 0 ? values.join(',') : '' });
    },
    [setParams],
  );

  const clearAll = useCallback(() => {
    const cleared = Object.fromEntries(
      FILTER_DEFINITIONS.map((f) => [f.key, '']),
    );
    setParams(cleared);
  }, [setParams]);

  return { activeFilters, activeCount, setFilter, clearAll, params };
}
