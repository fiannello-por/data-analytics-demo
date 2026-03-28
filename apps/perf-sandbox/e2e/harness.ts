// apps/perf-sandbox/e2e/harness.ts
import { type ChildProcess, spawn } from 'node:child_process';
import type { Page } from '@playwright/test';
import type { RunMode } from '../lib/types';

let serverProcess: ChildProcess | null = null;

export async function startServer(): Promise<void> {
  if (serverProcess) return;
  serverProcess = spawn('pnpm', ['start'], {
    cwd: __dirname + '/..',
    stdio: 'pipe',
    env: { ...process.env, PORT: '3400' },
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Server start timeout')),
      30_000,
    );
    serverProcess!.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Ready')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProcess!.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function stopServer(): Promise<void> {
  if (!serverProcess) return;
  serverProcess.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    serverProcess!.on('close', () => resolve());
    setTimeout(resolve, 5_000);
  });
  serverProcess = null;
}

export async function restartServer(): Promise<void> {
  await stopServer();
  await startServer();
}

export function buildUrl(runMode: RunMode, runId: string): string {
  const base = `http://localhost:3400/?runId=${runId}`;
  if (runMode === 'full-cold') {
    return `${base}&cacheMode=off`;
  }
  return base;
}

export type BrowserMetrics = {
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  totalPageLoadMs: number;
  jsDownloadMs: number;
  hydrationMs: number;
};

export async function collectBrowserMetrics(
  page: Page,
): Promise<BrowserMetrics> {
  await page.waitForSelector('#sandbox-summary');

  return page.evaluate(() => {
    const nav = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;

    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(
      (e) => e.name === 'first-contentful-paint',
    )?.startTime;

    const lcpEntries = performance.getEntriesByType(
      'largest-contentful-paint',
    ) as Array<{ startTime: number }>;
    const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;

    const jsResources = performance
      .getEntriesByType('resource')
      .filter(
        (r) =>
          r.name.endsWith('.js') ||
          r.name.includes('/_next/static/'),
      ) as PerformanceResourceTiming[];
    const jsDownloadMs = jsResources.reduce(
      (sum, r) => sum + r.duration,
      0,
    );

    return {
      ttfbMs: nav.responseStart - nav.requestStart,
      fcpMs: fcp ?? 0,
      lcpMs: lcp,
      totalPageLoadMs: nav.loadEventEnd - nav.requestStart,
      jsDownloadMs,
      hydrationMs: 0,
    };
  });
}

export async function readServerTelemetry(
  page: Page,
): Promise<{
  ssrDataFetchMs: number;
  totalCompileMs: number;
  totalExecuteMs: number;
  totalQueryCount: number;
  totalBytesProcessed: number;
  filterDictionaryMs: number;
  semanticCacheHits: number;
  semanticCacheMisses: number;
}> {
  return page.evaluate(() => {
    const telemetry = (window as unknown as { __SANDBOX_TELEMETRY__: unknown })
      .__SANDBOX_TELEMETRY__ as {
      serverMetrics: {
        ssrDataFetchMs: number;
        totalCompileMs: number;
        totalExecuteMs: number;
        totalQueryCount: number;
        totalBytesProcessed: number;
        filterDictionaryMs: number;
        semanticCacheHits: number;
        semanticCacheMisses: number;
      };
    };
    return telemetry.serverMetrics;
  });
}