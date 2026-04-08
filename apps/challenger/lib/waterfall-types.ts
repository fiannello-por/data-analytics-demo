// apps/challenger/lib/waterfall-types.ts

export type QuerySpan = {
  id: string; // e.g. "scorecard/New Logo/group-0/current"
  section: string; // e.g. "scorecard", "trend", "closedWon", "filters"
  priority: number; // from manifest
  limiterWaitMs: number;
  submitMs: number;
  pollMs: number;
  lightdashExecMs: number;
  lightdashPageMs: number;
  cacheHit: boolean;
  startMs: number; // relative to collector epoch
  endMs: number; // relative to collector epoch
};

export class WaterfallCollector {
  private epoch: number;
  private spans: QuerySpan[] = [];

  constructor() {
    this.epoch = performance.now();
  }

  getEpoch(): number {
    return this.epoch;
  }

  record(span: QuerySpan): void {
    this.spans.push(span);
  }

  getSpans(): QuerySpan[] {
    return [...this.spans];
  }
}
