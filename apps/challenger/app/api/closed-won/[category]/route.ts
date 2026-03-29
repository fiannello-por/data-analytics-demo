import { NextRequest, NextResponse } from 'next/server';

import {
  CATEGORY_ORDER,
  CLOSED_WON_DIMENSIONS,
  GLOBAL_FILTER_KEYS,
  type Category,
  type DashboardFilters,
  type DateRange,
  type GlobalFilterKey,
} from '@por/dashboard-constants';
import { loadClosedWon } from '@/lib/closed-won-loader';
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

function isValidSortField(value: string): boolean {
  return (CLOSED_WON_DIMENSIONS as readonly string[]).includes(value);
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

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.max(1, Number(searchParams.get('pageSize')) || 50);
    const rawSortField = searchParams.get('sortField') ?? 'close_date';
    const sortField = isValidSortField(rawSortField) ? rawSortField : 'close_date';
    const sortDir = searchParams.get('sortDir') ?? 'desc';
    const sortDescending = sortDir === 'desc';

    const result = await loadClosedWon(
      category,
      filters,
      dateRange,
      page,
      pageSize,
      sortField,
      sortDescending,
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
