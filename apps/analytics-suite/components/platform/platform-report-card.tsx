import * as React from 'react';
import type { DashboardBudgetReport } from '@por/semantic-runtime';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getCacheHitRate } from '@/lib/suite/platform-report';

type PlatformReportCardProps = {
  title: string;
  report: DashboardBudgetReport;
};

export function PlatformReportCard({ title, report }: PlatformReportCardProps) {
  const cacheHitRate = getCacheHitRate(report);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardDescription className="text-sm font-medium uppercase tracking-[0.22em]">
              {title}
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">
              {report.status === 'healthy'
                ? 'Healthy'
                : report.status === 'warning'
                  ? 'Warning'
                  : 'Degrade'}
            </CardTitle>
          </div>
          <Badge
            variant={report.status === 'healthy' ? 'outline' : 'secondary'}
          >
            {report.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Query count
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {report.telemetry.queryCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Bytes processed
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {report.telemetry.bytesProcessed.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Execution time
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {report.telemetry.executionDurationMs} ms
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Cache hit rate
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {Math.round(cacheHitRate * 100)}%
            </dd>
          </div>
        </dl>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Reasons
          </p>
          <ul className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
            {report.reasons.length > 0 ? (
              report.reasons.map((reason) => <li key={reason}>• {reason}</li>)
            ) : (
              <li>• Operating comfortably inside the declared budget.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
