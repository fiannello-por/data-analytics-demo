import 'server-only';

import {
  createLightdashProvider,
  createSemanticRuntime,
  type QueryExecutionResult,
  type SemanticQueryResult,
} from '@por/analytics-adapter';
import { getBigQueryClient } from '@/lib/bigquery/client';
import { getSituationRoomEnv } from '@/lib/env.server';
import {
  normalizeProbeExecutionOptions,
  shouldUseBigQueryQueryCache,
  type ProbeExecutionOptions,
} from '@/lib/probe-cache-mode';

type LightdashEnv = {
  url: string;
  projectUuid: string;
  apiKey: string;
};

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.local.example.`,
    );
  }
  return value;
}

function getLightdashEnv(): LightdashEnv {
  return {
    url: must('LIGHTDASH_URL'),
    projectUuid: must('LIGHTDASH_PROJECT_UUID'),
    apiKey: must('LIGHTDASH_API_KEY'),
  };
}

let cachedRuntime: ReturnType<typeof createSemanticRuntime> | null = null;

function createDefaultRuntime() {
  const lightdashEnv = getLightdashEnv();
  const provider = createLightdashProvider({
    baseUrl: lightdashEnv.url,
    projectUuid: lightdashEnv.projectUuid,
    apiKey: lightdashEnv.apiKey,
  });

  return createSemanticRuntime({
    provider,
    executeQuery: async ({ sql }) => {
      const env = getSituationRoomEnv();
      const bigquery = getBigQueryClient();
      const [job] = await bigquery.createQueryJob({
        query: sql,
        location: env.location,
        useQueryCache: true,
      });
      const [rows] = await job.getQueryResults();
      const [metadata] = await job.getMetadata();

      return {
        rows: rows as Record<string, unknown>[],
        bytesProcessed: Number(
          metadata.statistics?.query?.totalBytesProcessed ?? 0,
        ),
      } satisfies QueryExecutionResult;
    },
  });
}

export function getDashboardV2Runtime() {
  if (!cachedRuntime) {
    cachedRuntime = createDefaultRuntime();
  }

  return cachedRuntime;
}

export type DashboardV2Runtime = {
  runQuery: (request: Parameters<ReturnType<typeof createSemanticRuntime>['runQuery']>[0]) => Promise<SemanticQueryResult>;
};

export function normalizeDashboardV2ExecutionOptions(
  options: ProbeExecutionOptions = {},
) {
  return normalizeProbeExecutionOptions(options);
}

export function shouldBypassDashboardV2Cache(
  options: ProbeExecutionOptions = {},
): boolean {
  return !shouldUseBigQueryQueryCache(normalizeDashboardV2ExecutionOptions(options).cacheMode);
}
