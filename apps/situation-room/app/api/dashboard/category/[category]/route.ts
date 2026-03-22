import { NextRequest, NextResponse } from 'next/server';
import { isCategory } from '@/lib/dashboard/catalog';
import { parseDashboardSearchParams } from '@/lib/dashboard/query-inputs';
import { getDashboardCategorySnapshot } from '@/lib/server/get-dashboard-category-snapshot';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;

  if (!isCategory(category)) {
    return badRequest(`Unsupported dashboard category: ${category}.`);
  }

  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.set('category', category);
  const state = parseDashboardSearchParams(searchParams);
  const result = await getDashboardCategorySnapshot(state);
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
  response.headers.set(
    'x-situation-room-tile-timings',
    JSON.stringify(result.data.tileTimings),
  );

  return response;
}
