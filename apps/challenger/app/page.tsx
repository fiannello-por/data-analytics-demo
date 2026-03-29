// apps/challenger/app/page.tsx

import { Suspense } from 'react';
import { CATEGORY_ORDER } from '@por/dashboard-constants';
import type { Category } from '@por/dashboard-constants';
import { OverviewBoard } from '@/components/overview-board';
import { FilterBar } from '@/components/filter-bar';
import { CategoryScorecard } from '@/components/category-scorecard';
import { CategoryTrend } from '@/components/category-trend';
import { ClosedWonTable } from '@/components/closed-won-table';
import { parseCacheMode } from '@/lib/cache-mode';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
      <h1 id="challenger-shell">Sales Performance — Full Data Parity</h1>
      <p>Architecture: Lightdash v2 executeMetricQuery | Cache: {cacheMode}</p>

      <Suspense fallback={<div id="filter-loading">Loading filters...</div>}>
        <FilterBar cacheMode={cacheMode} />
      </Suspense>

      <Suspense fallback={<div id="overview-loading">Loading overview...</div>}>
        <OverviewBoard cacheMode={cacheMode} />
      </Suspense>

      {CATEGORY_ORDER.map((category) => (
        <section key={category} style={{ marginTop: 32 }}>
          <h2>{category}</h2>

          <Suspense
            fallback={<div>Loading {category} scorecard...</div>}
          >
            <CategoryScorecard
              category={category as Category}
              cacheMode={cacheMode}
            />
          </Suspense>

          <div style={{ marginTop: 16 }}>
            <Suspense
              fallback={<div>Loading {category} trend...</div>}
            >
              <CategoryTrend
                category={category as Category}
                cacheMode={cacheMode}
              />
            </Suspense>
          </div>

          <div style={{ marginTop: 16 }}>
            <Suspense
              fallback={<div>Loading {category} closed won...</div>}
            >
              <ClosedWonTable
                category={category as Category}
                cacheMode={cacheMode}
              />
            </Suspense>
          </div>
        </section>
      ))}

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
