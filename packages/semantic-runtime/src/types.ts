export type SemanticScalar = string | number | boolean | null;

export type SemanticFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'isTrue'
  | 'isFalse'
  | 'isNull'
  | 'isNotNull';

export type SemanticFilter = {
  field: string;
  operator: SemanticFilterOperator;
  values?: SemanticScalar[];
};

export type SemanticSort = {
  field: string;
  descending: boolean;
};

export type SemanticQueryRequest = {
  model: string;
  measures?: string[];
  dimensions?: string[];
  filters?: SemanticFilter[];
  sorts?: SemanticSort[];
  limit?: number;
  context?: {
    dashboardId?: string;
    surfaceId?: string;
  };
};

export type SemanticCatalogEntry = {
  model: string;
  field: string;
  label: string;
  fieldType: 'metric' | 'dimension';
  description?: string;
};

export type CompiledSemanticQuery = {
  model: string;
  sql: string;
  aliases: Record<string, string>;
};

export type QueryExecutionRequest = {
  sql: string;
};

export type QueryExecutionResult = {
  rows: Record<string, unknown>[];
  bytesProcessed?: number;
};

export type SemanticFieldValue = {
  raw: unknown;
  formatted: string;
};

export type SemanticRow = Record<string, SemanticFieldValue>;

export type SemanticExecutionMeta = {
  source: 'lightdash';
  model: string;
  queryCount: number;
  compiledSql: string;
  compileDurationMs: number;
  executionDurationMs: number;
  bytesProcessed?: number;
  dashboardId?: string;
  surfaceId?: string;
  semanticVersion?: string;
  cacheStatus?: 'hit' | 'miss';
  budgetStatus?: 'healthy' | 'warning' | 'degrade';
};

export type SemanticQueryResult = {
  rows: SemanticRow[];
  meta: SemanticExecutionMeta;
};

export type CatalogRequest = {
  model: string;
};

export interface SemanticProvider {
  compileQuery(request: SemanticQueryRequest): Promise<CompiledSemanticQuery>;
  getCatalogEntries?(request: CatalogRequest): Promise<SemanticCatalogEntry[]>;
}

export type SemanticQueryExecutor = (
  query: QueryExecutionRequest,
) => Promise<QueryExecutionResult>;
