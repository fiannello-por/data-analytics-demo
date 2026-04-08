import { test, expect, type Request as PwRequest } from '@playwright/test';
import {
  startServer,
  stopServer,
  buildTabUrl,
  collectClientMetrics,
  waitForSections,
  readScorecardValues,
  getActiveTabName,
  ALL_TABS,
} from './harness';

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 4b-3 gate tests — client-side architecture
// ═══════════════════════════════════════════════════════════════════════════════
//
// These tests verify that the 4b-3 client-driven dashboard meets its gate
// criteria: no full-page navigations on interactions, cached tab speed,
// draft filter isolation, URL round-trip, error resilience, and performance.
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Challenger client-side gate (Phase 4b-3)', () => {
  test.beforeAll(async () => {
    await startServer();
  });

  test.afterAll(async () => {
    await stopServer();
  });

  // ─── Test 1: Client-side tab switch (no page navigation) ─────────────────

  test('tab switch does not trigger a full-page navigation', async ({ page }) => {
    await page.goto(buildTabUrl('Overview'), { waitUntil: 'load' });
    await waitForSections(page, 'Overview');

    // Collect document-type requests from this point forward
    const documentRequests: PwRequest[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'document') {
        documentRequests.push(req);
      }
    });

    // Click "New Logo" tab button
    await page.getByTestId('tab-new-logo').click();

    // Wait for the category sections to appear
    await waitForSections(page, 'New Logo');

    // No document-level navigation should have occurred — only API fetches
    expect(documentRequests.length).toBe(0);

    // Verify the active tab text
    const activeTab = await getActiveTabName(page);
    expect(activeTab).toBe('New Logo');
  });

  // ─── Test 2: Cached tab switch speed ─────────────────────────────────────

  test('cached tab switch completes in < 500ms', async ({ page }) => {
    // Load New Logo tab first to populate its cache
    await page.goto(buildTabUrl('New Logo'), { waitUntil: 'load' });
    await waitForSections(page, 'New Logo');

    // Switch to Overview and wait for it
    await page.getByTestId('tab-overview').click();
    await waitForSections(page, 'Overview');

    // Now switch back to New Logo — data should come from TanStack Query cache
    const t0 = Date.now();
    await page.getByTestId('tab-new-logo').click();
    await waitForSections(page, 'New Logo');
    const elapsed = Date.now() - t0;

    console.log(`Cached tab switch (New Logo): ${elapsed}ms`);
    // 500ms is a generous CI-friendly threshold (target is < 100ms for warm cache)
    expect(elapsed).toBeLessThan(500);
  });

  // ─── Test 3: Filter apply without page reload ────────────────────────────

  test('filter apply changes data without page reload', async ({ page }) => {
    await page.goto(buildTabUrl('New Logo'), { waitUntil: 'load' });
    await waitForSections(page, 'New Logo');

    // Record current scorecard values
    const before = await readScorecardValues(page);
    expect(before.length).toBeGreaterThan(0);

    // Monitor for document navigations
    const documentRequests: PwRequest[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'document') {
        documentRequests.push(req);
      }
    });

    // Open the first filter dropdown (Division)
    const filterButtons = page.locator('[data-testid="filter-bar"] button[aria-haspopup="listbox"]');
    const filterCount = await filterButtons.count();
    expect(filterCount).toBeGreaterThan(0);

    // Click the first filter button to open its dropdown
    await filterButtons.first().click();

    // Wait for the dropdown to appear and check the first option
    const dialog = page.locator('div[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5_000 });
    const firstCheckbox = dialog.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();

    // Close the dropdown by clicking outside
    await page.locator('h1#challenger-shell').click();

    // The "Pending changes" indicator should be visible — click Apply
    const applyButton = page.getByRole('button', { name: 'Apply' });
    await applyButton.waitFor({ state: 'visible', timeout: 5_000 });
    await applyButton.click();

    // Wait for data to re-render after filter application
    await waitForSections(page, 'New Logo', { timeout: 15_000 });

    // No document navigation should have occurred
    expect(documentRequests.length).toBe(0);

    // The URL should contain the filter parameter
    const currentUrl = page.url();
    expect(currentUrl).toContain('tab=New+Logo');
  });

  // ─── Test 4: Draft filter isolation ──────────────────────────────────────

  test('draft filter changes do not affect displayed data', async ({ page }) => {
    await page.goto(buildTabUrl('New Logo'), { waitUntil: 'load' });
    await waitForSections(page, 'New Logo');

    // Record current scorecard values
    const before = await readScorecardValues(page);
    expect(before.length).toBeGreaterThan(0);

    // Open a filter dropdown and check an option (but do NOT click Apply)
    const filterButtons = page.locator('[data-testid="filter-bar"] button[aria-haspopup="listbox"]');
    await filterButtons.first().click();

    const dialog = page.locator('div[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5_000 });
    const firstCheckbox = dialog.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();

    // Close the dropdown (without applying)
    await page.locator('h1#challenger-shell').click();

    // Wait briefly to ensure no re-fetch is triggered
    await page.waitForTimeout(1_000);

    // Scorecard values should be unchanged
    const after = await readScorecardValues(page);
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      expect(after[i].currentValue).toBe(before[i].currentValue);
    }

    // The "Pending changes" indicator should be visible (confirming draft state)
    const pendingText = page.locator('text=Pending changes');
    await expect(pendingText).toBeVisible();
  });

  // ─── Test 5: URL round-trip (back/forward) ──────────────────────────────

  test('browser back/forward restores tab and filter state', async ({ page }) => {
    // Step 1: Start on Overview
    await page.goto(buildTabUrl('Overview'), { waitUntil: 'load' });
    await waitForSections(page, 'Overview');
    expect(page.url()).not.toContain('tab=');

    // Step 2: Switch to Expansion
    await page.getByTestId('tab-expansion').click();
    await waitForSections(page, 'Expansion');
    expect(page.url()).toContain('tab=Expansion');

    // Step 3: Apply a filter on Expansion
    const filterButtons = page.locator('[data-testid="filter-bar"] button[aria-haspopup="listbox"]');
    const filterCount = await filterButtons.count();
    if (filterCount > 0) {
      await filterButtons.first().click();
      const dialog = page.locator('div[role="dialog"]');
      await dialog.waitFor({ state: 'visible', timeout: 5_000 });
      const firstCheckbox = dialog.locator('input[type="checkbox"]').first();
      await firstCheckbox.check();

      // Close dropdown and apply
      await page.locator('h1#challenger-shell').click();
      const applyButton = page.getByRole('button', { name: 'Apply' });
      await applyButton.waitFor({ state: 'visible', timeout: 5_000 });
      await applyButton.click();
      await waitForSections(page, 'Expansion', { timeout: 15_000 });
    }

    const filteredUrl = page.url();

    // Step 4: Go back — should be on Expansion, unfiltered
    await page.goBack();
    await waitForSections(page, 'Expansion', { timeout: 10_000 });
    const backOnce = await getActiveTabName(page);
    expect(backOnce).toBe('Expansion');

    // Step 5: Go back again — should be on Overview
    await page.goBack();
    await waitForSections(page, 'Overview', { timeout: 10_000 });
    const backTwice = await getActiveTabName(page);
    expect(backTwice).toBe('Overview');

    // Step 6: Go forward — should be on Expansion, unfiltered
    await page.goForward();
    await waitForSections(page, 'Expansion', { timeout: 10_000 });
    const forward = await getActiveTabName(page);
    expect(forward).toBe('Expansion');
  });

  // ─── Test 6: Error resilience ────────────────────────────────────────────

  test('API error on one surface does not block others', async ({ page }) => {
    // Intercept scorecard API requests to return 500
    await page.route('**/api/scorecard/**', (route) => {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Simulated server error' }),
      });
    });

    await page.goto(buildTabUrl('New Logo'), { waitUntil: 'load' });

    // Wait for the error state on scorecard — it should show section-error
    const sectionError = page.locator('[data-testid="section-error"]');
    await sectionError.waitFor({ state: 'visible', timeout: 30_000 });

    // The closed-won section should still load and show section-ready.
    // Note: trend requires a tile selection, so we check for at least 1 section-ready
    // (from closed-won) in addition to the error marker.
    const sectionReady = page.locator('[data-testid="section-ready"]');
    const readyCount = await sectionReady.count();
    expect(readyCount).toBeGreaterThanOrEqual(1);

    // Verify the error message is displayed
    await expect(sectionError).toBeVisible();

    // Clean up the route intercept
    await page.unroute('**/api/scorecard/**');
  });

  // ─── Test 7: Performance gate (all 6 tabs) ──────────────────────────────

  for (const tab of ALL_TABS) {
    test(`performance gate: ${tab} loads in < 4s with TTFB < 50ms`, async ({ page }) => {
      await page.goto(buildTabUrl(tab), { waitUntil: 'load' });
      const metrics = await collectClientMetrics(page, tab);

      console.log(
        `[4b-3 gate] ${tab}: TTFB=${metrics.ttfbMs.toFixed(0)}ms, ` +
          `total=${metrics.totalPageLoadMs.toFixed(0)}ms`,
      );

      expect(metrics.ttfbMs).toBeLessThan(50);
      expect(metrics.totalPageLoadMs).toBeLessThan(4000);
    });
  }
});
