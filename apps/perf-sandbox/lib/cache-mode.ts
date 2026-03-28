// apps/perf-sandbox/lib/cache-mode.ts
// Mirrors apps/analytics-suite/lib/probe-cache-mode.ts

export type ProbeCacheMode = 'auto' | 'off';

export function parseCacheMode(value: string | null | undefined): ProbeCacheMode {
  if (value === 'off') return 'off';
  return 'auto';
}
