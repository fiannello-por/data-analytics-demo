import { NextRequest, NextResponse } from 'next/server';

import { loadFilterDictionaries } from '@/lib/dictionary-loader';
import { parseCacheMode } from '@/lib/cache-mode';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const cacheMode = parseCacheMode(searchParams.get('cacheMode'));

    const result = await loadFilterDictionaries(cacheMode);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
