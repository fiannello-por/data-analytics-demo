// apps/perf-sandbox/e2e/benchmark.spec.ts
import { test, expect } from '@playwright/test';
import {
  startServer,
  stopServer,
  restartServer,
  buildUrl,
  collectBrowserMetrics,
  readServerTelemetry,
} from './harness';
import type { RunMode } from '../lib/types';

const EXPERIMENT_ID = 'baseline';
const RUNS_PER_MODE = 5;

test.describe('Baseline benchmark', () => {
  test.beforeAll(async () => {
    await startServer();
  });

  test.afterAll(async () => {
    await stopServer();
  });

  // --- Full-cold runs: fresh process + cacheMode=off ---
  for (let i = 0; i < RUNS_PER_MODE; i++) {
    test(`full-cold run ${i + 1}`, async ({ page, request }) => {
      await restartServer();

      const runMode: RunMode = 'full-cold';
      const runId = `${EXPERIMENT_ID}-${runMode}-${i + 1}`;
      const url = buildUrl(runMode, runId);

      await page.goto(url, { waitUntil: 'load' });

      const browserMetrics = await collectBrowserMetrics(page);
      const serverMetrics = await readServerTelemetry(page);

      const response = await request.post(
        'http://localhost:3400/api/telemetry',
        {
          data: {
            runId,
            experimentId: EXPERIMENT_ID,
            runMode,
            runIndex: i + 1,
            browserMetrics,
            serverMetrics,
          },
        },
      );

      expect(response.ok()).toBe(true);
      expect(serverMetrics.totalQueryCount).toBeGreaterThan(0);
    });
  }

  // --- Production-cold runs: fresh process, Data Cache may be warm ---
  for (let i = 0; i < RUNS_PER_MODE; i++) {
    test(`production-cold run ${i + 1}`, async ({ page, request }) => {
      await restartServer();

      const runMode: RunMode = 'production-cold';
      const runId = `${EXPERIMENT_ID}-${runMode}-${i + 1}`;
      const url = buildUrl(runMode, runId);

      await page.goto(url, { waitUntil: 'load' });

      const browserMetrics = await collectBrowserMetrics(page);
      const serverMetrics = await readServerTelemetry(page);

      const response = await request.post(
        'http://localhost:3400/api/telemetry',
        {
          data: {
            runId,
            experimentId: EXPERIMENT_ID,
            runMode,
            runIndex: i + 1,
            browserMetrics,
            serverMetrics,
          },
        },
      );

      expect(response.ok()).toBe(true);
      // No query count assertion — production-cold may serve entirely
      // from the Data Cache if full-cold runs populated it earlier.
    });
  }

  // --- Warm runs: same process, all caches populated ---
  for (let i = 0; i < RUNS_PER_MODE; i++) {
    test(`warm run ${i + 1}`, async ({ page, request }) => {
      const runMode: RunMode = 'warm';
      const runId = `${EXPERIMENT_ID}-${runMode}-${i + 1}`;
      const url = buildUrl(runMode, runId);

      await page.goto(url, { waitUntil: 'load' });

      const browserMetrics = await collectBrowserMetrics(page);
      const serverMetrics = await readServerTelemetry(page);

      const response = await request.post(
        'http://localhost:3400/api/telemetry',
        {
          data: {
            runId,
            experimentId: EXPERIMENT_ID,
            runMode,
            runIndex: i + 1,
            browserMetrics,
            serverMetrics,
          },
        },
      );

      expect(response.ok()).toBe(true);
    });
  }
});