import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeDistribution, bootstrapP50CI } from './stats';
import type {
  ExperimentRunMetrics,
  ExperimentSummary,
  RunMode,
} from './types';

const METRIC_KEYS: (keyof ExperimentRunMetrics)[] = [
  'ttfbMs',
  'fcpMs',
  'lcpMs',
  'totalPageLoadMs',
  'ssrDataFetchMs',
  'totalCompileMs',
  'totalExecuteMs',
  'totalQueryCount',
  'totalBytesProcessed',
  'filterDictionaryMs',
  'semanticCacheHits',
  'semanticCacheMisses',
  'jsDownloadMs',
  'hydrationMs',
];

function isNumericMetric(key: string): key is keyof ExperimentRunMetrics {
  return METRIC_KEYS.includes(key as keyof ExperimentRunMetrics);
}

export function aggregateResults(resultsDir: string): ExperimentSummary[] {
  const files = readdirSync(resultsDir).filter((f) => f.endsWith('.json') && f !== 'summary.json');

  const runs: ExperimentRunMetrics[] = files.map((f) =>
    JSON.parse(readFileSync(join(resultsDir, f), 'utf8')),
  );

  const byExperiment = new Map<string, ExperimentRunMetrics[]>();
  for (const run of runs) {
    const group = byExperiment.get(run.experimentId) ?? [];
    group.push(run);
    byExperiment.set(run.experimentId, group);
  }

  const summaries: ExperimentSummary[] = [];

  for (const [experimentId, expRuns] of byExperiment) {
    const byMode = (mode: RunMode) =>
      expRuns.filter((r) => r.runMode === mode);

    const modeDistributions = (mode: RunMode) => {
      const modeRuns = byMode(mode);
      const result: Record<string, ReturnType<typeof computeDistribution>> = {};
      for (const key of METRIC_KEYS) {
        if (isNumericMetric(key)) {
          result[key] = computeDistribution(
            modeRuns.map((r) => r[key] as number),
          );
        }
      }
      return result;
    };

    summaries.push({
      experimentId,
      fullCold: modeDistributions('full-cold'),
      productionCold: modeDistributions('production-cold'),
      warm: modeDistributions('warm'),
    });
  }

  // Comparisons are generated for full-cold mode only since that is the
  // primary optimization target. Experiments targeting warm mode (e.g., E3
  // wired cache) will need warm-mode comparisons added when implemented.
  const baseline = summaries.find((s) => s.experimentId === 'baseline');
  if (baseline) {
    const baselineFullColdRuns = runs
      .filter(
        (r) => r.experimentId === 'baseline' && r.runMode === 'full-cold',
      );

    for (const summary of summaries) {
      if (summary.experimentId === 'baseline') continue;

      const variantFullColdRuns = runs
        .filter(
          (r) =>
            r.experimentId === summary.experimentId &&
            r.runMode === 'full-cold',
        );

      summary.comparison = METRIC_KEYS
        .filter((key) => isNumericMetric(key))
        .map((key) => {
          const bValues = baselineFullColdRuns.map((r) => r[key] as number);
          const vValues = variantFullColdRuns.map((r) => r[key] as number);
          const bP50 = computeDistribution(bValues).p50;
          const vP50 = computeDistribution(vValues).p50;
          const ci = bValues.length > 0 && vValues.length > 0
            ? bootstrapP50CI(bValues, vValues)
            : { ciLower95: 0, ciUpper95: 0, significant: false };

          return {
            metric: key,
            baselineP50: bP50,
            variantP50: vP50,
            absoluteDelta: vP50 - bP50,
            percentDelta: bP50 !== 0 ? ((vP50 - bP50) / bP50) * 100 : 0,
            ...ci,
          };
        });
    }
  }

  return summaries;
}

// CLI entry point
if (process.argv[1]?.endsWith('aggregate-results.ts') || process.argv[1]?.endsWith('aggregate-results.js')) {
  const resultsDir = join(process.cwd(), 'results');
  const summaries = aggregateResults(resultsDir);
  writeFileSync(
    join(resultsDir, 'summary.json'),
    JSON.stringify(summaries, null, 2),
  );
  console.log(
    `Aggregated ${summaries.length} experiment(s) → results/summary.json`,
  );
}