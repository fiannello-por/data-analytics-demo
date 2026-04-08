'use client';

// apps/challenger/components/clear-cache-button.tsx
//
// Scoped cache-clearing button that:
// 1. Busts server-side Next.js cache via POST /api/revalidate
// 2. Purges TanStack Query client cache for the active tab
// Components re-mount queries automatically after removal.

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Category, DashboardFilters, DateRange } from '@por/dashboard-constants';

import type { ClosedWonSort, DashboardTab } from '@/lib/dashboard-reducer';
import { queryKeys } from '@/lib/query-keys';

// ─── Props ──────────────────────────────────────────────────────────────────

export type ClearCacheButtonProps = {
  activeTab: DashboardTab;
  category: Category | undefined;
  committedFilters: DashboardFilters;
  committedDateRange: DateRange;
  cwPage: number;
  cwSort: ClosedWonSort;
  selectedTileId: string | undefined;
  onRefreshComplete?: () => void;
};

// ─── Cache tag / query key helpers ──────────────────────────────────────────

function getServerCacheTags(
  activeTab: DashboardTab,
  category: Category | undefined,
): string[] {
  if (activeTab === 'Overview') {
    return ['challenger-overview-board'];
  }
  if (category) {
    return [
      `challenger-scorecard-${category}`,
      `challenger-trend-${category}`,
      `challenger-closed-won-${category}`,
    ];
  }
  return [];
}

async function invalidateAndRefetchClientQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  activeTab: DashboardTab,
  category: Category | undefined,
  filters: DashboardFilters,
  dateRange: DateRange,
  cwPage: number,
  cwSort: ClosedWonSort,
  selectedTileId: string | undefined,
): Promise<void> {
  // Use exact query keys matching the current committed state so that only
  // the visible data is invalidated — not stale entries for other filter /
  // dateRange / page combinations that may still be in the cache.
  const keys: (readonly unknown[])[] = [];

  if (activeTab === 'Overview') {
    keys.push(queryKeys.overview(filters, dateRange));
  } else if (category) {
    keys.push(queryKeys.scorecard(category, filters, dateRange));
    if (selectedTileId) {
      keys.push(queryKeys.trend(category, selectedTileId, filters, dateRange));
    }
    keys.push(queryKeys.closedWon(category, filters, dateRange, cwPage, cwSort));
  }

  await Promise.all(
    keys.map((key) =>
      queryClient.invalidateQueries({ queryKey: [...key], exact: true, refetchType: 'all' }),
    ),
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ClearCacheButton({
  activeTab,
  category,
  committedFilters,
  committedDateRange,
  cwPage,
  cwSort,
  selectedTileId,
  onRefreshComplete,
}: ClearCacheButtonProps) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const tags = getServerCacheTags(activeTab, category);

      if (tags.length > 0) {
        // Step 1: bust server cache
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags }),
        });
      }

      // Step 2: invalidate client cache + trigger refetch (exact keys only)
      await invalidateAndRefetchClientQueries(
        queryClient,
        activeTab,
        category,
        committedFilters,
        committedDateRange,
        cwPage,
        cwSort,
        selectedTileId,
      );

      // Step 3: trigger re-orchestration if needed
      onRefreshComplete?.();
    } catch {
      // Silently ignore — data will still be stale but user can retry
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, category, committedFilters, committedDateRange, cwPage, cwSort, selectedTileId, queryClient, onRefreshComplete]);

  return (
    <button
      data-testid="clear-cache-button"
      onClick={handleRefresh}
      disabled={refreshing}
      aria-busy={refreshing}
      style={{
        padding: '0.25rem 0.75rem',
        background: refreshing ? '#e5e5e5' : '#f5f5f5',
        color: refreshing ? '#999' : '#333',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.8rem',
        cursor: refreshing ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          animation: refreshing ? 'spin 1s linear infinite' : 'none',
        }}
      >
        &#x21bb;
      </span>
      {refreshing ? 'Refreshing...' : 'Refresh'}

      {/* Inline keyframe for the spinner */}
      {refreshing && (
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      )}
    </button>
  );
}
