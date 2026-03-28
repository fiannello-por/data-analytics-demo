// apps/challenger/lib/cache-mode.ts

export type ProbeCacheMode = 'auto' | 'off';

export function parseCacheMode(
  value: string | null | undefined,
): ProbeCacheMode {
  if (value === 'off') return 'off';
  return 'auto';
}