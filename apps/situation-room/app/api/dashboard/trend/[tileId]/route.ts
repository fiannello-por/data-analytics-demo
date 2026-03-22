import { NextRequest, NextResponse } from 'next/server';
import { findCategoryForTileId } from '@/lib/dashboard/catalog';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import { getDashboardTileTrend } from '@/lib/server/get-dashboard-tile-trend';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tileId: string }> },
) {
  const { tileId } = await params;
  const category = findCategoryForTileId(tileId);

  if (!category) {
    return badRequest(`Unsupported dashboard tile: ${tileId}.`);
  }

  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.set('category', category);
  searchParams.set('tileId', tileId);
  const state = parseDashboardSearchParams(searchParams);
  const result = await getDashboardTileTrend({
    activeCategory: category,
    selectedTileId: state.selectedTileId,
    filters: state.filters,
    dateRange: state.dateRange,
    previousDateRange: state.previousDateRange,
    trendGrain: state.trendGrain,
  });
  const response = NextResponse.json(result.data);

  response.headers.set(
    'x-situation-room-query-count',
    String(result.meta.queryCount),
  );

  if (result.meta.bytesProcessed != null) {
    response.headers.set(
      'x-situation-room-bytes-processed',
      String(result.meta.bytesProcessed),
    );
  }

  response.headers.set('x-situation-room-source', result.meta.source);

  return response;
}
