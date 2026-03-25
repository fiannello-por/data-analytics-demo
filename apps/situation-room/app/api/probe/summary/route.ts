import { NextResponse } from 'next/server';
import { getProbeSummary } from '@/lib/server/architecture-probes';
import {
  applyProbeHeaders,
  badProbeRequest,
  getProbeExecutionOptionsFromRequest,
} from '@/lib/server/probe-http';

export async function GET(request: Request) {
  const startedAt = performance.now();
  let options;
  try {
    options = getProbeExecutionOptionsFromRequest(request);
  } catch (error) {
    return badProbeRequest(
      error instanceof Error ? error.message : 'Invalid probe request.',
    );
  }

  const result = await getProbeSummary(undefined, options);
  return applyProbeHeaders(
    NextResponse.json(result.data),
    result.meta,
    startedAt,
  );
}
