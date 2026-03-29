'use client';

// apps/challenger/components/category-tab.tsx

import type { Category, DashboardFilters, DateRange } from '@por/dashboard-constants';

import type { ClosedWonSort, DashboardAction } from '@/lib/dashboard-reducer';

import { ScorecardSection } from './scorecard-section';
import { TrendSection } from './trend-section';

type CategoryTabProps = {
  category: Category;
  filters: DashboardFilters;
  dateRange: DateRange;
  selectedTileId: string | undefined;
  cwPage: number;
  cwSort: ClosedWonSort;
  enabled: boolean;
  dispatch: React.Dispatch<DashboardAction>;
};

export function CategoryTab({
  category,
  filters,
  dateRange,
  selectedTileId,
  cwPage,
  cwSort,
  enabled,
  dispatch,
}: CategoryTabProps) {
  function handleTileSelect(tileId: string) {
    dispatch({ type: 'SELECT_TILE', category, tileId });
  }

  return (
    <div>
      <ScorecardSection
        category={category}
        filters={filters}
        dateRange={dateRange}
        selectedTileId={selectedTileId}
        onTileSelect={handleTileSelect}
        enabled={enabled}
      />

      <TrendSection
        category={category}
        tileId={selectedTileId}
        filters={filters}
        dateRange={dateRange}
        enabled={enabled}
      />

      {/* Closed-won table — Task 12 */}
      <div data-testid="closed-won-placeholder">Closed Won (Task 12)</div>
    </div>
  );
}
