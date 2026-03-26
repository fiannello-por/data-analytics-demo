import { NextRequest, NextResponse } from 'next/server';
import { isGlobalFilterKey } from '@/lib/dashboard/filter-config';
import {
  applyProbeHeaders,
  getProbeExecutionOptionsFromRequest,
} from '@/lib/server/probe-http';
import { getDashboardV2FilterDictionary } from '@/lib/server/v2/get-dashboard-filter-dictionary';

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const startedAt = performance.now();
  const { key } = await params;

  if (!isGlobalFilterKey(key)) {
    return badRequest(`Unsupported dashboard filter dictionary key: ${key}.`);
  }

  let execution;
  try {
    execution = getProbeExecutionOptionsFromRequest(request);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : 'Invalid dashboard request.',
    );
  }
  const result = await getDashboardV2FilterDictionary(key, undefined, execution);
  const response = NextResponse.json(result.data);

  return applyProbeHeaders(response, result.meta, startedAt);
}
