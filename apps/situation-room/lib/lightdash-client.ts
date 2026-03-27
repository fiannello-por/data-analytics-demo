import 'server-only';
import type { LightdashFilterRule } from './types';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value)
    throw new Error(
      `Missing required environment variable: ${key}. See .env.local.example.`,
    );
  return value;
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `ApiKey ${getEnv('LIGHTDASH_API_KEY')}`,
  };
}

export async function executeScorecardQuery(filterGroup: {
  id: string;
  and: LightdashFilterRule[];
}): Promise<string> {
  const url = getEnv('LIGHTDASH_URL');
  const projectUuid = getEnv('LIGHTDASH_PROJECT_UUID');

  const body = {
    query: {
      exploreName: 'scorecard_daily',
      dimensions: ['scorecard_daily_sort_order', 'scorecard_daily_metric_name'],
      metrics: [
        'scorecard_daily_current_period',
        'scorecard_daily_previous_period',
        'scorecard_daily_pct_change',
      ],
      filters: { dimensions: filterGroup },
      tableCalculations: [],
      sorts: [{ fieldId: 'scorecard_daily_sort_order', descending: false }],
      limit: 50,
    },
    context: 'api',
  };

  const res = await fetch(
    `${url}/api/v2/projects/${projectUuid}/query/metric-query`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    },
  );

  if (!res.ok)
    throw new Error(
      `Lightdash query failed: ${res.status} ${await res.text()}`,
    );

  const data = await res.json();
  return data.results.queryUuid;
}

export async function executeDistinctQuery(fieldId: string): Promise<string> {
  const url = getEnv('LIGHTDASH_URL');
  const projectUuid = getEnv('LIGHTDASH_PROJECT_UUID');

  const body = {
    query: {
      exploreName: 'scorecard_daily',
      dimensions: [fieldId],
      metrics: [],
      tableCalculations: [],
      filters: {},
      sorts: [{ fieldId, descending: false }],
      limit: 500,
    },
    context: 'api',
  };

  const res = await fetch(
    `${url}/api/v2/projects/${projectUuid}/query/metric-query`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    },
  );

  if (!res.ok)
    throw new Error(
      `Lightdash distinct query failed: ${res.status} ${await res.text()}`,
    );

  const data = await res.json();
  return data.results.queryUuid;
}

export async function pollResults(
  queryUuid: string,
  maxAttempts = 30,
  delayMs = 1000,
): Promise<Record<string, { value: { raw: unknown; formatted: string } }>[]> {
  const url = getEnv('LIGHTDASH_URL');
  const projectUuid = getEnv('LIGHTDASH_PROJECT_UUID');

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${url}/api/v2/projects/${projectUuid}/query/${queryUuid}?page=1&pageSize=500`,
      { headers: headers() },
    );

    if (!res.ok) throw new Error(`Lightdash poll failed: ${res.status}`);

    const data = await res.json();
    const results = data.results;

    if (results.status === 'ready') return results.rows;
    if (results.status === 'error' || results.status === 'expired')
      throw new Error(`Query failed: ${results.error ?? 'unknown error'}`);

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Query timed out after max polling attempts');
}
