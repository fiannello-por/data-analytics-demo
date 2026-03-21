import { performance } from 'node:perf_hooks';

const DEFAULT_BASE_URL = 'http://localhost:3100';
const DEFAULT_ITERATIONS = 6;
const DEFAULT_TIMEOUT_MS = 30_000;

const BENCHMARKS = [
  {
    label: '/api/report',
    path: '/api/report',
  },
  {
    label: '/api/report?Division=Rental&Region=North',
    path: '/api/report?Division=Rental&Region=North',
  },
  {
    label: '/api/filter-dictionaries/Division',
    path: '/api/filter-dictionaries/Division',
  },
];

function parseArgs(argv) {
  const options = {
    iterations: DEFAULT_ITERATIONS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return options;
    }

    if (arg.startsWith('--iterations=')) {
      options.iterations = parsePositiveInteger(
        arg.slice('--iterations='.length),
        '--iterations',
      );
      continue;
    }

    if (arg === '--iterations') {
      index += 1;
      options.iterations = parsePositiveInteger(argv[index], '--iterations');
      continue;
    }

    if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMs = parsePositiveInteger(
        arg.slice('--timeout-ms='.length),
        '--timeout-ms',
      );
      continue;
    }

    if (arg === '--timeout-ms') {
      index += 1;
      options.timeoutMs = parsePositiveInteger(argv[index], '--timeout-ms');
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parsePositiveInteger(value, flagName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected ${flagName} to be a positive integer, got ${value}`);
  }

  return parsed;
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );

  return sorted[index];
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function measureRequest(baseUrl, path, timeoutMs) {
  const startedAt = performance.now();

  let response;
  try {
    response = await fetchWithTimeout(new URL(path, baseUrl), timeoutMs);
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'AbortError'
        ? `timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new Error(`Request failed for ${path}: ${reason}`);
  }

  const body = await response.text();
  const elapsedMs = performance.now() - startedAt;

  if (!response.ok) {
    const snippet = body.slice(0, 500);
    throw new Error(
      `Request failed for ${path}: HTTP ${response.status} ${response.statusText}${
        snippet ? ` - ${snippet}` : ''
      }`,
    );
  }

  const bytesProcessedHeader = response.headers.get(
    'x-situation-room-bytes-processed',
  );
  const bytesProcessed = bytesProcessedHeader
    ? Number(bytesProcessedHeader)
    : 0;

  return {
    elapsedMs,
    bytesProcessed: Number.isFinite(bytesProcessed) ? bytesProcessed : 0,
  };
}

async function runBenchmark(baseUrl, benchmark, iterations, timeoutMs) {
  if (iterations < 1) {
    throw new Error('Iterations must be at least 1.');
  }

  const latencies = [];
  const bytesProcessedValues = [];

  for (let index = 0; index < iterations; index += 1) {
    const result = await measureRequest(baseUrl, benchmark.path, timeoutMs);
    latencies.push(result.elapsedMs);
    bytesProcessedValues.push(result.bytesProcessed);
  }

  return {
    label: benchmark.label,
    path: benchmark.path,
    iterations,
    coldMs: roundMs(latencies[0]),
    warmP50Ms: roundMs(percentile(latencies.slice(1), 50)),
    warmP95Ms: roundMs(percentile(latencies.slice(1), 95)),
    avgBytesProcessed: Math.round(
      bytesProcessedValues.reduce((sum, value) => sum + value, 0) /
        bytesProcessedValues.length,
    ),
  };
}

function roundMs(value) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(
      [
        'Usage: node scripts/benchmark-report.mjs [--iterations N] [--timeout-ms N]',
        '',
        'Environment:',
        `  BENCHMARK_BASE_URL  Base URL for the Situation Room app (default: ${DEFAULT_BASE_URL})`,
      ].join('\n'),
    );
    return;
  }

  const baseUrl = process.env.BENCHMARK_BASE_URL ?? DEFAULT_BASE_URL;

  const results = [];
  for (const benchmark of BENCHMARKS) {
    results.push(
      await runBenchmark(baseUrl, benchmark, options.iterations, options.timeoutMs),
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        baseUrl,
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
