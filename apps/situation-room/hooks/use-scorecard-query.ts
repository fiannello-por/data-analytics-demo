'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  type ScorecardFilters,
  type ScorecardReportPayload,
  withDefaultDateRange,
} from '@/lib/contracts';
import {
  normalizeFilters,
  serializeFilterCacheKey,
} from '@/lib/filter-normalization';

interface UseScorecardQueryResult {
  data: ScorecardReportPayload | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function buildNormalizedReportRequestPath(
  filters: ScorecardFilters,
): string {
  const normalizedFilters = normalizeFilters(withDefaultDateRange(filters));
  const searchParams = new URLSearchParams();

  for (const [key, values] of Object.entries(normalizedFilters)) {
    if (values.length === 0) continue;
    searchParams.set(key, values.join(','));
  }

  const query = searchParams.toString();
  return query ? `/api/report?${query}` : '/api/report';
}

export function useScorecardQuery(
  filters: ScorecardFilters,
  initialData: ScorecardReportPayload,
): UseScorecardQueryResult {
  const [data, setData] = useState<ScorecardReportPayload | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const requestIdRef = useRef(0);
  const loadedRequestKeyRef = useRef(
    serializeFilterCacheKey(initialData.appliedFilters),
  );
  const handledRefreshTokenRef = useRef(0);

  const requestKey = useMemo(
    () => serializeFilterCacheKey(filters),
    [filters],
  );
  const requestPath = useMemo(
    () => buildNormalizedReportRequestPath(filters),
    [filters],
  );

  const fetchData = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const shouldForceFetch = handledRefreshTokenRef.current !== refreshToken;
    const shouldFetch =
      shouldForceFetch || requestKey !== loadedRequestKeyRef.current;

    if (!shouldFetch) {
      return;
    }

    handledRefreshTokenRef.current = refreshToken;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(requestPath, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? `Request failed: ${res.status}`);
        }

        const json = (await res.json()) as ScorecardReportPayload;

        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }

        loadedRequestKeyRef.current = requestKey;
        setData(json);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (
          !controller.signal.aborted &&
          requestId === requestIdRef.current
        ) {
          setIsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [refreshToken, requestKey, requestPath]);

  return { data, isLoading, error, refetch: fetchData };
}
