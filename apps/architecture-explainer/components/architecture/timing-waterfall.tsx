'use client';

import * as React from 'react';
import type { ArchitectureNodeTiming } from '@/lib/architecture/contracts';
import { cn } from '@/lib/utils';

const SEGMENT_CLASS_BY_LABEL: Record<string, string> = {
  server: 'bg-sky-400/85',
  BigQuery: 'bg-emerald-400/85',
  transform: 'bg-amber-400/85',
  render: 'bg-fuchsia-400/85',
  network: 'bg-indigo-400/85',
};

export function TimingWaterfall({
  timing,
}: {
  timing: ArchitectureNodeTiming | null;
}) {
  if (!timing) {
    return (
      <div className="rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        No timing captured for this node in the baseline report yet.
      </div>
    );
  }

  const total = Math.max(timing.durationMs, 1);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">Total duration</span>
        <span className="font-mono text-lg font-semibold">{timing.durationMs} ms</span>
      </div>

      <div className="overflow-hidden rounded-md border border-border/70 bg-background/60">
        <div className="flex h-3 w-full">
          {timing.breakdown.map((segment) => (
            <div
              key={segment.label}
              className={cn(
                'h-full transition-[width]',
                SEGMENT_CLASS_BY_LABEL[segment.label] ?? 'bg-primary/80',
              )}
              style={{ width: `${(segment.durationMs / total) * 100}%` }}
              title={`${segment.label}: ${segment.durationMs} ms`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {timing.breakdown.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'size-2 rounded-full',
                  SEGMENT_CLASS_BY_LABEL[segment.label] ?? 'bg-primary/80',
                )}
              />
              <span className="text-muted-foreground">{segment.label}</span>
            </div>
            <span className="font-mono text-sm font-medium">{segment.durationMs} ms</span>
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        This mini waterfall shows which stage contributes most to the selected
        component&apos;s refresh cost in the current baseline architecture.
      </p>
    </div>
  );
}
