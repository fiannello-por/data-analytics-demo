export const PROBE_CACHE_MODES = ['auto', 'off'] as const;

export type ProbeCacheMode = (typeof PROBE_CACHE_MODES)[number];

export type ProbeExecutionOptions = {
  cacheMode?: ProbeCacheMode;
};

export function normalizeProbeExecutionOptions(
  options: ProbeExecutionOptions = {},
): { cacheMode: ProbeCacheMode } {
  return {
    cacheMode: options.cacheMode ?? 'auto',
  };
}

export function parseProbeCacheMode(
  value: string | null | undefined,
): ProbeCacheMode {
  if (value == null || value === '') {
    return 'auto';
  }

  if (
    PROBE_CACHE_MODES.includes(value as ProbeCacheMode)
  ) {
    return value as ProbeCacheMode;
  }

  throw new Error(`Unsupported probe cache mode: ${value}.`);
}

export function shouldUseBigQueryQueryCache(
  cacheMode: ProbeCacheMode,
): boolean {
  return cacheMode !== 'off';
}
