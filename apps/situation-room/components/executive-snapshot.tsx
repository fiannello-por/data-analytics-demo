import type { CategoryData } from '@/lib/types';
import { ChangeIndicator } from './change-indicator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExecutiveSnapshotProps {
  data: CategoryData[];
}

export function ExecutiveSnapshot({ data }: ExecutiveSnapshotProps) {
  const highlights = data
    .filter((d) => d.rows.length > 0)
    .map((d) => ({ category: d.category, metric: d.rows[0] }));

  if (highlights.length === 0) return null;

  return (
    <section>
      <h2 className="heading-overline mb-5">Executive Snapshot</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {highlights.map(({ category, metric }) => (
          <Card
            key={category}
            size="sm"
            className="bg-surface-elevated shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <CardHeader>
              <CardDescription className="heading-overline">
                {category}
              </CardDescription>
              <CardTitle className="text-xs text-text-secondary font-normal">
                {metric.metricName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="kpi-value">{metric.currentPeriod}</p>
              <div className="mt-2 flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger className="text-xs text-text-tertiary tabular-nums cursor-default">
                    vs {metric.previousPeriod}
                  </TooltipTrigger>
                  <TooltipContent>Prior year-to-date value</TooltipContent>
                </Tooltip>
                <ChangeIndicator value={metric.pctChange} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
