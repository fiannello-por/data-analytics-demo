import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  startServer,
  stopServer,
  restartServer,
  buildUrl,
  collectBrowserMetrics,
  collectServerTelemetry,
  ALL_TABS,
  type TabName,
  type BrowserMetrics,
  type ServerTelemetry,
} from './harness';

const RUNS_PER_TAB = 5;
const RESULTS_DIR = join(__dirname, '..', 'results');

type RunResult = BrowserMetrics & {
  server: ServerTelemetry;
  tab: TabName;
  runIndex: number;
  timestamp: string;
};

const allResults: RunResult[] = [];

function persistRun(result: RunResult) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const tabSlug = result.tab.replace(/\s+/g, '-').toLowerCase();
  const filename = `challenger_full-cold_${tabSlug}_${String(result.runIndex).padStart(3, '0')}.json`;
  writeFileSync(
    join(RESULTS_DIR, filename),
    JSON.stringify(result, null, 2),
  );
  allResults.push(result);
}

function computeP50(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = (sorted.length - 1) / 2;
  const lo = Math.floor(mid);
  const hi = Math.ceil(mid);
  return lo === hi ? sorted[lo] : (sorted[lo] + sorted[hi]) / 2;
}

function computeCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return (Math.sqrt(variance) / mean) * 100;
}

test.describe('Challenger benchmark — all 6 tabs (Phase 4b-2)', () => {
  test.beforeAll(async () => {
    mkdirSync(RESULTS_DIR, { recursive: true });
    await startServer();
  });

  test.afterAll(async () => {
    await stopServer();

    // Per-tab summary
    const tabSummaries: Record<
      string,
      {
        ttfbP50: number;
        totalP50: number;
        ttfbCV: number;
        ttfbGate: boolean;
        totalGate: boolean;
        n: number;
      }
    > = {};

    let allTabsPass = true;

    for (const tab of ALL_TABS) {
      const tabResults = allResults.filter((r) => r.tab === tab);
      const ttfbs = tabResults.map((r) => r.ttfbMs);
      const totals = tabResults.map((r) => r.totalPageLoadMs);

      const ttfbP50 = computeP50(ttfbs);
      const totalP50 = computeP50(totals);
      const ttfbCV = computeCV(ttfbs);
      const ttfbGate = ttfbP50 < 50;
      const totalGate = totalP50 < 4000;

      tabSummaries[tab] = {
        ttfbP50,
        totalP50,
        ttfbCV,
        ttfbGate,
        totalGate,
        n: tabResults.length,
      };

      if (!ttfbGate || !totalGate) allTabsPass = false;
    }

    const summary = {
      tabs: tabSummaries,
      gate: {
        allTabsTtfbUnder50ms: Object.values(tabSummaries).every((s) => s.ttfbGate),
        allTabsTotalUnder4s: Object.values(tabSummaries).every((s) => s.totalGate),
        overallPass: allTabsPass,
      },
      totalRuns: allResults.length,
    };

    writeFileSync(
      join(RESULTS_DIR, 'summary.json'),
      JSON.stringify(summary, null, 2),
    );

    console.log('\n=== Phase 4b-2 Gate Results (all 6 tabs, full-cold) ===');
    for (const tab of ALL_TABS) {
      const s = tabSummaries[tab];
      console.log(
        `[${tab}] TTFB p50: ${s.ttfbP50.toFixed(0)}ms ${s.ttfbGate ? 'PASS' : 'FAIL'} | ` +
          `Total p50: ${s.totalP50.toFixed(0)}ms ${s.totalGate ? 'PASS' : 'FAIL'} | ` +
          `TTFB CV: ${s.ttfbCV.toFixed(1)}% | n=${s.n}`,
      );
    }
    console.log(`\nOverall: ${allTabsPass ? 'PASS' : 'FAIL'}`);
  });

  // Generate 5 runs × 6 tabs = 30 total tests
  for (const tab of ALL_TABS) {
    const tabSlug = tab.replace(/\s+/g, '-').toLowerCase();

    for (let i = 0; i < RUNS_PER_TAB; i++) {
      test(`full-cold ${tab} run ${i + 1}`, async ({ page }) => {
        await restartServer();
        const runId = `challenger-full-cold-${tabSlug}-${i + 1}`;
        const url = buildUrl('full-cold', runId, tab);
        await page.goto(url, { waitUntil: 'load' });
        const metrics = await collectBrowserMetrics(page, tab);
        const server = await collectServerTelemetry(page);

        persistRun({
          ...metrics,
          server,
          tab,
          runIndex: i + 1,
          timestamp: new Date().toISOString(),
        });

        // Basic sanity: TTFB must be measured
        expect(metrics.ttfbMs).toBeGreaterThan(0);

        // Extract waterfall for reporting
        const waterfall = server.waterfall ?? [];
        expect(Array.isArray(waterfall)).toBe(true);

        // Gate assertions: p50 targets enforced per-run to flag regressions early
        // (final aggregate gate is reported in afterAll)
        expect(metrics.ttfbMs).toBeLessThan(50);
        expect(metrics.totalPageLoadMs).toBeLessThan(4000);
      });
    }
  }
});
