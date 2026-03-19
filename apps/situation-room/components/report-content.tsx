"use client";

import { ReportHeader } from "@/components/report-header";
import { FilterRail } from "@/components/filter-rail";
import { ExecutiveSnapshot } from "@/components/executive-snapshot";
import { TrendChart } from "@/components/trend-chart";
import { CategorySection } from "@/components/category-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useFilters } from "@/hooks/use-filters";
import { useScorecardQuery } from "@/hooks/use-scorecard-query";
import { CATEGORIES } from "@/lib/queries";

export function ReportContent() {
  const { activeFilters, activeCount, setFilter, clearAll } = useFilters();
  const { data, isLoading, error } = useScorecardQuery(activeFilters);

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-10 md:px-10 md:py-14">
      <ReportHeader lastRefreshed={data ? new Date() : undefined} />

      <FilterRail
        activeFilters={activeFilters}
        activeCount={activeCount}
        onSetFilter={setFilter}
        onClearAll={clearAll}
      />

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
          <ExecutiveSnapshot data={data} />

          <section className="py-8 border-b border-border-subtle">
            <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary mb-5">
              Category Comparison
            </h2>
            <TrendChart data={data} metricIndex={0} />
          </section>

          <div className="divide-y divide-border-subtle">
            {CATEGORIES.map((cat) => {
              const catData = data.find((d) => d.category === cat);
              if (!catData) return null;
              return <CategorySection key={cat} data={catData} />;
            })}
          </div>
        </>
      )}

      <Separator className="mt-12" />
      <footer className="py-6 text-center">
        <p className="text-xs text-text-tertiary">
          Data sourced from Lightdash semantic layer · All metrics governed centrally
        </p>
      </footer>
    </main>
  );
}
