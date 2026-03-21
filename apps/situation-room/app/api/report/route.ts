import { NextRequest, NextResponse } from 'next/server';
import { getScorecardReport } from '@/lib/server/get-scorecard-report';
import {
  collectReportRequestSearchParams,
  parseReportRequestFilters,
  ReportRequestError,
} from '@/lib/report-request';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const filters = parseReportRequestFilters(
      collectReportRequestSearchParams(request.nextUrl.searchParams),
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
  } catch (error) {
    if (error instanceof ReportRequestError || error instanceof Error) {
      return badRequest(error.message);
    }
    throw error;
  }
}
