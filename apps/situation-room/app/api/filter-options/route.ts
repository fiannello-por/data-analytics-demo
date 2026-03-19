import { NextRequest, NextResponse } from 'next/server';
import {
  executeDistinctQuery,
  pollResults,
} from '@/lib/lightdash-client';
import { FILTER_DEFINITIONS } from '@/lib/filters';

const fieldIdByKey = Object.fromEntries(
  FILTER_DEFINITIONS.map((f) => [f.key, f.fieldId]),
);

// Cache options in memory for the lifetime of the server process
const optionsCache = new Map<string, { values: string[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (!key || !fieldIdByKey[key]) {
    return NextResponse.json(
      { error: `Invalid filter key: ${key}` },
      { status: 400 },
    );
  }

  const cached = optionsCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ options: cached.values });
  }

  try {
    const fieldId = fieldIdByKey[key];
    const queryUuid = await executeDistinctQuery(fieldId);
    const rows = await pollResults(queryUuid);

    const values = rows
      .map((row) => {
        const cell = row[fieldId];
        if (!cell) return null;
        const raw = cell.value.raw;
        if (raw === null || raw === undefined || raw === '') return null;
        return String(raw);
      })
      .filter((v): v is string => v !== null)
      .sort((a, b) => a.localeCompare(b));

    optionsCache.set(key, { values, ts: Date.now() });
    return NextResponse.json({ options: values });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
