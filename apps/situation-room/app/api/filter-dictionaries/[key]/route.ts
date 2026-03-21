import { NextRequest, NextResponse } from 'next/server';
import { getFilterDictionary } from '@/lib/server/get-filter-dictionary';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const adapterResult = await getFilterDictionary(key);
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
