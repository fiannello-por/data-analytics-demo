import { getScorecardReport } from '@/lib/server/get-scorecard-report';
import { parseFilterParams } from '@/lib/filters';
import { ReportContent } from '@/components/report-content';
import type { ScorecardFilters } from '@/lib/contracts';

function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ScorecardFilters {
  const flattenedParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(',') : value,
    ]),
  );

  return parseFilterParams(flattenedParams);
}

interface ReportPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReportPage({
  searchParams,
}: ReportPageProps) {
  const filters = parseSearchParams(
    await (searchParams ?? Promise.resolve({})),
  );
  const initialData = await getScorecardReport(filters);

  return (
    <ReportContent initialData={initialData.data} />
  );
}
