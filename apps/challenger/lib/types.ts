// apps/challenger/lib/types.ts

export type MetricQueryFilters = {
  dimensions: {
    id: string;
    and: Array<{
      id: string;
      target: { fieldId: string };
      operator: string;
      values?: Array<string | number | boolean | null>;
    }>;
  };
};

export type MetricQuerySort = {
  fieldId: string;
  descending: boolean;
};

export type MetricQueryRequest = {
  exploreName: string;
  metrics: string[];
  dimensions: string[];
  filters: MetricQueryFilters;
  sorts: MetricQuerySort[];
  limit: number;
  tableCalculations: [];
};

export type ExecuteMetricQueryPayload = {
  query: MetricQueryRequest;
  context: string;
};

export type SubmitResponse = {
  status: 'ok';
  results: {
    queryUuid: string;
    cacheMetadata: { cacheHit: boolean };
    fields: Record<string, unknown>;
    metricQuery: unknown;
  };
};

export type ResultFieldValue = {
  value: {
    raw: unknown;
    formatted: string;
  };
};

export type ResultRow = Record<string, ResultFieldValue>;

export type QueryResultPage = {
  queryUuid: string;
  status: 'ready' | 'pending' | 'queued' | 'executing' | 'error' | 'expired';
  rows: ResultRow[];
  columns: Record<string, { type: string }>;
  totalResults: number;
  page: number;
  pageSize: number;
  totalPageCount: number;
  initialQueryExecutionMs?: number;
  resultsPageExecutionMs?: number;
  error?: string;
};

export type PollResponse = {
  status: 'ok';
  results: QueryResultPage;
};

export type CategoryResult = {
  category: string;
  current: QueryResultPage;
  previous: QueryResultPage;
};

export type DictionaryResult = {
  key: string;
  options: string[];
};