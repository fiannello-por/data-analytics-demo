// apps/challenger/app/page.tsx

import { Suspense } from 'react';
import { getCategoryTiles, getDefaultTileId, GLOBAL_FILTER_KEYS } from '@por/dashboard-constants';
import type { Category, GlobalFilterKey } from '@por/dashboard-constants';
import { OverviewBoard } from '@/components/overview-board';
import { FilterBarShell, FilterButtonSkeleton } from '@/components/filter-bar-shell';
import { SingleFilter } from '@/components/single-filter';
import { CategoryScorecard } from '@/components/category-scorecard';
import { CategoryTrend } from '@/components/category-trend';
import { ClosedWonTable } from '@/components/closed-won-table';
import { TabBar } from '@/components/tab-bar';
import { WaterfallInjector } from '@/components/waterfall-injector';
import { parseCacheMode } from '@/lib/cache-mode';
import { parseDashboardUrl } from '@/lib/url-state';
import { loadOverviewBoard } from '@/lib/overview-loader';
import { loadSingleFilter } from '@/lib/single-filter-loader';
import { loadScorecard } from '@/lib/scorecard-loader';
import { loadTrend } from '@/lib/trend-loader';
import { loadClosedWon } from '@/lib/closed-won-loader';
import { WaterfallCollector } from '@/lib/waterfall-types';

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
    const collector = new WaterfallCollector();
    const overviewPromise = loadOverviewBoard(cacheMode, collector);

    // Create 16 per-filter promises — each streams independently
    const filterPromises = GLOBAL_FILTER_KEYS.map((key: GlobalFilterKey) =>
      loadSingleFilter(key, cacheMode, collector, 2),
    );
    const allPromises: Promise<unknown>[] = [overviewPromise, ...filterPromises];

    return (
      <main>
        <h1 id="challenger-shell">Sales Performance — Full Data Parity</h1>
        <p>
          Architecture: Lightdash v2 executeMetricQuery | Cache: {cacheMode} |
          Tab: {state.tab}
        </p>

        <TabBar state={state} />

        <FilterBarShell>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {GLOBAL_FILTER_KEYS.map((key: GlobalFilterKey, i: number) => (
              <Suspense key={key} fallback={<FilterButtonSkeleton label={key} />}>
                <SingleFilter data={filterPromises[i]!} state={state} />
              </Suspense>
            ))}
          </div>
        </FilterBarShell>

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

        <Suspense fallback={null}>
          <WaterfallInjector collector={collector} allPromises={allPromises} />
        </Suspense>
      </main>
    );
  }

  // ── Category tab ─────────────────────────────────────────────────────────
  const category = state.tab as Category;
  const collector = new WaterfallCollector();

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
    collector,
  );
  const trendPromise = loadTrend(
    category,
    defaultTileId,
    state.filters,
    state.dateRange,
    state.previousDateRange,
    cacheMode,
    collector,
  );
  const closedWonPromise = loadClosedWon(
    category,
    state.filters,
    state.dateRange,
    state.cwPage,
    state.cwPageSize,
    state.cwSort.field,
    state.cwSort.direction === 'desc',
    cacheMode,
    collector,
  );
  // Create 16 per-filter promises — each streams independently
  const filterPromises = GLOBAL_FILTER_KEYS.map((key: GlobalFilterKey) =>
    loadSingleFilter(key, cacheMode, collector, 4),
  );
  const allPromises: Promise<unknown>[] = [
    scorecardPromise,
    trendPromise,
    closedWonPromise,
    ...filterPromises,
  ];

  return (
    <main>
      <h1 id="challenger-shell">Sales Performance — Full Data Parity</h1>
      <p>
        Architecture: Lightdash v2 executeMetricQuery | Cache: {cacheMode} |
        Tab: {state.tab}
      </p>

      <TabBar state={state} />

      <FilterBarShell>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {GLOBAL_FILTER_KEYS.map((key: GlobalFilterKey, i: number) => (
            <Suspense key={key} fallback={<FilterButtonSkeleton label={key} />}>
              <SingleFilter data={filterPromises[i]!} state={state} />
            </Suspense>
          ))}
        </div>
      </FilterBarShell>

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
            <ClosedWonTable data={closedWonPromise} state={state} />
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

      <Suspense fallback={null}>
        <WaterfallInjector collector={collector} allPromises={allPromises} />
      </Suspense>
    </main>
  );
}
