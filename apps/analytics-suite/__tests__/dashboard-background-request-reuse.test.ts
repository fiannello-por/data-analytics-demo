import { describe, expect, it } from 'vitest';

import { shouldReuseBackgroundWarmupRequest } from '@/components/dashboard/dashboard-shell';

describe('background warmup request reuse', () => {
  it('reuses an in-flight request when the task and query key still match', () => {
    expect(
      shouldReuseBackgroundWarmupRequest({
        currentTaskKey: 'snapshot:Expansion',
        currentQueryKey: '{"startDate":"2026-01-01"}',
        nextTask: {
          kind: 'snapshot',
          category: 'Expansion',
        },
        nextQueryKey: '{"startDate":"2026-01-01"}',
      }),
    ).toBe(true);
  });

  it('restarts warmup when the next task changes', () => {
    expect(
      shouldReuseBackgroundWarmupRequest({
        currentTaskKey: 'snapshot:Expansion',
        currentQueryKey: '{"startDate":"2026-01-01"}',
        nextTask: {
          kind: 'snapshot',
          category: 'Migration',
        },
        nextQueryKey: '{"startDate":"2026-01-01"}',
      }),
    ).toBe(false);
  });

  it('restarts warmup when the query key changes', () => {
    expect(
      shouldReuseBackgroundWarmupRequest({
        currentTaskKey: 'dictionary:Division',
        currentQueryKey: '{"startDate":"2026-01-01"}',
        nextTask: {
          kind: 'dictionary',
          key: 'Division',
        },
        nextQueryKey: '{"startDate":"2026-04-01"}',
      }),
    ).toBe(false);
  });

  it('does not reuse when there is no active request to reuse', () => {
    expect(
      shouldReuseBackgroundWarmupRequest({
        currentTaskKey: null,
        currentQueryKey: null,
        nextTask: {
          kind: 'closedWon',
          category: 'Renewal',
        },
        nextQueryKey: '{"startDate":"2026-01-01"}',
      }),
    ).toBe(false);
  });
});
