import { NextRequest, NextResponse } from 'next/server';

import {
  CATEGORY_ORDER,
  GLOBAL_FILTER_KEYS,
  getCategoryTiles,
  type Category,
  type DashboardFilters,
  type DateRange,
  type GlobalFilterKey,
} from '@por/dashboard-constants';
import { loadScorecard } from '@/lib/scorecard-loader';
import { derivePreviousDateRange } from '@/lib/dashboard-reducer';
import { parseCacheMode } from '@/lib/cache-mode';

function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  const filters: DashboardFilters = {};
  for (const key of GLOBAL_FILTER_KEYS) {
    const values = searchParams.getAll(key);
    if (values.length > 0) {
      filters[key as GlobalFilterKey] = values;
    }
  }
  return filters;
}

function parseDateRange(searchParams: URLSearchParams): DateRange | undefined {
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (startDate && endDate) {
    return { startDate, endDate };
  }
  return undefined;
}

function isValidCategory(value: string): value is Category {
  return (CATEGORY_ORDER as readonly string[]).includes(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  try {
    const { category } = await params;

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: `Invalid category: ${category}` },
        { status: 400 },
      );
    }

    const { searchParams } = request.nextUrl;
    const filters = parseFilters(searchParams);
    const dateRange = parseDateRange(searchParams);
    const cacheMode = parseCacheMode(searchParams.get('cacheMode'));

    if (!dateRange) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 },
      );
    }

    const previousDateRange = derivePreviousDateRange(dateRange);
    const tileIds = getCategoryTiles(category).map((t) => t.tileId);

    const result = await loadScorecard(
      category,
      tileIds,
      filters,
      dateRange,
      previousDateRange,
      cacheMode,
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
