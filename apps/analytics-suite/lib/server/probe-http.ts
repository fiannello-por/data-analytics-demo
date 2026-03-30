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
  compileDurationMs?: number;
  executionDurationMs?: number;
  cacheStatus?: 'hit' | 'miss' | 'mixed';
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
  response.headers.set('x-analytics-suite-source', meta.source);
  response.headers.set(
    'x-analytics-suite-query-count',
    String(meta.queryCount),
  );
  response.headers.set('x-analytics-suite-cache-mode', meta.cacheMode);

  if (meta.bytesProcessed != null) {
    response.headers.set(
      'x-analytics-suite-bytes-processed',
      String(meta.bytesProcessed),
    );
  }

  if (meta.compileDurationMs != null) {
    response.headers.set(
      'x-analytics-suite-compile-ms',
      String(meta.compileDurationMs),
    );
  }

  if (meta.executionDurationMs != null) {
    response.headers.set(
      'x-analytics-suite-execution-ms',
      String(meta.executionDurationMs),
    );
  }

  if (meta.cacheStatus != null) {
    response.headers.set(
      'x-analytics-suite-cache-status',
      meta.cacheStatus,
    );
  }

  response.headers.set(
    'x-analytics-suite-server-ms',
    String(Math.round((performance.now() - startedAt) * 100) / 100),
  );

  return response;
}
