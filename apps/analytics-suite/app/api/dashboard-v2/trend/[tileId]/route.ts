import { NextRequest, NextResponse } from 'next/server';
import { findCategoryForTileId } from '@/lib/dashboard/catalog';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import {
  applyProbeHeaders,
  getProbeExecutionOptionsFromRequest,
} from '@/lib/server/probe-http';
import { getDashboardV2TileTrend } from '@/lib/server/v2/get-dashboard-tile-trend';

export const runtime = 'nodejs';
export const preferredRegion = 'pdx1';
export const maxDuration = 300;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tileId: string }> },
) {
  const startedAt = performance.now();
  const { tileId } = await params;
  const category = findCategoryForTileId(tileId);

  if (!category) {
    return badRequest(`Unsupported dashboard tile: ${tileId}.`);
  }

  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.set('category', category);
  searchParams.set('tileId', tileId);
  const state = parseDashboardSearchParams(searchParams);
  let execution;
  try {
    execution = getProbeExecutionOptionsFromRequest(request);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : 'Invalid dashboard request.',
    );
  }
  const result = await getDashboardV2TileTrend(
    {
      activeCategory: category,
      selectedTileId: state.selectedTileId,
      filters: state.filters,
      dateRange: state.dateRange,
      previousDateRange: state.previousDateRange,
      trendGrain: state.trendGrain,
    },
    undefined,
    execution,
  );
  const response = NextResponse.json(result.data);

  return applyProbeHeaders(response, result.meta, startedAt);
}
