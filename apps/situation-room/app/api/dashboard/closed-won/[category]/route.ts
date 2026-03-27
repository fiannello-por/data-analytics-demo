import { NextRequest, NextResponse } from 'next/server';
import { isCategory } from '@/lib/dashboard/catalog';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import {
  applyProbeHeaders,
  getProbeExecutionOptionsFromRequest,
} from '@/lib/server/probe-http';
import { getDashboardClosedWonOpportunities } from '@/lib/server/get-dashboard-closed-won-opportunities';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const startedAt = performance.now();
  const { category } = await params;

  if (!isCategory(category)) {
    return badRequest(`Unsupported dashboard category: ${category}.`);
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

  const result = await getDashboardClosedWonOpportunities(
    {
      activeCategory: category,
      filters: state.filters,
      dateRange: state.dateRange,
    },
    undefined,
    execution,
  );
  const response = NextResponse.json(result.data);

  return applyProbeHeaders(response, result.meta, startedAt);
}
