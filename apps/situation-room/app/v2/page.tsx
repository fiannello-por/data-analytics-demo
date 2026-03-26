import { permanentRedirect } from 'next/navigation';

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | undefined;

function toUrlSearchParams(input: SearchParamsInput): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (!input) {
    return searchParams;
  }

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    if (typeof value === 'string') {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

export default async function LegacyDashboardRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = toUrlSearchParams(resolvedSearchParams).toString();

  permanentRedirect(
    query ? `/sales-performance?${query}` : '/sales-performance',
  );
}
