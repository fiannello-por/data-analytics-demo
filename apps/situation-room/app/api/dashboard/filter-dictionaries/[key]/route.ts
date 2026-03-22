import { NextRequest, NextResponse } from 'next/server';
import { isGlobalFilterKey } from '@/lib/dashboard/filter-config';
import { getDashboardFilterDictionary } from '@/lib/server/get-dashboard-filter-dictionary';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;

  if (!isGlobalFilterKey(key)) {
    return badRequest(`Unsupported dashboard filter dictionary key: ${key}.`);
  }

  const result = await getDashboardFilterDictionary(key);
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
