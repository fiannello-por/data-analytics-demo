import { getValidatedDateRangeMode } from '@/lib/bigquery/sql';
import { FILTER_KEYS, type ScorecardFilters } from '@/lib/contracts';
import { parseFilterParams } from '@/lib/filters';

export type ReportRequestSearchParams = Record<
  string,
  string | string[] | undefined
>;

export class ReportRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportRequestError';
  }
}

const SUPPORTED_QUERY_KEYS = new Set(FILTER_KEYS);

export function collectReportRequestSearchParams(
  searchParams: URLSearchParams,
): ReportRequestSearchParams {
  const collected: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    const current = collected[key];

    if (current === undefined) {
      collected[key] = value;
      continue;
    }

    collected[key] = Array.isArray(current)
      ? [...current, value]
      : [current, value];
  }

  return collected;
}

function flattenSearchParams(searchParams: ReportRequestSearchParams) {
  const flattened: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      if (SUPPORTED_QUERY_KEYS.has(key as (typeof FILTER_KEYS)[number])) {
        if (value.length > 1) {
          throw new ReportRequestError(
            `Repeated query parameter "${key}" is not supported.`,
          );
        }
        flattened[key] = value[0];
        continue;
      }

      flattened[key] = value[0];
      continue;
    }

    flattened[key] = value;
  }

  return flattened;
}

export function parseReportRequestFilters(
  searchParams: ReportRequestSearchParams,
): ScorecardFilters {
  const filters = parseFilterParams(flattenSearchParams(searchParams));
  try {
    getValidatedDateRangeMode(filters);
  } catch (error) {
    if (error instanceof Error) {
      throw new ReportRequestError(error.message);
    }
    throw error;
  }

  return filters;
}
