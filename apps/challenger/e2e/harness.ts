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

export type TabName = 'Overview' | 'New Logo' | 'Expansion' | 'Migration' | 'Renewal' | 'Total';

export const ALL_TABS: TabName[] = [
  'Overview',
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
];

export const CATEGORY_TABS: TabName[] = [
  'New Logo',
  'Expansion',
  'Migration',
  'Renewal',
  'Total',
];

/** Build a simple URL with only a tab parameter (for client-side tests). */
export function buildTabUrl(tab?: TabName): string {
  if (!tab || tab === 'Overview') return `${BASE_URL}/`;
  return `${BASE_URL}/?tab=${encodeURIComponent(tab)}`;
}

export { BASE_URL };

export type BrowserMetrics = {
  ttfbMs: number;
  fcpMs: number;
  lcpMs: number;
  totalPageLoadMs: number;
};

// ─── Client-side helpers ──────────────────────────────────────────────────────

/**
 * Wait for section-ready markers to appear in the active tab.
 *
 * Overview tab: at least 1 `[data-testid="section-ready"]` (the overview board).
 * Category tabs: at least 3 (scorecard, trend, closed-won).
 *
 * Note: category tabs render 3 sections only when a tile is selected and trend
 * data is available. On initial load without a selected tile, the trend section
 * shows a "Select a metric" placeholder. In that case we wait for 2 sections
 * (scorecard + closed-won) instead.
 */
export async function waitForSections(
  page: Page,
  tab: TabName,
  opts?: { timeout?: number; minSections?: number },
): Promise<void> {
  const timeout = opts?.timeout ?? 30_000;
  const isCategory = tab !== 'Overview';
  // Category tabs without a pre-selected tile may only show 2 sections
  // (scorecard + closed-won). Use minSections override when needed.
  const minRequired = opts?.minSections ?? (isCategory ? 2 : 1);

  await page.waitForFunction(
    (min: number) => {
      const ready = document.querySelectorAll('[data-testid="section-ready"]');
      return ready.length >= min;
    },
    minRequired,
    { timeout },
  );
}

/**
 * Collect browser metrics for 4b-3 client-rendered pages.
 * Waits for section-ready markers instead of the server-rendered all-data-loaded.
 */
export async function collectClientMetrics(
  page: Page,
  tab: TabName,
): Promise<BrowserMetrics> {
  await waitForSections(page, tab, { timeout: 30_000 });

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

/**
 * Read current scorecard values from the visible scorecard table.
 * Returns an array of objects with tileId and currentValue.
 */
export async function readScorecardValues(
  page: Page,
): Promise<{ tileId: string; currentValue: string }[]> {
  return page.evaluate(() => {
    const tiles = document.querySelectorAll('[data-testid^="scorecard-tile-"]');
    return Array.from(tiles).map((el) => {
      const testId = el.getAttribute('data-testid') ?? '';
      const tileId = testId.replace('scorecard-tile-', '');
      const tds = el.querySelectorAll('td');
      const currentValue = tds[1]?.textContent?.trim() ?? '';
      return { tileId, currentValue };
    });
  });
}

/**
 * Get the currently active tab name from the DOM.
 * Reads the tab bar button with font-weight 600 (active styling).
 */
export async function getActiveTabName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const buttons = document.querySelectorAll('nav button');
    for (const btn of buttons) {
      const style = window.getComputedStyle(btn);
      if (style.fontWeight === '600' || style.fontWeight === 'bold') {
        return btn.textContent?.trim() ?? '';
      }
    }
    // Fallback: look for the button with a colored border-bottom
    for (const btn of buttons) {
      const style = window.getComputedStyle(btn);
      if (
        style.borderBottomColor !== 'rgba(0, 0, 0, 0)' &&
        style.borderBottomColor !== 'transparent'
      ) {
        return btn.textContent?.trim() ?? '';
      }
    }
    return '';
  });
}

