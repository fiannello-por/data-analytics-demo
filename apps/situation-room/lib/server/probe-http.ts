import 'server-only';

import { NextResponse } from 'next/server';
import {
  parseProbeCacheMode,
  type ProbeCacheMode,
} from '@/lib/probe-cache-mode';

export type ProbeResponseMeta = {
  source: string;
  queryCount: number;
  bytesProcessed?: number;
  cacheMode: ProbeCacheMode;
};

export function getProbeExecutionOptionsFromRequest(request: Request): {
  cacheMode: ProbeCacheMode;
} {
  const url = new URL(request.url);

  return {
    cacheMode: parseProbeCacheMode(url.searchParams.get('cache')),
  };
}

export function badProbeRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function applyProbeHeaders(
  response: NextResponse,
  meta: ProbeResponseMeta,
  startedAt: number,
) {
  response.headers.set('x-situation-room-source', meta.source);
  response.headers.set('x-situation-room-query-count', String(meta.queryCount));
  response.headers.set('x-situation-room-cache-mode', meta.cacheMode);

  if (meta.bytesProcessed != null) {
    response.headers.set(
      'x-situation-room-bytes-processed',
      String(meta.bytesProcessed),
    );
  }

  response.headers.set(
    'x-situation-room-server-ms',
    String(Math.round((performance.now() - startedAt) * 100) / 100),
  );

  return response;
}
