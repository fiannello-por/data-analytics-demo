// apps/perf-sandbox/e2e/harness.ts
import { type ChildProcess, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import type { RunMode } from '../lib/types';

const SANDBOX_DIR = resolve(__dirname, '..');
const PORT = 3400;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: ChildProcess | null = null;

async function waitForServer(timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok || response.status === 500) {
        // 500 is acceptable — means the server is up but the page may error
        // due to env vars. We just need the process running.
        return;
      }
    } catch {
      // Connection refused — server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

export async function startServer(): Promise<void> {
  if (serverProcess) return;

  // Spawn next start directly (not via pnpm) for cleaner process management
  const nextBin = resolve(SANDBOX_DIR, 'node_modules', '.bin', 'next');
  serverProcess = spawn(nextBin, ['start', '--port', String(PORT)], {
    cwd: SANDBOX_DIR,
    stdio: 'pipe',
    env: { ...process.env },
  });

  serverProcess.on('error', (err) => {
    console.error('Server process error:', err);
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    const text = data.toString();
    if (text.includes('EADDRINUSE')) {
      console.error('Port already in use — killing stale process');
    }
  });

  await waitForServer();
}

export async function stopServer(): Promise<void> {
  if (!serverProcess) return;
  const pid = serverProcess.pid;
  serverProcess.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      // Force kill if SIGTERM didn't work
      if (pid) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // Already dead
        }
      }
      resolve();
    }, 5_000);
    serverProcess!.on('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  serverProcess = null;
  // Brief pause to ensure port is released
  await new Promise((r) => setTimeout(r, 500));
}

export async function restartServer(): Promise<void> {
  await stopServer();
  await startServer();
}

export function buildUrl(runMode: RunMode, runId: string): string {
  const base = `${BASE_URL}/?runId=${runId}`;
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
  await page.waitForSelector('#sandbox-summary', { timeout: 120_000 });

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
      lcpEntries.length > 0
        ? lcpEntries[lcpEntries.length - 1].startTime
        : 0;

    const jsResources = performance
      .getEntriesByType('resource')
      .filter(
        (r) =>
          r.name.endsWith('.js') || r.name.includes('/_next/static/'),
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
