import 'server-only';

import { unstable_cache } from 'next/cache';
import { getScorecardDataAdapter } from '@/lib/data-adapters';

export async function getFilterDictionary(key: string) {
  const load = unstable_cache(
    async () => getScorecardDataAdapter().getFilterDictionary(key),
    ['filter-dictionaries', key],
    {
      revalidate: 900,
      tags: ['filter-dictionaries'],
    },
  );

  return load();
}
