import { NextRequest, NextResponse } from 'next/server';
import { isCategory } from '@/lib/dashboard/catalog';
import { getCategorySnapshotGroupManifest } from '@/lib/dashboard/progressive-snapshot';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import {
  applyProbeHeaders,
  getProbeExecutionOptionsFromRequest,
} from '@/lib/server/probe-http';
import { getDashboardV2CategorySnapshotGroup } from '@/lib/server/v2/get-dashboard-category-snapshot';

export const runtime = 'nodejs';
export const preferredRegion = 'pdx1';
export const maxDuration = 300;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; groupId: string }> },
) {
  const startedAt = performance.now();
  const { category, groupId } = await params;

  if (!isCategory(category)) {
    return badRequest(`Unsupported dashboard category: ${category}.`);
  }

  const validGroupIds = new Set(
    getCategorySnapshotGroupManifest(category).map((group) => group.groupId),
  );

  if (!validGroupIds.has(groupId)) {
    return badRequest(
      `Unsupported snapshot group "${groupId}" for category "${category}".`,
    );
  }

  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.set('category', category);
  const state = parseDashboardSearchParams(searchParams);
  let execution;

  try {
    execution = getProbeExecutionOptionsFromRequest(request);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : 'Invalid dashboard request.',
    );
  }

  const result = await getDashboardV2CategorySnapshotGroup(
    {
      activeCategory: category,
      groupId,
      filters: state.filters,
      dateRange: state.dateRange,
      previousDateRange: state.previousDateRange,
      selectedTileId: state.selectedTileId,
    },
    undefined,
    execution,
  );
  const response = NextResponse.json(result.data);

  applyProbeHeaders(response, result.meta, startedAt);
  response.headers.set(
    'x-analytics-suite-tile-timings',
    JSON.stringify(result.data.tileTimings),
  );

  return response;
}
