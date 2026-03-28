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
  type BrowserMetrics,
  type ServerTelemetry,
} from './harness';

const RUNS_PER_MODE = 5;
const RESULTS_DIR = join(__dirname, '..', 'results');

type RunMode = 'full-cold' | 'production-cold' | 'warm';

type RunResult = BrowserMetrics & {
  server: ServerTelemetry;
  runMode: RunMode;
  runIndex: number;
  timestamp: string;
};

const allResults: RunResult[] = [];

function persistRun(result: RunResult) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const filename = `challenger_${result.runMode}_${String(result.runIndex).padStart(3, '0')}.json`;
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

test.describe('Challenger benchmark', () => {
  test.beforeAll(async () => {
    mkdirSync(RESULTS_DIR, { recursive: true });
    await startServer();
  });

  test.afterAll(async () => {
    await stopServer();

    const byMode = (mode: RunMode) =>
      allResults.filter((r) => r.runMode === mode);

    const summary = {
      fullCold: {
        ttfbMs: { p50: computeP50(byMode('full-cold').map((r) => r.ttfbMs)), cv: computeCV(byMode('full-cold').map((r) => r.ttfbMs)), n: byMode('full-cold').length },
        totalPageLoadMs: { p50: computeP50(byMode('full-cold').map((r) => r.totalPageLoadMs)), cv: computeCV(byMode('full-cold').map((r) => r.totalPageLoadMs)), n: byMode('full-cold').length },
      },
      productionCold: {
        ttfbMs: { p50: computeP50(byMode('production-cold').map((r) => r.ttfbMs)), n: byMode('production-cold').length },
        totalPageLoadMs: { p50: computeP50(byMode('production-cold').map((r) => r.totalPageLoadMs)), n: byMode('production-cold').length },
      },
      warm: {
        ttfbMs: { p50: computeP50(byMode('warm').map((r) => r.ttfbMs)), n: byMode('warm').length },
        totalPageLoadMs: { p50: computeP50(byMode('warm').map((r) => r.totalPageLoadMs)), n: byMode('warm').length },
      },
      gate: {
        ttfbUnder50ms: computeP50(byMode('full-cold').map((r) => r.ttfbMs)) < 50,
        totalUnder4s: computeP50(byMode('full-cold').map((r) => r.totalPageLoadMs)) < 4000,
        cvUnder20: computeCV(byMode('full-cold').map((r) => r.ttfbMs)) < 20,
      },
    };

    writeFileSync(
      join(RESULTS_DIR, 'summary.json'),
      JSON.stringify(summary, null, 2),
    );

    console.log('\n=== Phase 4a Gate Results ===');
    console.log(`Full-cold TTFB p50:  ${summary.fullCold.ttfbMs.p50.toFixed(0)}ms (target: <50ms) ${summary.gate.ttfbUnder50ms ? 'PASS' : 'FAIL'}`);
    console.log(`Full-cold total p50: ${summary.fullCold.totalPageLoadMs.p50.toFixed(0)}ms (target: <4000ms) ${summary.gate.totalUnder4s ? 'PASS' : 'FAIL'}`);
    console.log(`Full-cold TTFB CV:   ${summary.fullCold.ttfbMs.cv.toFixed(1)}% (target: <20%) ${summary.gate.cvUnder20 ? 'PASS' : 'FAIL'}`);
  });

  for (let i = 0; i < RUNS_PER_MODE; i++) {
    test(`full-cold run ${i + 1}`, async ({ page }) => {
      await restartServer();
      const url = buildUrl('full-cold', `challenger-full-cold-${i + 1}`);
      await page.goto(url, { waitUntil: 'load' });
      const metrics = await collectBrowserMetrics(page);
      const server = await collectServerTelemetry(page);
      persistRun({ ...metrics, server, runMode: 'full-cold', runIndex: i + 1, timestamp: new Date().toISOString() });
      expect(metrics.ttfbMs).toBeGreaterThan(0);
      // Full-cold must execute all queries (cacheMode=off bypasses unstable_cache)
      expect(server.overviewActualQueryCount).toBe(10);  // 5 categories × 2 windows
      expect(server.filterActualQueryCount).toBe(16);    // 16 filter dimensions
    });
  }

  for (let i = 0; i < RUNS_PER_MODE; i++) {
    test(`production-cold run ${i + 1}`, async ({ page }) => {
      await restartServer();
      const url = buildUrl('production-cold', `challenger-prod-cold-${i + 1}`);
      await page.goto(url, { waitUntil: 'load' });
      const metrics = await collectBrowserMetrics(page);
      const server = await collectServerTelemetry(page);
      persistRun({ ...metrics, server, runMode: 'production-cold', runIndex: i + 1, timestamp: new Date().toISOString() });
      expect(metrics.ttfbMs).toBeGreaterThan(0);
      // Production-cold may serve from Data Cache — counts can be 0 to expected max
      expect(server.overviewActualQueryCount).toBeGreaterThanOrEqual(0);
      expect(server.overviewActualQueryCount).toBeLessThanOrEqual(10);
      expect(server.filterActualQueryCount).toBeGreaterThanOrEqual(0);
      expect(server.filterActualQueryCount).toBeLessThanOrEqual(16);
    });
  }

  for (let i = 0; i < RUNS_PER_MODE; i++) {
    test(`warm run ${i + 1}`, async ({ page }) => {
      const url = buildUrl('warm', `challenger-warm-${i + 1}`);
      await page.goto(url, { waitUntil: 'load' });
      const metrics = await collectBrowserMetrics(page);
      const server = await collectServerTelemetry(page);
      persistRun({ ...metrics, server, runMode: 'warm', runIndex: i + 1, timestamp: new Date().toISOString() });
      expect(metrics.ttfbMs).toBeGreaterThan(0);
      // Warm runs must hit cache — zero actual queries
      expect(server.overviewActualQueryCount).toBe(0);
      expect(server.filterActualQueryCount).toBe(0);
    });
  }
});