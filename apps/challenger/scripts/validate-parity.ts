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

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    }
  }

  // Fetch production values
  type ProdScorecardRow = { tileId: string; currentValue: string; previousValue: string };
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

  // Compare per tile (both current and previous values)
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

  // Validate all 16 filter dictionaries
  console.log('Validating dictionaries...');
  for (const key of GLOBAL_FILTER_KEYS) {
    const dictResults = await validateDictionary(key);
    allResults.push(...dictResults);
  }

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
      '\nPhase 4b-1 gate FAILED. Fix mismatches before proceeding.',
    );
    process.exit(1);
  }

  console.log(
    '\nAll surfaces match production. Phase 4b-1 gate passed.',
  );
}

main().catch((err) => {
  console.error('Parity validation crashed:', err);
  process.exit(1);
});
