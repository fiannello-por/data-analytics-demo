import { NextRequest, NextResponse } from 'next/server';

import {
  GLOBAL_FILTER_KEYS,
  type DashboardFilters,
  type DateRange,
  type GlobalFilterKey,
} from '@por/dashboard-constants';
import { loadOverviewBoard } from '@/lib/overview-loader';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const filters = parseFilters(searchParams);
    const dateRange = parseDateRange(searchParams);
    const previousDateRange = dateRange
      ? derivePreviousDateRange(dateRange)
      : undefined;
    const cacheMode = parseCacheMode(searchParams.get('cacheMode'));

    const result = await loadOverviewBoard(
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
