import { NextRequest, NextResponse } from 'next/server';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import {
  applyProbeHeaders,
  getProbeExecutionOptionsFromRequest,
} from '@/lib/server/probe-http';
import { getDashboardV2OverviewBoard } from '@/lib/server/v2/get-dashboard-overview-board';

export const runtime = 'nodejs';
export const preferredRegion = 'pdx1';
export const maxDuration = 300;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  const state = parseDashboardSearchParams(request.nextUrl.searchParams);
  let execution;

  try {
    execution = getProbeExecutionOptionsFromRequest(request);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : 'Invalid dashboard request.',
    );
  }

  const result = await getDashboardV2OverviewBoard(
    {
      filters: state.filters,
      dateRange: state.dateRange,
      previousDateRange: state.previousDateRange,
    },
    undefined,
    execution,
  );
  const response = NextResponse.json(result.data);

  return applyProbeHeaders(response, result.meta, startedAt);
}
