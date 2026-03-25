import { NextResponse } from 'next/server';
import { getProbeDivisionFilterOptions } from '@/lib/server/architecture-probes';
import {
  applyProbeHeaders,
  badProbeRequest,
  getProbeExecutionOptionsFromRequest,
} from '@/lib/server/probe-http';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const startedAt = performance.now();
  const { key } = await params;

  if (key !== 'Division') {
    return badProbeRequest(`Unsupported probe filter key: ${key}.`);
  }

  let options;
  try {
    options = getProbeExecutionOptionsFromRequest(request);
  } catch (error) {
    return badProbeRequest(
      error instanceof Error ? error.message : 'Invalid probe request.',
    );
  }

  const result = await getProbeDivisionFilterOptions(
    'Division',
    undefined,
    options,
  );
  return applyProbeHeaders(
    NextResponse.json(result.data),
    result.meta,
    startedAt,
  );
}
