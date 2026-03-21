import 'server-only';

import { BigQuery } from '@google-cloud/bigquery';
import { getSituationRoomEnv } from '@/lib/env.server';

let cachedClient: BigQuery | null = null;

function parseServiceAccountJson(serviceAccountJson: string) {
  try {
    return JSON.parse(serviceAccountJson) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Invalid BIGQUERY_SERVICE_ACCOUNT_JSON: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

export function getBigQueryClient(): BigQuery {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getSituationRoomEnv();

  cachedClient = new BigQuery({
    projectId: env.projectId,
    credentials: parseServiceAccountJson(env.serviceAccountJson),
    location: env.location,
  });

  return cachedClient;
}
