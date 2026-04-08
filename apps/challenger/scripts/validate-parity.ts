// apps/challenger/scripts/validate-parity.ts
//
// Phase 4b-1 Parity Validation Script
// Compares challenger v2 query results against the production analytics-suite API.
//
// Usage: npx tsx apps/challenger/scripts/validate-parity.ts
// Requires: production analytics-suite running on port 3300
//           LIGHTDASH_URL, LIGHTDASH_API_KEY, LIGHTDASH_PROJECT_UUID env vars

import {
  CATEGORY_ORDER,
  DASHBOARD_TAB_ORDER,
  GLOBAL_FILTER_KEYS,
  FILTER_DIMENSIONS,
  getCategoryTiles,
  getDefaultTileId,
  getSnapshotGroups,
  DASHBOARD_V2_BASE_MODEL,
  DASHBOARD_V2_CLOSED_WON_MODEL,
  CLOSED_WON_DIMENSIONS,
  getSemanticTileSpec,
  type Category,
  type DateRange,
  type GlobalFilterKey,
} from '@por/dashboard-constants';

import {
  buildV2SnapshotGroupQuery,
  buildV2TrendQuery,
  buildV2ClosedWonQuery,
} from '../lib/v2-query-builder';
import { buildDictionaryQuery } from '../lib/query-builder';
import { executeMetricQuery } from '../lib/lightdash-v2-client';
import type { ResultRow } from '../lib/types';

// ── Configuration ───────────────────────────────────────────────────────────

const PROD_BASE = 'http://localhost:3300';
const CHALLENGER_BASE = 'http://localhost:3500';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPctChange(
  currentValue: number | null,
  previousValue: number | null,
): string {
  if (
    currentValue == null ||
    previousValue == null ||
    previousValue === 0 ||
    Number.isNaN(currentValue) ||
    Number.isNaN(previousValue)
  ) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format((currentValue - previousValue) / Math.abs(previousValue));
}

function buildDateRanges(): {
  current: DateRange;
  previous: DateRange;
} {
  const now = new Date();
  const year = now.getFullYear();
  const today = now.toISOString().slice(0, 10);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    current: { startDate: `${year}-01-01`, endDate: today },
    previous: {
      startDate: `${year - 1}-01-01`,
      endDate: `${year - 1}-${month}-${day}`,
    },
  };
}

async function fetchProd<T>(path: string): Promise<T> {
  const url = `${PROD_BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Production API ${res.status}: ${url}`);
  }
  return (await res.json()) as T;
}

type ValidationResult = {
  surface: string;
  passed: boolean;
  details?: string;
};

// ── Surface 1: Scorecard parity ─────────────────────────────────────────────

async function validateScorecard(
  category: Category,
  dateRange: DateRange,
  previousDateRange: DateRange,
): Promise<ValidationResult[]> {
  const tiles = getCategoryTiles(category);
  const tileIds = tiles.map((t) => t.tileId);
  const groups = getSnapshotGroups(tileIds);

  // Collect v2 current and previous values per tile by running each snapshot group query
  const v2CurrentValues = new Map<string, string>();
  const v2PreviousValues = new Map<string, string>();
  const v2PctChangeValues = new Map<string, string>();
  for (const group of groups) {
    const currentQuery = buildV2SnapshotGroupQuery(category, {}, dateRange, group);
    const previousQuery = buildV2SnapshotGroupQuery(category, {}, previousDateRange, group);
    const [currentResult, previousResult] = await Promise.all([
      executeMetricQuery(currentQuery),
      executeMetricQuery(previousQuery),
    ]);
    const currentRow = currentResult.rows[0];
    const previousRow = previousResult.rows[0];
    for (const tile of group.tiles) {
      const fieldId = `${DASHBOARD_V2_BASE_MODEL}_${tile.measure}`;
      if (currentRow) {
        const cell = currentRow[fieldId];
        if (cell) {
          v2CurrentValues.set(tile.tileId, cell.value.formatted);
        }
      }
      if (previousRow) {
        const cell = previousRow[fieldId];
        if (cell) {
          v2PreviousValues.set(tile.tileId, cell.value.formatted);
        }
      }
      const currentRawCell = currentRow?.[fieldId];
      const previousRawCell = previousRow?.[fieldId];
      const currentRaw =
        currentRawCell?.value?.raw != null
          ? Number(currentRawCell.value.raw)
          : null;
      const previousRaw =
        previousRawCell?.value?.raw != null
          ? Number(previousRawCell.value.raw)
          : null;
      v2PctChangeValues.set(tile.tileId, formatPctChange(currentRaw, previousRaw));
    }
  }

  // Fetch production values
  type ProdScorecardRow = { tileId: string; currentValue: string; previousValue: string; pctChange: string };
  type ProdScorecardResponse = { rows: ProdScorecardRow[] };
  const params = new URLSearchParams({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    previousStartDate: previousDateRange.startDate,
    previousEndDate: previousDateRange.endDate,
  });
  const prodData = await fetchProd<ProdScorecardResponse>(
    `/api/dashboard-v2/category/${encodeURIComponent(category)}?${params}`,
  );
  const prodCurrentValues = new Map(
    prodData.rows.map((r) => [r.tileId, r.currentValue]),
  );
  const prodPreviousValues = new Map(
    prodData.rows.map((r) => [r.tileId, r.previousValue]),
  );
  const prodPctChangeValues = new Map(
    prodData.rows.map((r) => [r.tileId, r.pctChange]),
  );

  // Compare per tile (current value, previous value, and pctChange)
  const mismatches: string[] = [];
  for (const tile of tiles) {
    const v2Current = v2CurrentValues.get(tile.tileId) ?? '(missing)';
    const prodCurrent = prodCurrentValues.get(tile.tileId) ?? '(missing)';
    if (v2Current !== prodCurrent) {
      mismatches.push(`  ${tile.tileId} currentValue: v2="${v2Current}" prod="${prodCurrent}"`);
    }
    const v2Previous = v2PreviousValues.get(tile.tileId) ?? '(missing)';
    const prodPrevious = prodPreviousValues.get(tile.tileId) ?? '(missing)';
    if (v2Previous !== prodPrevious) {
      mismatches.push(`  ${tile.tileId} previousValue: v2="${v2Previous}" prod="${prodPrevious}"`);
    }
    const v2PctChange = v2PctChangeValues.get(tile.tileId) ?? '(missing)';
    const prodPctChange = prodPctChangeValues.get(tile.tileId) ?? '(missing)';
    if (v2PctChange !== prodPctChange) {
      mismatches.push(`  ${tile.tileId} pctChange: v2="${v2PctChange}" prod="${prodPctChange}"`);
    }
  }

  return [
    {
      surface: `Scorecard: ${category}`,
      passed: mismatches.length === 0,
      details:
        mismatches.length > 0 ? mismatches.join('\n') : undefined,
    },
  ];
}

// ── Surface 2: Trend parity ─────────────────────────────────────────────────

async function validateTrend(
  category: Category,
  dateRange: DateRange,
  previousDateRange: DateRange,
): Promise<ValidationResult[]> {
  const tileId = getDefaultTileId(category);
  const spec = getSemanticTileSpec(tileId);
  const currentQuery = buildV2TrendQuery(category, tileId, {}, dateRange);
  const previousQuery = buildV2TrendQuery(category, tileId, {}, previousDateRange);
  const [currentResult, previousResult] = await Promise.all([
    executeMetricQuery(currentQuery),
    executeMetricQuery(previousQuery),
  ]);

  // Extract v2 points: bucket key from week dimension, value from measure
  const weekField = `${DASHBOARD_V2_BASE_MODEL}_${spec.dateDimension}_week`;
  const valueField = `${DASHBOARD_V2_BASE_MODEL}_${spec.measure}`;

  const v2CurrentPoints = currentResult.rows.map((row: ResultRow) => ({
    bucketKey: String(row[weekField]?.value?.formatted ?? '').slice(0, 10),
    value: row[valueField]?.value?.raw,
  }));

  const v2PreviousPoints = previousResult.rows.map((row: ResultRow) => ({
    bucketKey: String(row[weekField]?.value?.formatted ?? '').slice(0, 10),
    value: row[valueField]?.value?.raw,
  }));

  // Fetch production
  type ProdTrendPoint = { bucketKey: string; currentValue: unknown; previousValue: unknown };
  type ProdTrendResponse = { points: ProdTrendPoint[] };
  const params = new URLSearchParams({
    category,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    previousStartDate: previousDateRange.startDate,
    previousEndDate: previousDateRange.endDate,
  });
  const prodData = await fetchProd<ProdTrendResponse>(
    `/api/dashboard-v2/trend/${encodeURIComponent(tileId)}?${params}`,
  );

  const prodCurrentPoints = prodData.points.map((p) => ({
    bucketKey: String(p.bucketKey).slice(0, 10),
    value: p.currentValue,
  }));

  const prodPreviousPoints = prodData.points.map((p) => ({
    bucketKey: String(p.bucketKey).slice(0, 10),
    value: p.previousValue,
  }));

  // Compare current-window points
  const mismatches: string[] = [];
  const currentMaxLen = Math.max(v2CurrentPoints.length, prodCurrentPoints.length);
  for (let i = 0; i < currentMaxLen; i++) {
    const v2 = v2CurrentPoints[i];
    const prod = prodCurrentPoints[i];
    if (!v2 || !prod) {
      mismatches.push(
        `  current index=${i}: v2=${JSON.stringify(v2 ?? null)} prod=${JSON.stringify(prod ?? null)}`,
      );
    } else if (
      v2.bucketKey !== prod.bucketKey ||
      String(v2.value) !== String(prod.value)
    ) {
      mismatches.push(
        `  current ${v2.bucketKey}: v2=${JSON.stringify(v2.value)} prod=${JSON.stringify(prod.value)}`,
      );
    }
    if (mismatches.length >= 3) break;
  }

  // Compare previous-window points
  const previousMaxLen = Math.max(v2PreviousPoints.length, prodPreviousPoints.length);
  for (let i = 0; i < previousMaxLen; i++) {
    const v2 = v2PreviousPoints[i];
    const prod = prodPreviousPoints[i];
    if (!v2 || !prod) {
      mismatches.push(
        `  previous index=${i}: v2=${JSON.stringify(v2 ?? null)} prod=${JSON.stringify(prod ?? null)}`,
      );
    } else if (
      v2.bucketKey !== prod.bucketKey ||
      String(v2.value) !== String(prod.value)
    ) {
      mismatches.push(
        `  previous ${v2.bucketKey}: v2=${JSON.stringify(v2.value)} prod=${JSON.stringify(prod.value)}`,
      );
    }
    if (mismatches.length >= 6) break;
  }

  return [
    {
      surface: `Trend: ${category} (${tileId})`,
      passed: mismatches.length === 0,
      details:
        mismatches.length > 0
          ? `First ${mismatches.length} mismatch(es):\n${mismatches.join('\n')}`
          : undefined,
    },
  ];
}

// ── Surface 3: Closed-won parity ────────────────────────────────────────────

async function validateClosedWon(
  category: Category,
  dateRange: DateRange,
): Promise<ValidationResult[]> {
  const query = buildV2ClosedWonQuery(category, {}, dateRange);
  const result = await executeMetricQuery(query);

  // Build v2 projection: account_name|close_date[0:10]|acv
  const accountNameField = `${DASHBOARD_V2_CLOSED_WON_MODEL}_account_name`;
  const closeDateField = `${DASHBOARD_V2_CLOSED_WON_MODEL}_close_date`;
  const acvField = `${DASHBOARD_V2_CLOSED_WON_MODEL}_acv`;

  const v2Projection = result.rows
    .map((row: ResultRow) => {
      const accountName = String(
        row[accountNameField]?.value?.formatted ?? '',
      );
      const closeDate = String(
        row[closeDateField]?.value?.formatted ?? '',
      ).slice(0, 10);
      const acv = String(row[acvField]?.value?.formatted ?? '');
      return `${accountName}|${closeDate}|${acv}`;
    })
    .sort();

  // Fetch production
  type ProdClosedWonRow = {
    accountName: string;
    closeDate: string;
    acv: string;
  };
  type ProdClosedWonResponse = { rows: ProdClosedWonRow[] };
  const params = new URLSearchParams({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const prodData = await fetchProd<ProdClosedWonResponse>(
    `/api/dashboard-v2/closed-won/${encodeURIComponent(category)}?${params}`,
  );

  const prodProjection = prodData.rows
    .map((r) => {
      const closeDate = String(r.closeDate).slice(0, 10);
      return `${r.accountName}|${closeDate}|${r.acv}`;
    })
    .sort();

  // Compare element-by-element
  const mismatches: string[] = [];
  const maxLen = Math.max(v2Projection.length, prodProjection.length);
  for (let i = 0; i < maxLen; i++) {
    const v2Row = v2Projection[i] ?? '(missing)';
    const prodRow = prodProjection[i] ?? '(missing)';
    if (v2Row !== prodRow) {
      mismatches.push(`  [${i}]: v2="${v2Row}" prod="${prodRow}"`);
    }
    if (mismatches.length >= 3) break;
  }

  return [
    {
      surface: `Closed-Won: ${category}`,
      passed: mismatches.length === 0,
      details:
        mismatches.length > 0
          ? `Row count v2=${v2Projection.length} prod=${prodProjection.length}. First ${mismatches.length} mismatch(es):\n${mismatches.join('\n')}`
          : undefined,
    },
  ];
}

// ── Surface 4: Dictionary parity ────────────────────────────────────────────

async function validateDictionary(
  key: GlobalFilterKey,
): Promise<ValidationResult[]> {
  const dimension = FILTER_DIMENSIONS[key];
  const query = buildDictionaryQuery(key);
  const result = await executeMetricQuery(query);

  const fieldId = `${DASHBOARD_V2_BASE_MODEL}_${dimension}`;
  const v2Values = result.rows
    .map((row: ResultRow) => String(row[fieldId]?.value?.formatted ?? ''))
    .sort();

  // Fetch production
  type ProdDictionaryResponse = { options: { value: string }[] };
  const prodData = await fetchProd<ProdDictionaryResponse>(
    `/api/dashboard-v2/filter-dictionaries/${encodeURIComponent(key)}`,
  );
  const prodValues = prodData.options.map((o) => String(o.value)).sort();

  // Compare
  const mismatches: string[] = [];
  const maxLen = Math.max(v2Values.length, prodValues.length);
  for (let i = 0; i < maxLen; i++) {
    const v2Val = v2Values[i] ?? '(missing)';
    const prodVal = prodValues[i] ?? '(missing)';
    if (v2Val !== prodVal) {
      mismatches.push(`  [${i}]: v2="${v2Val}" prod="${prodVal}"`);
    }
    if (mismatches.length >= 3) break;
  }

  return [
    {
      surface: `Dictionary: ${key}`,
      passed: mismatches.length === 0,
      details:
        mismatches.length > 0
          ? `Count v2=${v2Values.length} prod=${prodValues.length}. First ${mismatches.length} mismatch(es):\n${mismatches.join('\n')}`
          : undefined,
    },
  ];
}

// ── Phase 4b-2: Tab navigation ───────────────────────────────────────────────

const ERROR_PATTERNS = ['Error:', 'failed', 'at Object.', 'at Function.', 'SyntaxError', 'TypeError', 'ReferenceError'];

async function validateTabNavigation(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const tab of DASHBOARD_TAB_ORDER) {
    const url = `${CHALLENGER_BASE}/?tab=${encodeURIComponent(tab)}&cacheMode=off`;
    try {
      const res = await fetch(url);
      if (res.status !== 200) {
        results.push({
          surface: `Tab navigation: ${tab}`,
          passed: false,
          details: `HTTP ${res.status}`,
        });
        continue;
      }

      const body = await res.text();
      const hasSectionReady = body.includes('data-testid="section-ready"');
      const errorMatches = ERROR_PATTERNS.filter((p) => body.includes(p));

      if (!hasSectionReady) {
        results.push({
          surface: `Tab navigation: ${tab}`,
          passed: false,
          details: 'Response body missing data-testid="section-ready"',
        });
      } else if (errorMatches.length > 0) {
        results.push({
          surface: `Tab navigation: ${tab}`,
          passed: false,
          details: `Error indicators found in body: ${errorMatches.join(', ')}`,
        });
      } else {
        results.push({
          surface: `Tab navigation: ${tab}`,
          passed: true,
        });
      }
    } catch (err) {
      results.push({
        surface: `Tab navigation: ${tab}`,
        passed: false,
        details: `Fetch error: ${String(err)}`,
      });
    }
  }

  return results;
}

// ── Phase 4b-2: Filter smoke test ────────────────────────────────────────────

async function validateFilterSmoke(): Promise<ValidationResult[]> {
  // Fetch real Division options
  const divisionQuery = buildDictionaryQuery('Division');
  const divisionResult = await executeMetricQuery(divisionQuery);
  const divisionDimField = `${DASHBOARD_V2_BASE_MODEL}_${FILTER_DIMENSIONS['Division']}`;
  const divisionOptions = divisionResult.rows
    .map((row: ResultRow) => String(row[divisionDimField]?.value?.formatted ?? ''))
    .filter((v) => v.length > 0);

  if (divisionOptions.length === 0) {
    console.log('  [SKIP] Division dictionary returned zero options — skipping filter smoke test.');
    return [
      {
        surface: 'Filter smoke test: Division',
        passed: true,
        details: 'SKIPPED: Division dictionary returned zero options',
      },
    ];
  }

  const firstOption = divisionOptions[0]!;

  const unfilteredUrl = `${CHALLENGER_BASE}/?tab=${encodeURIComponent('New Logo')}&cacheMode=off`;
  const filteredUrl = `${CHALLENGER_BASE}/?tab=${encodeURIComponent('New Logo')}&Division=${encodeURIComponent(firstOption)}&cacheMode=off`;

  let unfilteredBody: string;
  let filteredBody: string;

  try {
    const [unfilteredRes, filteredRes] = await Promise.all([
      fetch(unfilteredUrl),
      fetch(filteredUrl),
    ]);

    if (!unfilteredRes.ok || !filteredRes.ok) {
      return [
        {
          surface: 'Filter smoke test: Division',
          passed: false,
          details: `HTTP errors: unfiltered=${unfilteredRes.status} filtered=${filteredRes.status}`,
        },
      ];
    }

    [unfilteredBody, filteredBody] = await Promise.all([
      unfilteredRes.text(),
      filteredRes.text(),
    ]);
  } catch (err) {
    return [
      {
        surface: 'Filter smoke test: Division',
        passed: false,
        details: `Fetch error: ${String(err)}`,
      },
    ];
  }

  // Extract section-ready snippets from both bodies and compare
  const extractSections = (html: string): string[] => {
    const sections: string[] = [];
    let match: RegExpExecArray | null;
    const re = /data-testid="section-ready"/g;
    while ((match = re.exec(html)) !== null) {
      // Grab a snippet of 500 chars after each section-ready marker
      sections.push(html.slice(match.index, match.index + 500));
    }
    return sections;
  };

  const unfilteredSections = extractSections(unfilteredBody);
  const filteredSections = extractSections(filteredBody);

  if (unfilteredSections.length === 0 && filteredSections.length === 0) {
    return [
      {
        surface: 'Filter smoke test: Division',
        passed: false,
        details: 'Neither response contained data-testid="section-ready"',
      },
    ];
  }

  // Compare: at least one section snippet should differ
  const differ = unfilteredSections.some(
    (s, i) => s !== filteredSections[i],
  ) || unfilteredSections.length !== filteredSections.length;

  return [
    {
      surface: `Filter smoke test: Division="${firstOption}"`,
      passed: differ,
      details: differ
        ? undefined
        : `Filtered and unfiltered responses appear identical (${unfilteredSections.length} section(s) checked). Filter may not be applied.`,
    },
  ];
}

// ── Phase 4b-2: Closed-won pagination ────────────────────────────────────────

async function validateClosedWonPagination(
  dateRange: DateRange,
): Promise<ValidationResult[]> {
  // Use Total category to maximise chance of having >50 rows
  const query = buildV2ClosedWonQuery('Total', {}, dateRange);

  const [page1Result, page2Result] = await Promise.all([
    executeMetricQuery(query, { pageSize: 50, page: 1 }),
    executeMetricQuery(query, { pageSize: 50, page: 2 }),
  ]);

  const accountNameField = `${DASHBOARD_V2_CLOSED_WON_MODEL}_account_name`;

  if (page1Result.status !== 'ready') {
    return [
      {
        surface: 'Closed-won pagination',
        passed: false,
        details: `Page 1 status is "${page1Result.status}"`,
      },
    ];
  }

  if (page2Result.status !== 'ready') {
    return [
      {
        surface: 'Closed-won pagination',
        passed: false,
        details: `Page 2 status is "${page2Result.status}"`,
      },
    ];
  }

  if (page1Result.totalResults <= 50) {
    console.log(
      `  [SKIP] Closed-won totalResults=${page1Result.totalResults} (<=50) — skipping page 2 comparison.`,
    );
    return [
      {
        surface: 'Closed-won pagination',
        passed: true,
        details: `SKIPPED: Only ${page1Result.totalResults} results (single page)`,
      },
    ];
  }

  if (page1Result.totalResults !== page2Result.totalResults) {
    return [
      {
        surface: 'Closed-won pagination',
        passed: false,
        details: `totalResults differs: page1=${page1Result.totalResults} page2=${page2Result.totalResults}`,
      },
    ];
  }

  const page1FirstAccount = String(
    page1Result.rows[0]?.[accountNameField]?.value?.formatted ?? '(empty)',
  );
  const page2FirstAccount = String(
    page2Result.rows[0]?.[accountNameField]?.value?.formatted ?? '(empty)',
  );

  if (page1FirstAccount === page2FirstAccount) {
    return [
      {
        surface: 'Closed-won pagination',
        passed: false,
        details: `Page 1 and page 2 first row account_name both "${page1FirstAccount}" — pages may be identical`,
      },
    ];
  }

  return [
    {
      surface: 'Closed-won pagination',
      passed: true,
      details: `totalResults=${page1Result.totalResults}, page1[0]="${page1FirstAccount}", page2[0]="${page2FirstAccount}"`,
    },
  ];
}

// ── Phase 4b-2: Dictionary completeness ──────────────────────────────────────

async function validateDictionaryCompleteness(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const key of GLOBAL_FILTER_KEYS) {
    const dimension = FILTER_DIMENSIONS[key];
    const query = buildDictionaryQuery(key);
    const result = await executeMetricQuery(query);

    const fieldId = `${DASHBOARD_V2_BASE_MODEL}_${dimension}`;
    const options = result.rows
      .map((row: ResultRow) => String(row[fieldId]?.value?.formatted ?? ''))
      .filter((v) => v.length > 0);

    results.push({
      surface: `Dictionary completeness: ${key}`,
      passed: options.length > 0,
      details: options.length === 0 ? 'Returned 0 options' : undefined,
    });
  }

  return results;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { current, previous } = buildDateRanges();

  console.log('Phase 4b-1 Parity Validation');
  console.log(`Date range: ${current.startDate} to ${current.endDate}`);
  console.log('---\n');

  const allResults: ValidationResult[] = [];

  // Validate per-category surfaces
  for (const category of CATEGORY_ORDER) {
    console.log(`Validating ${category}...`);

    const scorecardResults = await validateScorecard(
      category,
      current,
      previous,
    );
    allResults.push(...scorecardResults);

    const trendResults = await validateTrend(category, current, previous);
    allResults.push(...trendResults);

    const closedWonResults = await validateClosedWon(category, current);
    allResults.push(...closedWonResults);
  }

  // Validate all 16 filter dictionaries (parity with production)
  console.log('Validating dictionaries...');
  for (const key of GLOBAL_FILTER_KEYS) {
    const dictResults = await validateDictionary(key);
    allResults.push(...dictResults);
  }

  // ── Phase 4b-2 Validation ───────────────────────────────────────────────
  console.log('\n=== Phase 4b-2 Validation ===\n');

  console.log('Validating tab navigation (requires challenger on port 3500)...');
  const tabResults = await validateTabNavigation();
  allResults.push(...tabResults);

  console.log('Validating filter smoke test...');
  const filterResults = await validateFilterSmoke();
  allResults.push(...filterResults);

  console.log('Validating closed-won pagination...');
  const paginationResults = await validateClosedWonPagination(current);
  allResults.push(...paginationResults);

  console.log('Validating dictionary completeness (all 16 keys have >0 options)...');
  const completenessResults = await validateDictionaryCompleteness();
  allResults.push(...completenessResults);

  // Report
  console.log('\n=== RESULTS ===');

  const passed = allResults.filter((r) => r.passed);
  const failed = allResults.filter((r) => !r.passed);

  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total: ${allResults.length}`);

  if (failed.length > 0) {
    console.log('\n--- FAILURES ---');
    for (const f of failed) {
      console.log(`\nFAIL: ${f.surface}`);
      if (f.details) {
        console.log(f.details);
      }
    }
    console.log(
      '\nParity validation FAILED. Fix mismatches before proceeding.',
    );
    process.exit(1);
  }

  console.log(
    '\nAll surfaces passed. Phase 4b-1 and 4b-2 gates passed.',
  );
}

main().catch((err) => {
  console.error('Parity validation crashed:', err);
  process.exit(1);
});
