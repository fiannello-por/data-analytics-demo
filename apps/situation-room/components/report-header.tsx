import { ThemeToggle } from './theme-toggle';

interface ReportHeaderProps {
  lastRefreshed?: Date;
}

export function ReportHeader({ lastRefreshed }: ReportHeaderProps) {
  const now = new Date();
  const year = now.getFullYear();

  return (
    <header>
      <div className="flex items-start justify-between">
        <div>
          <p className="heading-overline mb-2">Situation Room</p>
          <h1 className="text-3xl font-semibold tracking-tight text-heading-primary leading-tight">
            Sales Performance Report
          </h1>
          <p className="mt-3 text-sm text-text-secondary max-w-2xl leading-relaxed">
            Year-to-date performance across all booking categories. Metrics
            compare current period against prior year at the same point in time.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs text-text-tertiary">Reporting Period</p>
            <p className="text-sm font-medium text-text-primary tabular-nums">
              {year} YTD
            </p>
          </div>
          <div className="no-print">
            <ThemeToggle />
          </div>
        </div>
      </div>
      {lastRefreshed && (
        <p className="mt-4 text-xs text-text-tertiary">
          Last refreshed{' '}
          <time dateTime={lastRefreshed.toISOString()}>
            {lastRefreshed.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </time>
        </p>
      )}
    </header>
  );
}
