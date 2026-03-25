'use client';

import { ReportHeader } from '@/components/report-header';
import { FilterRail } from '@/components/filter-rail';
import { ExecutiveSnapshot } from '@/components/executive-snapshot';
import { CategorySection } from '@/components/category-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useFilters } from '@/hooks/use-filters';
import { useScorecardQuery } from '@/hooks/use-scorecard-query';
import type { ScorecardReportPayload } from '@/lib/contracts';

interface ReportContentProps {
  initialData: ScorecardReportPayload;
}

export function ReportContent({ initialData }: ReportContentProps) {
  const { activeFilters, activeCount, setFilter, clearAll } = useFilters();
  const { data, isLoading, error } = useScorecardQuery(
    activeFilters,
    initialData,
  );
  const report = data ?? initialData;

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-10 md:px-10 md:py-14">
      <ReportHeader lastRefreshed={new Date(report.lastRefreshedAt)} />

      <div className="no-print">
        <FilterRail
          activeFilters={activeFilters}
          activeCount={activeCount}
          onSetFilter={setFilter}
          onClearAll={clearAll}
        />
      </div>

      {error && (
        <div className="mt-8 rounded-lg bg-negative-bg border border-negative/20 px-4 py-3">
          <p className="text-sm text-negative">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3 py-8">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      )}

      {data && !isLoading && (
        <>
          <ExecutiveSnapshot data={report.categories} />

          <section className="py-8 border-b border-border-subtle">
            <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary mb-5">
              Category Comparison
            </h2>
            <div className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-5 text-sm text-text-secondary">
              Category comparison moved to the new Situation Room dashboard.
            </div>
          </section>

          <div className="divide-y divide-border-subtle">
            {report.categories.map((categoryData) => (
              <CategorySection
                key={categoryData.category}
                data={categoryData}
              />
            ))}
          </div>
        </>
      )}

      <Separator className="mt-12" />
      <footer className="py-6 text-center">
        <p className="text-xs text-text-tertiary">
          Data served by the BigQuery reporting baseline · All metrics governed
          centrally
        </p>
      </footer>
    </main>
  );
}
