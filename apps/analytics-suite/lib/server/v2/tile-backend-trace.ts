import { execFileSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stringify, parse } from 'yaml';
import type {
  SemanticFilter,
  SemanticQueryRequest,
  SemanticQueryResult,
} from '@por/semantic-runtime';
import type {
  TileBackendExecution,
  TileBackendTrace,
} from '@/lib/dashboard/contracts';

type LightdashDimension = {
  name: string;
  type?: string;
  sql?: string;
  label?: string;
  description?: string;
  time_intervals?: string[];
  hidden?: boolean;
  primary_key?: boolean;
};

type LightdashMetric = {
  type?: string;
  sql?: string;
  label?: string;
  format?: string;
  round?: number;
  description?: string;
};

type LightdashModelFile = {
  type?: string;
  name: string;
  label?: string;
  group_label?: string;
  sql_from?: string;
  dimensions?: LightdashDimension[];
  metrics?: Record<string, LightdashMetric>;
};

type LightdashModelSource = {
  fileName: string;
  model: LightdashModelFile;
};

type BackendTraceExecutionInput = {
  label: string;
  semanticRequest: SemanticQueryRequest;
  result: SemanticQueryResult;
};

const TIME_SUFFIXES = ['_day', '_week', '_month', '_quarter', '_year'] as const;

type LightdashMetricFilterRule = {
  id: string;
  target: { fieldId: string };
  operator: string;
  values?: Array<string | number | boolean | null>;
};

let cachedModelsPromise: Promise<Map<string, LightdashModelSource>> | null =
  null;
let cachedGithubContext:
  | {
      owner: string;
      repo: string;
      branch: string;
    }
  | null
  | undefined;

function getLightdashSqlRunnerUrl(): string | undefined {
  const baseUrl = process.env.LIGHTDASH_URL?.replace(/\/+$/, '');
  const projectUuid = process.env.LIGHTDASH_PROJECT_UUID;

  if (!baseUrl || !projectUuid) {
    return undefined;
  }

  return `${baseUrl}/projects/${projectUuid}/sqlRunner`;
}

function getLightdashProjectBaseUrl(): string | undefined {
  const baseUrl = process.env.LIGHTDASH_URL?.replace(/\/+$/, '');
  const projectUuid = process.env.LIGHTDASH_PROJECT_UUID;

  if (!baseUrl || !projectUuid) {
    return undefined;
  }

  return `${baseUrl}/projects/${projectUuid}`;
}

function getLightdashModelsDir() {
  const candidates = [
    path.resolve(process.cwd(), 'semantic/lightdash/models'),
    path.resolve(process.cwd(), '../../semantic/lightdash/models'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = fsSync.statSync(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {}
  }

  throw new Error(
    'Unable to locate semantic/lightdash/models directory from analytics-suite.',
  );
}

function getWorkspaceRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(process.cwd(), '../../..'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = fsSync.statSync(path.join(candidate, 'pnpm-workspace.yaml'));
      if (stat.isFile()) {
        return candidate;
      }
    } catch {}
  }

  return process.cwd();
}

async function loadLightdashModels(): Promise<
  Map<string, LightdashModelSource>
> {
  if (!cachedModelsPromise) {
    cachedModelsPromise = (async () => {
      const modelsDir = getLightdashModelsDir();
      const files = await fs.readdir(modelsDir);
      const entries = await Promise.all(
        files
          .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
          .map(async (file) => {
            const content = await fs.readFile(
              path.join(modelsDir, file),
              'utf8',
            );
            const parsed = parse(content) as LightdashModelFile;
            return [parsed.name, { fileName: file, model: parsed }] as const;
          }),
      );

      return new Map(entries);
    })();
  }

  return cachedModelsPromise;
}

function readGitCommand(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: getWorkspaceRoot(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

function branchExistsOnOrigin(branch: string) {
  const result = readGitCommand(['ls-remote', '--heads', 'origin', branch]);
  return Boolean(result);
}

function parseGithubRemote(remoteUrl: string | undefined) {
  if (!remoteUrl) {
    return undefined;
  }

  const httpsMatch = remoteUrl.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
  );
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  const sshMatch = remoteUrl.match(/github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return undefined;
}

function resolveGithubBranch() {
  const vercelEnv = process.env.VERCEL_ENV;
  const defaultBranch = process.env.GITHUB_DEFAULT_BRANCH || 'main';

  if (vercelEnv === 'production') {
    return defaultBranch;
  }

  if (vercelEnv === 'preview' && process.env.VERCEL_GIT_COMMIT_REF) {
    return process.env.VERCEL_GIT_COMMIT_REF;
  }

  const localBranch = readGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!localBranch || localBranch === 'HEAD') {
    return defaultBranch;
  }

  if (!branchExistsOnOrigin(localBranch)) {
    return defaultBranch;
  }

  return localBranch;
}

function getGithubContext() {
  const vercelEnv = process.env.VERCEL_ENV;
  const canUsePersistentCache =
    vercelEnv === 'production' || vercelEnv === 'preview';

  if (!canUsePersistentCache) {
    cachedGithubContext = undefined;
  }

  if (cachedGithubContext !== undefined) {
    return cachedGithubContext;
  }

  const explicitOwner = process.env.GITHUB_REPO_OWNER;
  const explicitRepo = process.env.GITHUB_REPO_SLUG;
  const explicitBranch =
    process.env.GITHUB_REPO_BRANCH ?? process.env.GITHUB_DEFAULT_BRANCH;

  if (explicitOwner && explicitRepo) {
    cachedGithubContext = {
      owner: explicitOwner,
      repo: explicitRepo,
      branch: explicitBranch ?? resolveGithubBranch(),
    };
    return cachedGithubContext;
  }

  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;

  if (owner && repo) {
    cachedGithubContext = {
      owner,
      repo,
      branch: resolveGithubBranch(),
    };
    return cachedGithubContext;
  }

  const remote = readGitCommand(['config', '--get', 'remote.origin.url']);
  const parsedRemote = parseGithubRemote(remote);

  if (!parsedRemote) {
    cachedGithubContext = null;
    return cachedGithubContext;
  }

  cachedGithubContext = {
    ...parsedRemote,
    branch: resolveGithubBranch(),
  };

  return cachedGithubContext;
}

function buildGithubModelUrl(fileName: string) {
  const context = getGithubContext();
  if (!context) {
    return undefined;
  }

  return `https://github.com/${context.owner}/${context.repo}/blob/${context.branch}/semantic/lightdash/models/${fileName}`;
}

function normalizeFieldName(field: string): string {
  for (const suffix of TIME_SUFFIXES) {
    if (field.endsWith(suffix)) {
      return field.slice(0, -suffix.length);
    }
  }

  return field;
}

function buildFieldId(model: string, field: string) {
  return `${model}_${field}`;
}

function filterToLightdashRule(
  model: string,
  filter: SemanticFilter,
  index: number,
): LightdashMetricFilterRule {
  const operator =
    filter.operator === 'between' ? 'inBetween' : filter.operator;

  return {
    id: `f${index}`,
    target: { fieldId: buildFieldId(model, filter.field) },
    operator,
    values: filter.values,
  };
}

function buildMetricQuery(request: SemanticQueryRequest) {
  return {
    exploreName: request.model,
    dimensions: (request.dimensions ?? []).map((field) =>
      buildFieldId(request.model, field),
    ),
    metrics: (request.measures ?? []).map((field) =>
      buildFieldId(request.model, field),
    ),
    filters: {
      dimensions: {
        id: 'root',
        and: (request.filters ?? []).map((filter, index) =>
          filterToLightdashRule(request.model, filter, index),
        ),
      },
    },
    sorts: (request.sorts ?? []).map((sort) => ({
      fieldId: buildFieldId(request.model, sort.field),
      descending: sort.descending,
    })),
    limit: request.limit ?? 500,
    tableCalculations: [],
  };
}

function buildChartConfig(request: SemanticQueryRequest) {
  const firstDimension = request.dimensions?.[0];
  const firstMeasure = request.measures?.[0];

  if (firstDimension && firstMeasure) {
    return {
      type: 'cartesian',
      config: {
        layout: {},
        eChartsConfig: {},
      },
    };
  }

  return {
    type: 'table',
    config: {
      hideRowNumbers: false,
      showTableNames: true,
      showColumnCalculation: false,
      conditionalFormattings: [],
      columns: {},
    },
  };
}

function buildExploreUrl(request: SemanticQueryRequest): string | undefined {
  const projectBaseUrl = getLightdashProjectBaseUrl();
  if (!projectBaseUrl) {
    return undefined;
  }

  const createSavedChartVersion = {
    tableName: request.model,
    metricQuery: buildMetricQuery(request),
    chartConfig: buildChartConfig(request),
    tableConfig: {
      columnOrder: [
        ...(request.dimensions ?? []).map((field) =>
          buildFieldId(request.model, field),
        ),
        ...(request.measures ?? []).map((field) =>
          buildFieldId(request.model, field),
        ),
      ],
    },
  };

  const params = new URLSearchParams({
    create_saved_chart_version: JSON.stringify(createSavedChartVersion),
    isExploreFromHere: 'true',
  });

  return `${projectBaseUrl}/tables/${request.model}?${params.toString()}`;
}

function collectDimensionNames(requests: SemanticQueryRequest[]) {
  const names = new Set<string>();

  for (const request of requests) {
    for (const dimension of request.dimensions ?? []) {
      names.add(normalizeFieldName(dimension));
    }
    for (const filter of request.filters ?? []) {
      names.add(normalizeFieldName(filter.field));
    }
    for (const sort of request.sorts ?? []) {
      names.add(normalizeFieldName(sort.field));
    }
  }

  return [...names];
}

function collectMeasureNames(requests: SemanticQueryRequest[]) {
  const names = new Set<string>();

  for (const request of requests) {
    for (const measure of request.measures ?? []) {
      names.add(measure);
    }
  }

  return [...names];
}

export async function buildSemanticYamlSnippet(
  request: SemanticQueryRequest,
): Promise<string> {
  return buildCombinedSemanticYamlSnippet([request]);
}

export async function resolveSemanticDimensionLabel(
  modelName: string,
  dimensionName: string,
): Promise<string | undefined> {
  const models = await loadLightdashModels();
  const modelSource = models.get(modelName);

  if (!modelSource) {
    return undefined;
  }

  return modelSource.model.dimensions?.find(
    (dimension) => dimension.name === dimensionName,
  )?.label;
}

export async function buildCombinedSemanticYamlSnippet(
  requests: SemanticQueryRequest[],
): Promise<string> {
  const [primaryRequest] = requests;
  if (!primaryRequest) {
    throw new Error(
      'Cannot build semantic YAML snippet without a semantic request.',
    );
  }

  const models = await loadLightdashModels();
  const modelSource = models.get(primaryRequest.model);

  if (!modelSource) {
    throw new Error(
      `Unable to find Lightdash model source for "${primaryRequest.model}".`,
    );
  }
  const { model } = modelSource;

  const dimensionNames = collectDimensionNames(requests);
  const measureNames = collectMeasureNames(requests);
  const dimensions = (model.dimensions ?? []).filter((dimension) =>
    dimensionNames.includes(dimension.name),
  );
  const metrics = Object.fromEntries(
    measureNames
      .map((name) => [name, model.metrics?.[name]] as const)
      .filter((entry): entry is [string, LightdashMetric] => Boolean(entry[1])),
  );

  const snippet = {
    type: model.type,
    name: model.name,
    label: model.label,
    group_label: model.group_label,
    sql_from: model.sql_from,
    dimensions,
    ...(Object.keys(metrics).length > 0 ? { metrics } : {}),
  };

  return stringify(snippet, {
    indent: 2,
    lineWidth: 0,
  }).trim();
}

function resolveCacheStatus(
  executions: BackendTraceExecutionInput[],
): TileBackendTrace['cacheStatus'] {
  const statuses = executions
    .map((execution) => execution.result.meta.cacheStatus)
    .filter((status): status is 'hit' | 'miss' => Boolean(status));

  if (statuses.length === 0) {
    return undefined;
  }

  return statuses.every((status) => status === 'hit') ? 'hit' : 'miss';
}

export async function buildTileBackendTrace({
  kind,
  includes,
  executions,
}: {
  kind: TileBackendTrace['kind'];
  includes: string[];
  executions: BackendTraceExecutionInput[];
}): Promise<TileBackendTrace> {
  const [primary] = executions;
  if (!primary) {
    throw new Error(
      'Cannot build tile backend trace without at least one execution.',
    );
  }

  const semanticYamlSnippet = await buildCombinedSemanticYamlSnippet(
    executions.map((execution) => execution.semanticRequest),
  );
  const models = await loadLightdashModels();
  const modelSource = models.get(primary.semanticRequest.model);

  return {
    kind,
    model: primary.semanticRequest.model,
    includes,
    compiledAt: new Date().toISOString(),
    cacheStatus: resolveCacheStatus(executions),
    sqlRunnerUrl: getLightdashSqlRunnerUrl(),
    githubModelUrl: modelSource
      ? buildGithubModelUrl(modelSource.fileName)
      : undefined,
    semanticYamlSnippet,
    executions: executions.map(
      (execution): TileBackendExecution => ({
        label: execution.label,
        semanticRequest: execution.semanticRequest,
        compiledSql: execution.result.meta.compiledSql,
        exploreUrl: buildExploreUrl(execution.semanticRequest),
      }),
    ),
  };
}
