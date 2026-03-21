import { NextRequest, NextResponse } from 'next/server';
import { getValidatedDateRangeMode } from '@/lib/bigquery/sql';
import { parseFilterParams } from '@/lib/filters';
import { getScorecardReport } from '@/lib/server/get-scorecard-report';

function getRepeatedQueryParamKey(searchParams: URLSearchParams): string | null {
  const seen = new Set<string>();

  for (const key of searchParams.keys()) {
    if (seen.has(key)) {
      return key;
    }
    seen.add(key);
  }

  return null;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const repeatedKey = getRepeatedQueryParamKey(request.nextUrl.searchParams);
  if (repeatedKey) {
    return badRequest(
      `Repeated query parameter "${repeatedKey}" is not supported.`,
    );
  }

  const filters = parseFilterParams(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  try {
    getValidatedDateRangeMode(filters);
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    throw error;
  }

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
