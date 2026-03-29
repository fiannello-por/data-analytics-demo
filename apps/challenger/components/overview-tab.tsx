'use client';

// apps/challenger/components/overview-tab.tsx

import type { DashboardFilters, DateRange } from '@por/dashboard-constants';

import { useOverviewBoard } from '@/lib/query-hooks';

import { CategoryCard } from './category-card';
import { RefreshingIndicator } from './refreshing-indicator';
import { SectionError } from './section-error';
import { SectionSkeleton } from './section-skeleton';

type OverviewTabProps = {
  filters: DashboardFilters;
  dateRange: DateRange;
  enabled: boolean;
};

export function OverviewTab({ filters, dateRange, enabled }: OverviewTabProps) {
  const { data, isPending, isFetching, isError, error, refetch } =
    useOverviewBoard(filters, dateRange, { enabled });

  if (isPending) {
    return <SectionSkeleton height={300} label="overview" />;
  }

  if (isError) {
    return (
      <SectionError
        message={error instanceof Error ? error.message : 'Failed to load overview data'}
        onRetry={() => void refetch()}
        staleContent={
          data ? (
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}
            >
              {data.categories.map((result) => (
                <CategoryCard key={result.category} result={result} />
              ))}
            </div>
          ) : undefined
        }
      />
    );
  }

  const content = (
    <div
      data-testid="section-ready"
      style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}
    >
      {data.categories.map((result) => (
        <CategoryCard key={result.category} result={result} />
      ))}
    </div>
  );

  if (isFetching) {
    return (
      <RefreshingIndicator isRefreshing>
        {content}
      </RefreshingIndicator>
    );
  }

  return content;
}
