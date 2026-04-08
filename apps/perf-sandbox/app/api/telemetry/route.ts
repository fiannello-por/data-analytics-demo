// apps/perf-sandbox/app/api/telemetry/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ExperimentRunMetrics, RunMode } from '@/lib/types';

type TelemetryRequest = {
  runId: string;
  experimentId: string;
  runMode: RunMode;
  runIndex: number;
  browserMetrics: {
    ttfbMs: number;
    fcpMs: number;
    lcpMs: number;
    totalPageLoadMs: number;
    jsDownloadMs: number;
    hydrationMs: number;
  };
  serverMetrics: {
    ssrDataFetchMs: number;
    totalCompileMs: number;
    totalExecuteMs: number;
    totalQueryCount: number;
    totalBytesProcessed: number;
    filterDictionaryMs: number;
    semanticCacheHits: number;
    semanticCacheMisses: number;
  };
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TelemetryRequest;

  const metrics: ExperimentRunMetrics = {
    ...body.browserMetrics,
    ...body.serverMetrics,
    experimentId: body.experimentId,
    runMode: body.runMode,
    runIndex: body.runIndex,
    timestamp: new Date().toISOString(),
  };

  const resultsDir = join(process.cwd(), 'results');
  mkdirSync(resultsDir, { recursive: true });

  const filename = `${body.experimentId}_${body.runMode}_${String(body.runIndex).padStart(3, '0')}.json`;
  writeFileSync(join(resultsDir, filename), JSON.stringify(metrics, null, 2));

  return NextResponse.json({ ok: true, filename });
}