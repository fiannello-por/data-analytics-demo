import 'server-only';

import { unstable_cache } from 'next/cache';
import type { ScorecardFilters } from '@/lib/contracts';
import { getScorecardDataAdapter } from '@/lib/data-adapters';
import { serializeFilterCacheKey } from '@/lib/filter-normalization';

export async function getScorecardReport(filters: ScorecardFilters) {
  const key = serializeFilterCacheKey(filters);
  const load = unstable_cache(
    async () => getScorecardDataAdapter().getScorecardReport(filters),
    ['report-payload', key],
    {
      revalidate: 60,
      tags: ['report-payload'],
    },
  );

  return load();
}
