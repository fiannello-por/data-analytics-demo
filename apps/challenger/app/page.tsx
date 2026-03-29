// apps/challenger/app/page.tsx

import { Suspense } from 'react';
import { getCategoryTiles, getDefaultTileId } from '@por/dashboard-constants';
import type { Category } from '@por/dashboard-constants';
import { OverviewBoard } from '@/components/overview-board';
import { FilterBar } from '@/components/filter-bar';
import { CategoryScorecard } from '@/components/category-scorecard';
import { CategoryTrend } from '@/components/category-trend';
import { ClosedWonTable } from '@/components/closed-won-table';
import { TabBar } from '@/components/tab-bar';
import { parseCacheMode } from '@/lib/cache-mode';
import { parseDashboardUrl } from '@/lib/url-state';
import { loadOverviewBoard } from '@/lib/overview-loader';
import { loadFilterDictionaries } from '@/lib/dictionary-loader';
import { loadScorecard } from '@/lib/scorecard-loader';
import { loadTrend } from '@/lib/trend-loader';
import { loadClosedWon } from '@/lib/closed-won-loader';

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
  const resolvedParams = (await searchParams) ?? {};
  const cacheMode = parseCacheMode(resolvedParams.cacheMode as string);
  const state = parseDashboardUrl(resolvedParams);

  // ── Eagerly create loader promises in manifest priority order ──────────
  // Promises are created BEFORE the return statement so that queries submit
  // to the FIFO concurrency limiter in priority order. Components receive
  // and `await` these promises inside their Suspense boundaries.

  if (state.tab === 'Overview') {
    // OVERVIEW_MANIFEST priority: overview(1), filters(2)
    const overviewPromise = loadOverviewBoard(cacheMode);
    const filtersPromise = loadFilterDictionaries(cacheMode);

    return (
      <main>
        <h1 id="challenger-shell">Sales Performance — Full Data Parity</h1>
        <p>
          Architecture: Lightdash v2 executeMetricQuery | Cache: {cacheMode} |
          Tab: {state.tab}
        </p>

        <TabBar state={state} />

        <Suspense fallback={<div id="filter-loading">Loading filters...</div>}>
          <FilterBar data={filtersPromise} />
        </Suspense>

        <Suspense
          fallback={<div id="overview-loading">Loading overview...</div>}
        >
          <OverviewBoard data={overviewPromise} />
        </Suspense>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__CHALLENGER_TELEMETRY__ = {
                cacheMode: '${cacheMode}',
                tab: '${state.tab}',
                timestamp: '${new Date().toISOString()}',
              };
              window.__CHALLENGER_SHELL_TIME__ = performance.now();
            `,
          }}
        />
      </main>
    );
  }

  // ── Category tab ─────────────────────────────────────────────────────────
  const category = state.tab as Category;

  // CATEGORY_MANIFEST priority: scorecard(1), trend(2), closedWon(3), filters(4)
  const tileIds = getCategoryTiles(category).map((t) => t.tileId);
  const defaultTileId = getDefaultTileId(category);

  const scorecardPromise = loadScorecard(
    category,
    tileIds,
    state.filters,
    state.dateRange,
    state.previousDateRange,
    cacheMode,
  );
  const trendPromise = loadTrend(
    category,
    defaultTileId,
    state.filters,
    state.dateRange,
    state.previousDateRange,
    cacheMode,
  );
  const closedWonPromise = loadClosedWon(
    category,
    state.filters,
    state.dateRange,
    cacheMode,
  );
  const filtersPromise = loadFilterDictionaries(cacheMode);

  return (
    <main>
      <h1 id="challenger-shell">Sales Performance — Full Data Parity</h1>
      <p>
        Architecture: Lightdash v2 executeMetricQuery | Cache: {cacheMode} |
        Tab: {state.tab}
      </p>

      <TabBar state={state} />

      <Suspense fallback={<div id="filter-loading">Loading filters...</div>}>
        <FilterBar data={filtersPromise} />
      </Suspense>

      <section style={{ marginTop: 32 }}>
        <h2>{category}</h2>

        <Suspense
          fallback={<div>Loading {category} scorecard...</div>}
        >
          <CategoryScorecard data={scorecardPromise} />
        </Suspense>

        <div style={{ marginTop: 16 }}>
          <Suspense
            fallback={<div>Loading {category} trend...</div>}
          >
            <CategoryTrend data={trendPromise} />
          </Suspense>
        </div>

        <div style={{ marginTop: 16 }}>
          <Suspense
            fallback={<div>Loading {category} closed won...</div>}
          >
            <ClosedWonTable data={closedWonPromise} />
          </Suspense>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__CHALLENGER_TELEMETRY__ = {
              cacheMode: '${cacheMode}',
              tab: '${state.tab}',
              timestamp: '${new Date().toISOString()}',
            };
            window.__CHALLENGER_SHELL_TIME__ = performance.now();
          `,
        }}
      />
    </main>
  );
}
