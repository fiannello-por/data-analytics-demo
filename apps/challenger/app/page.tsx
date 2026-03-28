// apps/challenger/app/page.tsx

import { Suspense } from 'react';
import { OverviewBoard } from '@/components/overview-board';
import { FilterBar } from '@/components/filter-bar';
import { parseCacheMode } from '@/lib/cache-mode';

export const dynamic = 'force-dynamic';

type SearchParamsInput = Promise<
  Record<string, string | string[] | undefined> | undefined
>;

export default async function ChallengerPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await searchParams;
  const cacheMode = parseCacheMode(resolvedParams?.cacheMode as string);

  return (
    <main>
      <h1 id="challenger-shell">Sales Performance (Challenger)</h1>
      <p>Architecture: Lightdash v2 executeMetricQuery | Cache: {cacheMode}</p>

      <Suspense
        fallback={<div id="filter-loading">Loading filters...</div>}
      >
        <FilterBar cacheMode={cacheMode} />
      </Suspense>

      <Suspense
        fallback={<div id="overview-loading">Loading overview...</div>}
      >
        <OverviewBoard cacheMode={cacheMode} />
      </Suspense>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__CHALLENGER_TELEMETRY__ = {
              cacheMode: '${cacheMode}',
              timestamp: '${new Date().toISOString()}',
            };
            window.__CHALLENGER_SHELL_TIME__ = performance.now();
          `,
        }}
      />
    </main>
  );
}