'use client';

// apps/challenger/components/clear-cache-button.tsx
//
// Scoped cache-clearing button that:
// 1. Busts server-side Next.js cache via POST /api/revalidate
// 2. Purges TanStack Query client cache for the active tab
// Components re-mount queries automatically after removal.

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Category } from '@por/dashboard-constants';

import type { DashboardTab } from '@/lib/dashboard-reducer';

// ─── Props ──────────────────────────────────────────────────────────────────

export type ClearCacheButtonProps = {
  activeTab: DashboardTab;
  category: Category | undefined;
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

async function purgeAndRefetchClientQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  activeTab: DashboardTab,
  category: Category | undefined,
): Promise<void> {
  const prefixes: unknown[][] = [];
  if (activeTab === 'Overview') {
    prefixes.push(['overview']);
  } else if (category) {
    prefixes.push(['scorecard', category]);
    prefixes.push(['trend', category]);
    prefixes.push(['closed-won', category]);
  }

  // Remove all cached data for the active tab surfaces
  for (const prefix of prefixes) {
    queryClient.removeQueries({ queryKey: prefix });
  }

  // Force immediate refetch of all queries matching these prefixes.
  // After removeQueries the cache is empty so hooks will be in isPending
  // state. refetchQueries ensures the re-fetch starts immediately rather
  // than waiting for a React re-render cycle.
  for (const prefix of prefixes) {
    await queryClient.refetchQueries({ queryKey: prefix });
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ClearCacheButton({ activeTab, category, onRefreshComplete }: ClearCacheButtonProps) {
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

      // Step 2: purge client cache + force refetch
      await purgeAndRefetchClientQueries(queryClient, activeTab, category);

      // Step 3: trigger re-orchestration if needed
      onRefreshComplete?.();
    } catch {
      // Silently ignore — data will still be stale but user can retry
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, category, queryClient, onRefreshComplete]);

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
