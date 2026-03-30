import type { GlobalFilterKey } from '@/lib/dashboard/catalog';
import type { FilterDictionaryPayload } from '@/lib/dashboard/contracts';
import { buildDashboardUrlFactory } from '@/lib/dashboard/query-inputs';

export async function fetchFilterDictionary(
  apiBasePath: string,
  key: GlobalFilterKey,
  fetchImpl: typeof fetch = fetch,
): Promise<FilterDictionaryPayload> {
  const response = await fetchImpl(
    buildDashboardUrlFactory(apiBasePath).buildFilterDictionaryUrl(key),
    {
      headers: { Accept: 'application/json' },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Filter dictionary request failed with status ${response.status}.`,
    );
  }

  return (await response.json()) as FilterDictionaryPayload;
}
