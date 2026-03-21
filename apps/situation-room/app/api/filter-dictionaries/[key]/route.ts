import { NextRequest, NextResponse } from 'next/server';
import type { FilterKey } from '@/lib/contracts';
import { FILTER_DEFINITIONS } from '@/lib/filters';
import { getFilterDictionary } from '@/lib/server/get-filter-dictionary';

type FilterDictionaryKey = Exclude<FilterKey, 'DateRange'>;

const FILTER_DICTIONARY_KEYS = new Set<FilterDictionaryKey>(
  FILTER_DEFINITIONS.filter((filter) => filter.type !== 'date').map(
    (filter) => filter.key as FilterDictionaryKey,
  ),
);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isFilterDictionaryKey(key: string): key is FilterDictionaryKey {
  return FILTER_DICTIONARY_KEYS.has(key as FilterDictionaryKey);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;

  if (!isFilterDictionaryKey(key)) {
    return badRequest(`Unsupported filter dictionary key: ${key}.`);
  }

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
