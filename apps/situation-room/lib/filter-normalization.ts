import {
  type ScorecardFilters,
  withDefaultDateRange,
} from '@/lib/contracts';

export function normalizeFilters(filters: ScorecardFilters): ScorecardFilters {
  const entries = Object.entries(filters)
    .map(
      ([key, values]) =>
        [
          key,
          [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort(),
        ] as const,
    )
    .filter(([, values]) => values.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(entries);
}

export function serializeFilterCacheKey(filters: ScorecardFilters): string {
  return JSON.stringify(normalizeFilters(withDefaultDateRange(filters)));
}
