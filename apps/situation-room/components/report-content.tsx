'use client';

import { ReportHeader } from '@/components/report-header';
import { FilterRail } from '@/components/filter-rail';
import { ExecutiveSnapshot } from '@/components/executive-snapshot';
import { TrendChart } from '@/components/trend-chart';
import { CategorySection } from '@/components/category-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFilters } from '@/hooks/use-filters';
import { useScorecardQuery } from '@/hooks/use-scorecard-query';
import { CATEGORIES } from '@/lib/queries';

export function ReportContent() {
  const { activeFilters, activeCount, setFilter, clearAll } = useFilters();
  const { data, isLoading, error } = useScorecardQuery(activeFilters);

  return (
    <main className="min-h-screen w-full bg-surface-sunken">
      <div className="bg-surface border-b border-border-subtle">
        <div className="w-full px-6 py-10 md:px-10 md:py-14">
          <ReportHeader lastRefreshed={data ? new Date() : undefined} />
        </div>
      </div>

      <div className="no-print bg-filter-bar-bg border-b border-filter-bar-border">
        <div className="w-full px-6 md:px-10">
          <FilterRail
            activeFilters={activeFilters}
            activeCount={activeCount}
            onSetFilter={setFilter}
            onClearAll={clearAll}
          />
        </div>
      </div>

      <div className="w-full px-6 md:px-10 py-8">
        {error && (
          <div className="rounded-xl bg-negative-bg border border-negative-border px-5 py-4 mb-8">
            <p className="text-sm text-negative">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-96 rounded-lg" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        )}

        {data && !isLoading && (
          <>
            <ExecutiveSnapshot data={data} />

            <Card className="mt-8 bg-surface-elevated">
              <CardHeader>
                <CardTitle className="text-xs font-medium uppercase tracking-[0.15em] text-heading-overline">
                  Category Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart data={data} metricIndex={0} />
              </CardContent>
            </Card>

            <Tabs defaultValue={CATEGORIES[0]} className="mt-8">
              <TabsList className="w-fit">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
              {CATEGORIES.map((cat) => {
                const catData = data.find((d) => d.category === cat);
                if (!catData) return null;
                return (
                  <TabsContent key={cat} value={cat}>
                    <CategorySection data={catData} />
                  </TabsContent>
                );
              })}
            </Tabs>
          </>
        )}

        <footer className="mt-12 pt-6 border-t border-border-subtle text-center">
          <p className="text-xs text-text-tertiary">
            Data sourced from Lightdash semantic layer · All metrics governed
            centrally
          </p>
        </footer>
      </div>
    </main>
  );
}
