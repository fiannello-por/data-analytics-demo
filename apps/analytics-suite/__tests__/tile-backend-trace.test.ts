import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  SemanticQueryRequest,
  SemanticQueryResult,
} from '@por/semantic-runtime';

const ENV_KEYS = [
  'GITHUB_REPO_OWNER',
  'GITHUB_REPO_SLUG',
  'GITHUB_DEFAULT_BRANCH',
  'VERCEL_GIT_REPO_OWNER',
  'VERCEL_GIT_REPO_SLUG',
  'VERCEL_GIT_COMMIT_REF',
  'VERCEL_ENV',
] as const;

const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

const semanticRequest: SemanticQueryRequest = {
  model: 'sales_dashboard_v2_opportunity_base',
  measures: ['bookings_amount'],
  dimensions: ['division'],
};

const semanticResult: SemanticQueryResult = {
  rows: [],
  meta: {
    source: 'lightdash',
    model: 'sales_dashboard_v2_opportunity_base',
    queryCount: 1,
    compiledSql: 'select 1',
    compileDurationMs: 12,
    executionDurationMs: 34,
  },
};

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key];
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
});

describe('tile backend trace GitHub model links', () => {
  it('builds a GitHub blob URL from explicit repo env vars', async () => {
    process.env.GITHUB_REPO_OWNER = 'fiannello-por';
    process.env.GITHUB_REPO_SLUG = 'data-analytics-demo';
    process.env.GITHUB_DEFAULT_BRANCH = 'main';
    delete process.env.VERCEL_GIT_REPO_OWNER;
    delete process.env.VERCEL_GIT_REPO_SLUG;
    delete process.env.VERCEL_GIT_COMMIT_REF;
    delete process.env.VERCEL_ENV;

    const { buildTileBackendTrace } =
      await import('@/lib/server/v2/tile-backend-trace');

    const trace = await buildTileBackendTrace({
      kind: 'single',
      includes: ['Bookings $'],
      executions: [
        {
          label: 'Current window',
          semanticRequest,
          result: semanticResult,
        },
      ],
    });

    expect(trace.githubModelUrl).toBe(
      'https://github.com/fiannello-por/data-analytics-demo/blob/main/semantic/lightdash/models/sales_dashboard_v2_opportunity_base.yml',
    );
  });
});
