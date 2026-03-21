import { NextRequest, NextResponse } from 'next/server';
import { parseFilterParams } from '@/lib/filters';
import { getScorecardReport } from '@/lib/server/get-scorecard-report';

export async function GET(request: NextRequest) {
  const filters = parseFilterParams(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const adapterResult = await getScorecardReport(filters);
  const response = NextResponse.json(adapterResult.data);

  response.headers.set(
    'x-situation-room-query-count',
    String(adapterResult.meta.queryCount),
  );

  if (adapterResult.meta.bytesProcessed != null) {
    response.headers.set(
      'x-situation-room-bytes-processed',
      String(adapterResult.meta.bytesProcessed),
    );
  }

  response.headers.set('x-situation-room-source', adapterResult.meta.source);

  return response;
}
