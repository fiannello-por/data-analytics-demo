import type { ScorecardFilters, ScorecardReportPayload } from '@/lib/contracts';

export type AdapterMeta = {
  source: 'bigquery' | 'lightdash';
  queryCount: number;
  bytesProcessed?: number;
};

export type AdapterResult<T> = {
  data: T;
  meta: AdapterMeta;
};

export type FilterDictionaryPayload = {
  key: string;
  refreshedAt: string;
  options: {
    value: string;
    label: string;
    sortOrder: number;
  }[];
};

export interface ScorecardDataAdapter {
  getScorecardReport(
    filters: ScorecardFilters,
  ): Promise<AdapterResult<ScorecardReportPayload>>;
  getFilterDictionary(
    key: string,
  ): Promise<AdapterResult<FilterDictionaryPayload>>;
}
