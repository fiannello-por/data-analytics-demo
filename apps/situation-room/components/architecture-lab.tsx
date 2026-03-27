'use client';

import * as React from 'react';
import { CircleAlertIcon, PlayIcon } from 'lucide-react';
import {
  BENCHMARKABLE_PROBE_IDS,
  BENCHMARK_ITERATIONS,
  BENCHMARK_NOTES,
  LAB_BACKENDS,
  LAB_CACHE_MODES,
  LAB_PROBES,
  LAB_TABS,
  TIMING_BREAKDOWN,
  getArchitectureSteps,
  type LabBackendId,
  type LabProbe,
  type LabProbeId,
} from '@/lib/analytics-lab';
import type { ProbeCacheMode } from '@/lib/probe-cache-mode';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ProbeState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  statusCode?: number;
  durationMs?: number | null;
  serverMs?: number | null;
  bodyBytes?: number | null;
  source?: string | null;
  cacheMode?: ProbeCacheMode | null;
  queryCount?: number | null;
  bytesProcessed?: number | null;
  tileTimings?: Array<{ tileId: string; durationMs: number }>;
  loadedAt?: string;
  samples: Array<{ label: string; value: string }>;
  preview?: string;
  error?: string;
};

type BenchmarkRow = {
  probeId: LabProbeId;
  coldMs: number | null;
  warmP50Ms: number | null;
  warmP95Ms: number | null;
  avgBytesProcessed: number | null;
  source: string | null;
  cacheMode: ProbeCacheMode | null;
  status: 'ready' | 'error';
  error?: string;
};

type BenchmarkState = {
  status: 'idle' | 'running' | 'ready' | 'error';
  cacheMode: ProbeCacheMode;
  generatedAt?: string;
  results: BenchmarkRow[];
  error?: string;
};

function createIdleState(): ProbeState {
  return {
    status: 'idle',
    samples: [],
  };
}

function extractSamples(
  value: unknown,
  prefix = '',
): Array<{ label: string; value: string }> {
  if (value == null) {
    return [];
  }

  if (typeof value === 'number') {
    return [{ label: prefix || 'value', value: String(value) }];
  }

  if (typeof value === 'boolean' || typeof value === 'string') {
    return [];
  }

  if (Array.isArray(value)) {
    const samples = [
      {
        label: prefix ? `${prefix}.length` : 'length',
        value: String(value.length),
      },
    ];

    for (
      let index = 0;
      index < value.length && samples.length < 2;
      index += 1
    ) {
      samples.push(
        ...extractSamples(value[index], `${prefix}[${index}]`).slice(
          0,
          2 - samples.length,
        ),
      );
    }

    return samples.slice(0, 2);
  }

  if (typeof value === 'object') {
    const samples: Array<{ label: string; value: string }> = [];

    for (const [key, child] of Object.entries(value)) {
      if (samples.length >= 2) {
        break;
      }

      if (typeof child === 'number') {
        samples.push({
          label: prefix ? `${prefix}.${key}` : key,
          value: String(child),
        });
        continue;
      }

      if (Array.isArray(child)) {
        samples.push({
          label: prefix ? `${prefix}.${key}.length` : `${key}.length`,
          value: String(child.length),
        });
        continue;
      }

      samples.push(...extractSamples(child, prefix ? `${prefix}.${key}` : key));
    }

    return samples.slice(0, 2);
  }

  return [];
}

function formatDuration(durationMs?: number) {
  return durationMs == null ? '—' : `${durationMs} ms`;
}

function formatBytes(bodyBytes?: number) {
  return bodyBytes == null ? '—' : `${bodyBytes} bytes`;
}

function formatServerDuration(durationMs?: number | null) {
  return durationMs == null ? '—' : `${durationMs} ms`;
}

function roundMs(value: number | null) {
  if (value == null) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );

  return sorted[index] ?? null;
}

function parseNumericHeader(value: string | null): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalJsonArray<T>(value: string | null): T[] | null {
  if (value == null) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function formatPreview(value: unknown) {
  if (value == null) {
    return 'No response body.';
  }

  if (typeof value === 'string') {
    return value.slice(0, 1200);
  }

  const formatted = JSON.stringify(value, null, 2);
  return formatted.length > 1200 ? `${formatted.slice(0, 1200)}…` : formatted;
}

function formatRelativeTimestamp(value?: string) {
  if (!value) {
    return 'Not run yet';
  }

  return new Date(value).toLocaleString();
}

function formatMaybeBytes(value: number | null | undefined) {
  return value == null ? '—' : `${value} bytes`;
}

function formatQueryCount(value: number | null | undefined) {
  return value == null ? '—' : String(value);
}

function formatCacheMode(value: ProbeCacheMode | null | undefined) {
  if (value == null) {
    return '—';
  }

  return value === 'off' ? 'Off' : 'Auto';
}

function buildProbeUrl(endpoint: string, cacheMode: ProbeCacheMode) {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set('cache', cacheMode);

  return `${url.pathname}${url.search}`;
}

function getStatusBadgeVariant(status: ProbeState['status']) {
  if (status === 'error') {
    return 'destructive' as const;
  }

  if (status === 'ready') {
    return 'secondary' as const;
  }

  return 'outline' as const;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-text-primary">{value}</div>
    </div>
  );
}

async function executeProbeRequest(
  probe: LabProbe,
  cacheMode: ProbeCacheMode,
): Promise<ProbeState> {
  const startedAt = performance.now();

  try {
    const response = await fetch(buildProbeUrl(probe.endpoint, cacheMode), {
      headers: {
        accept: 'application/json',
      },
      cache: 'no-store',
    });
    const bodyText = await response.text();
    const parsed = (() => {
      try {
        return JSON.parse(bodyText) as unknown;
      } catch {
        return bodyText;
      }
    })();
    const endedAt = performance.now();
    const bodyBytes = new TextEncoder().encode(bodyText).length;

    return {
      status: response.ok ? 'ready' : 'error',
      statusCode: response.status,
      durationMs: roundMs(endedAt - startedAt),
      serverMs: parseNumericHeader(
        response.headers.get('x-situation-room-server-ms'),
      ),
      bodyBytes,
      source: response.headers.get('x-situation-room-source'),
      cacheMode:
        (response.headers.get(
          'x-situation-room-cache-mode',
        ) as ProbeCacheMode | null) ?? cacheMode,
      queryCount: parseNumericHeader(
        response.headers.get('x-situation-room-query-count'),
      ),
      bytesProcessed: parseNumericHeader(
        response.headers.get('x-situation-room-bytes-processed'),
      ),
      tileTimings:
        parseOptionalJsonArray<{ tileId: string; durationMs: number }>(
          response.headers.get('x-situation-room-tile-timings'),
        ) ?? undefined,
      loadedAt: new Date().toISOString(),
      samples: extractSamples(parsed).slice(0, 2),
      preview: formatPreview(parsed),
      error: response.ok ? undefined : `Request failed with ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'error',
      durationMs: roundMs(performance.now() - startedAt),
      loadedAt: new Date().toISOString(),
      samples: [],
      cacheMode,
      error: error instanceof Error ? error.message : 'Unable to load probe.',
      preview: undefined,
    };
  }
}

function ProbeCard({
  probe,
  state,
  onLoad,
}: {
  probe: LabProbe;
  state: ProbeState;
  onLoad: () => Promise<void>;
}) {
  const isBusy = state.status === 'loading';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{probe.label}</CardTitle>
              <Badge variant="outline">{probe.endpoint}</Badge>
              <Badge variant="outline">{probe.queryFamily}</Badge>
            </div>
            <CardDescription>{probe.purpose}</CardDescription>
          </div>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoad}
              disabled={isBusy}
            >
              <PlayIcon data-icon="inline-start" />
              {isBusy ? 'Loading…' : 'Run probe'}
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{probe.note}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Status"
            value={
              state.status === 'ready'
                ? `Ready · ${state.statusCode ?? '—'}`
                : state.status === 'loading'
                  ? 'Loading'
                  : state.status === 'error'
                    ? 'Error'
                    : 'Idle'
            }
          />
          <MetricCard
            label="Client duration"
            value={formatDuration(state.durationMs ?? undefined)}
          />
          <MetricCard
            label="Server duration"
            value={formatServerDuration(state.serverMs)}
          />
          <MetricCard
            label="Bytes processed"
            value={formatMaybeBytes(state.bytesProcessed)}
          />
          <MetricCard
            label="Payload size"
            value={formatBytes(state.bodyBytes ?? undefined)}
          />
          <MetricCard label="Source" value={state.source ?? '—'} />
          <MetricCard
            label="Cache mode"
            value={formatCacheMode(state.cacheMode)}
          />
          <MetricCard
            label="Query count"
            value={formatQueryCount(state.queryCount)}
          />
          {state.tileTimings?.length ? (
            <MetricCard
              label="Tile timings"
              value={`${state.tileTimings.length} tiles`}
            />
          ) : null}
          <MetricCard
            label="Loaded at"
            value={formatRelativeTimestamp(state.loadedAt)}
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(state.status)}>
              {state.status}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Numeric samples are extracted from the live response for quick
              sanity checking.
            </p>
          </div>
          {state.tileTimings?.length ? (
            <div className="rounded-xl border border-border-subtle bg-surface/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Tile timing breakdown
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {state.tileTimings.slice(0, 6).map((timing) => (
                  <div
                    key={timing.tileId}
                    className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-text-primary">
                      {timing.tileId}
                    </div>
                    <div className="text-text-secondary">
                      {formatDuration(timing.durationMs)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {state.status === 'loading' ? (
              <>
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </>
            ) : state.samples.length > 0 ? (
              state.samples.map((sample) => (
                <MetricCard
                  key={`${probe.id}:${sample.label}`}
                  label={sample.label}
                  value={sample.value}
                />
              ))
            ) : (
              <Card size="sm" className="md:col-span-2">
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {state.status === 'ready'
                      ? 'This response did not expose numeric fields.'
                      : 'Run the probe to inspect a couple of values.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Response preview</p>
            {state.error ? (
              <Badge variant="destructive">{state.error}</Badge>
            ) : null}
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-5 text-foreground">
            {state.preview ?? 'Run the probe to capture a response preview.'}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

export function ArchitectureLab({ sourceLabel }: { sourceLabel: string }) {
  const [cacheMode, setCacheMode] = React.useState<ProbeCacheMode>('auto');
  const [probeStates, setProbeStates] = React.useState<
    Record<LabProbeId, ProbeState>
  >(
    () =>
      Object.fromEntries(
        LAB_PROBES.map((probe) => [probe.id, createIdleState()]),
      ) as Record<LabProbeId, ProbeState>,
  );
  const [benchmarkState, setBenchmarkState] = React.useState<BenchmarkState>({
    status: 'idle',
    cacheMode: 'auto',
    results: [],
  });

  const activeBackend = LAB_BACKENDS[0];
  const successfulProbeCount = React.useMemo(
    () =>
      Object.values(probeStates).filter((state) => state.status === 'ready')
        .length,
    [probeStates],
  );
  const benchmarkSummary = React.useMemo(() => {
    if (benchmarkState.results.length === 0) {
      return {
        warmP95: null as number | null,
        warmP50Average: null as number | null,
      };
    }

    const warmP95 = percentile(
      benchmarkState.results
        .map((result) => result.warmP95Ms)
        .filter((value): value is number => value != null),
      95,
    );
    const warmP50Values = benchmarkState.results
      .map((result) => result.warmP50Ms)
      .filter((value): value is number => value != null);

    return {
      warmP95,
      warmP50Average:
        warmP50Values.length > 0
          ? roundMs(
              warmP50Values.reduce((sum, value) => sum + value, 0) /
                warmP50Values.length,
            )
          : null,
    };
  }, [benchmarkState.results]);
  const architectureSteps = React.useMemo(
    () => getArchitectureSteps(sourceLabel),
    [sourceLabel],
  );
  const activeCacheMode = React.useMemo(
    () =>
      LAB_CACHE_MODES.find((option) => option.id === cacheMode) ??
      LAB_CACHE_MODES[0],
    [cacheMode],
  );

  async function loadProbe(probe: LabProbe) {
    setProbeStates((current) => ({
      ...current,
      [probe.id]: {
        status: 'loading',
        samples: [],
        cacheMode,
      },
    }));

    const nextState = await executeProbeRequest(probe, cacheMode);
    setProbeStates((current) => ({
      ...current,
      [probe.id]: nextState,
    }));
  }

  async function runBenchmarkSuite() {
    const benchmarkCacheMode = cacheMode;
    setBenchmarkState({
      status: 'running',
      cacheMode: benchmarkCacheMode,
      results: [],
    });

    const nextResults: BenchmarkRow[] = [];

    for (const probeId of BENCHMARKABLE_PROBE_IDS) {
      const probe = LAB_PROBES.find((candidate) => candidate.id === probeId);

      if (!probe) {
        continue;
      }

      const coldResult = await executeProbeRequest(probe, benchmarkCacheMode);

      if (coldResult.status === 'error') {
        nextResults.push({
          probeId,
          coldMs: coldResult.durationMs ?? null,
          warmP50Ms: null,
          warmP95Ms: null,
          avgBytesProcessed: coldResult.bytesProcessed ?? null,
          source: coldResult.source ?? null,
          cacheMode: coldResult.cacheMode ?? benchmarkCacheMode,
          status: 'error',
          error: coldResult.error,
        });
        setProbeStates((current) => ({
          ...current,
          [probeId]: coldResult,
        }));
        continue;
      }

      const warmResults: ProbeState[] = [];
      const bytesProcessedValues: number[] = [];
      let warmError: string | undefined;

      if (coldResult.bytesProcessed != null) {
        bytesProcessedValues.push(coldResult.bytesProcessed);
      }

      for (let index = 0; index < BENCHMARK_ITERATIONS; index += 1) {
        const warmResult = await executeProbeRequest(probe, benchmarkCacheMode);
        warmResults.push(warmResult);

        if (warmResult.status === 'error') {
          warmError ??= warmResult.error ?? 'Warm benchmark request failed.';
          continue;
        }

        if (warmResult.bytesProcessed != null) {
          bytesProcessedValues.push(warmResult.bytesProcessed);
        }
      }

      const durations = warmResults
        .filter((result) => result.status === 'ready')
        .map((result) => result.durationMs)
        .filter((value): value is number => value != null);

      nextResults.push({
        probeId,
        coldMs: coldResult.durationMs ?? null,
        warmP50Ms: warmError ? null : roundMs(percentile(durations, 50)),
        warmP95Ms: warmError ? null : roundMs(percentile(durations, 95)),
        avgBytesProcessed:
          bytesProcessedValues.length > 0
            ? Math.round(
                bytesProcessedValues.reduce((sum, value) => sum + value, 0) /
                  bytesProcessedValues.length,
              )
            : null,
        source: coldResult.source ?? null,
        cacheMode: coldResult.cacheMode ?? benchmarkCacheMode,
        status: warmError ? 'error' : 'ready',
        error: warmError,
      });

      setProbeStates((current) => ({
        ...current,
        [probeId]: warmResults.at(-1) ?? coldResult,
      }));
    }

    setBenchmarkState({
      status: nextResults.some((result) => result.status === 'error')
        ? 'error'
        : 'ready',
      cacheMode: benchmarkCacheMode,
      generatedAt: new Date().toISOString(),
      results: nextResults,
      error: nextResults.find((result) => result.status === 'error')?.error,
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Situation Room</Badge>
            <Badge variant="secondary">Internal tool</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Analytics Lab
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Use the same probe contracts to measure direct BigQuery today and
              semantic-layer adapters later. This page is for internal
              engineering use only and is optimized for clarity, not dashboard
              presentation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              Active backend: {activeBackend.label}
            </Badge>
            <Badge variant="outline">{LAB_PROBES.length} probes</Badge>
            <Badge variant="outline">
              {BENCHMARK_ITERATIONS} warm iterations per benchmark
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                BigQuery query cache
              </span>
              <Select
                value={cacheMode}
                onValueChange={(value) => setCacheMode(value as ProbeCacheMode)}
              >
                <SelectTrigger size="sm" aria-label="BigQuery query cache">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAB_CACHE_MODES.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <Separator />

        <Tabs defaultValue="overview">
          <div className="overflow-x-auto">
            <TabsList variant="line" className="w-full justify-start">
              {LAB_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Active backend</CardTitle>
                  <CardDescription>
                    Current request path under test.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{activeBackend.label}</p>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Registered probes</CardTitle>
                  <CardDescription>
                    The fixed probe catalog keeps comparisons honest.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{LAB_PROBES.length}</p>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Latest benchmark</CardTitle>
                  <CardDescription>
                    Last in-page suite execution.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {formatRelativeTimestamp(benchmarkState.generatedAt)}
                  </p>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>BigQuery query cache</CardTitle>
                  <CardDescription>
                    Current request mode for probes and benchmarks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{activeCacheMode.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeCacheMode.description}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <CircleAlertIcon />
              <AlertTitle>How to interpret the timings</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                {BENCHMARK_NOTES.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Probe catalog</CardTitle>
                <CardDescription>
                  The catalog now covers baseline, aggregate, filter, and
                  dashboard snapshot/trend paths.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Probe</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Benchmark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {LAB_PROBES.map((probe) => (
                      <TableRow key={probe.id}>
                        <TableCell className="font-medium">
                          {probe.label}
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                          {probe.purpose}
                        </TableCell>
                        <TableCell>{probe.endpoint}</TableCell>
                        <TableCell>
                          <Badge
                            variant={probe.benchmark ? 'secondary' : 'outline'}
                          >
                            {probe.benchmark ? 'Included' : 'Excluded'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How to use this lab</CardTitle>
                <CardDescription>
                  The goal is to understand where time is being spent before we
                  add another analytics layer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
                  <li>
                    Start with manual probe runs to inspect one request path at
                    a time.
                  </li>
                  <li>
                    Use the benchmark suite to compare cold and warm behavior
                    over the same probe set.
                  </li>
                  <li>
                    Watch query count and bytes processed before concluding that
                    a backend is fast.
                  </li>
                  <li>
                    Add future adapters behind the same probes instead of
                    redesigning the UI.
                  </li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="probes" className="mt-6 flex flex-col gap-6">
            <Alert>
              <CircleAlertIcon />
              <AlertTitle>Manual probe runs</AlertTitle>
              <AlertDescription>
                Use this tab to inspect one request at a time. The same probe
                contracts are used later by the benchmark suite and by future
                backend adapters.
              </AlertDescription>
            </Alert>
            <div className="grid gap-6">
              {LAB_PROBES.map((probe) => (
                <ProbeCard
                  key={probe.id}
                  probe={probe}
                  state={probeStates[probe.id]}
                  onLoad={() => loadProbe(probe)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="benchmarks" className="mt-6 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex flex-1 flex-col gap-2">
                    <CardTitle>Benchmark suite</CardTitle>
                    <CardDescription>
                      Run the current probe catalog as one cold request plus{' '}
                      {BENCHMARK_ITERATIONS} warm requests per endpoint.
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={runBenchmarkSuite}
                      disabled={benchmarkState.status === 'running'}
                    >
                      <PlayIcon data-icon="inline-start" />
                      {benchmarkState.status === 'running'
                        ? 'Running…'
                        : 'Run suite'}
                    </Button>
                  </CardAction>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Last run</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">
                        {formatRelativeTimestamp(benchmarkState.generatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Worst warm p95</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">
                        {formatDuration(benchmarkSummary.warmP95 ?? undefined)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Average warm p50</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">
                        {formatDuration(
                          benchmarkSummary.warmP50Average ?? undefined,
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>Selected cache mode</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">
                        {formatCacheMode(cacheMode)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {benchmarkState.status === 'idle' ? (
                  <Alert>
                    <CircleAlertIcon />
                    <AlertTitle>No benchmark run yet</AlertTitle>
                    <AlertDescription>
                      Run the suite to populate cold and warm timing rows for
                      the current backend.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Probe</TableHead>
                      <TableHead>Cache</TableHead>
                      <TableHead>Cold</TableHead>
                      <TableHead>Warm p50</TableHead>
                      <TableHead>Warm p95</TableHead>
                      <TableHead>Avg bytes</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benchmarkState.results.length > 0 ? (
                      benchmarkState.results.map((result) => {
                        const probe = LAB_PROBES.find(
                          (candidate) => candidate.id === result.probeId,
                        );

                        return (
                          <TableRow key={result.probeId}>
                            <TableCell className="font-medium">
                              {probe?.label ?? result.probeId}
                            </TableCell>
                            <TableCell>
                              {formatCacheMode(result.cacheMode)}
                            </TableCell>
                            <TableCell>
                              {formatDuration(result.coldMs ?? undefined)}
                            </TableCell>
                            <TableCell>
                              {formatDuration(result.warmP50Ms ?? undefined)}
                            </TableCell>
                            <TableCell>
                              {formatDuration(result.warmP95Ms ?? undefined)}
                            </TableCell>
                            <TableCell>
                              {formatMaybeBytes(result.avgBytesProcessed)}
                            </TableCell>
                            <TableCell>{result.source ?? '—'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  result.status === 'error'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {result.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="whitespace-normal text-muted-foreground"
                        >
                          Benchmark results will appear here after the first
                          suite run.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="architecture"
            className="mt-6 flex flex-col gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Request path</CardTitle>
                <CardDescription>
                  The current baseline keeps the path direct so later semantic
                  adapters can be measured against it.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {architectureSteps.map((step) => (
                  <Card key={step.label} size="sm">
                    <CardHeader>
                      <CardTitle>{step.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timing composition</CardTitle>
                <CardDescription>
                  These are the numbers the lab currently exposes for each
                  request path.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TIMING_BREAKDOWN.map((item) => (
                      <TableRow key={item.metric}>
                        <TableCell className="font-medium">
                          {item.metric}
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                          {item.explanation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Alert>
              <CircleAlertIcon />
              <AlertTitle>Future insertion point</AlertTitle>
              <AlertDescription>
                When a semantic layer is added, it should sit between the probe
                route and BigQuery without changing the probe contracts or the
                UI workflow of this lab.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="backends" className="mt-6 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Backend adapters</CardTitle>
                <CardDescription>
                  The UI should stay constant while the adapter behind each
                  probe changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Backend</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {LAB_BACKENDS.map((backend) => (
                      <TableRow key={backend.id}>
                        <TableCell className="font-medium">
                          {backend.label}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{backend.status}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                          {backend.description}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-medium">
                        Semantic layer adapter
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">planned</Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        Future adapter for Lightdash or another governed
                        backend. It should implement the same probes so latency
                        can be compared directly against the baseline.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Alert>
              <CircleAlertIcon />
              <AlertTitle>Comparison rule</AlertTitle>
              <AlertDescription>
                A backend comparison is only valid when both backends implement
                the same probe contract and expose the same timing metadata.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
