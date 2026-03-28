import { type ChildProcess, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

const APP_DIR = resolve(__dirname, '..');
const PORT = 3500;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: ChildProcess | null = null;

async function waitForServer(timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok || response.status === 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

export async function startServer(): Promise<void> {
  if (serverProcess) return;
  const nextBin = resolve(APP_DIR, 'node_modules', '.bin', 'next');
  serverProcess = spawn(nextBin, ['start', '--port', String(PORT)], {
    cwd: APP_DIR,
    stdio: 'pipe',
    env: { ...process.env },
  });
  serverProcess.on('error', (err) => console.error('Server error:', err));
  await waitForServer();
}

export async function stopServer(): Promise<void> {
  if (!serverProcess) return;
  const pid = serverProcess.pid;
  serverProcess.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (pid) try { process.kill(pid, 'SIGKILL'); } catch {}
      resolve();
    }, 5_000);
    serverProcess!.on('close', () => { clearTimeout(timeout); resolve(); });
  });
  serverProcess = null;
  await new Promise((r) => setTimeout(r, 500));
}

export async function restartServer(): Promise<void> {
  await stopServer();
  await startServer();
}

type RunMode = 'full-cold' | 'production-cold' | 'warm';

export function buildUrl(runMode: RunMode, runId: string): string {
  const base = `${BASE_URL}/?runId=${runId}`;
  if (runMode === 'full-cold') return `${base}&cacheMode=off`;
  return base;
}

export type BrowserMetrics = {
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  totalPageLoadMs: number;
};

export type ServerTelemetry = {
  overviewDurationMs: number;
  overviewActualQueryCount: number;
  overviewTotalExecutionMs: number;
  filterDurationMs: number;
  filterActualQueryCount: number;
  filterTotalExecutionMs: number;
  cacheMode: string;
};

export async function collectBrowserMetrics(
  page: Page,
): Promise<BrowserMetrics> {
  // Wait for BOTH Suspense boundaries to resolve — the spec requires
  // the filter bar to be validated alongside the overview board.
  await Promise.all([
    page.waitForSelector('#overview-data[data-loaded="true"]', {
      timeout: 120_000,
    }),
    page.waitForSelector('#filter-bar[data-loaded="true"]', {
      timeout: 120_000,
    }),
  ]);

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
    const lcp =
      lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;

    return {
      ttfbMs: nav.responseStart - nav.requestStart,
      fcpMs: fcp ?? 0,
      lcpMs: lcp,
      totalPageLoadMs: nav.loadEventEnd - nav.requestStart,
    };
  });
}

export async function collectServerTelemetry(
  page: Page,
): Promise<ServerTelemetry> {
  return page.evaluate(() => {
    return (window as unknown as { __CHALLENGER_TELEMETRY__: ServerTelemetry })
      .__CHALLENGER_TELEMETRY__;
  });
}