// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CategorySnapshotPayload,
  DashboardState,
  FilterDictionaryPayload,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-slot': 'alert' }, children),
  AlertDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-slot': 'alert-description' }, children),
  AlertTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-slot': 'alert-title' }, children),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', { 'data-slot': 'badge' }, children),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement('section', { 'data-slot': 'card' }, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-slot': 'card-content' }, children),
  CardDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', { 'data-slot': 'card-description' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('header', { 'data-slot': 'card-header' }, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', { 'data-slot': 'card-title' }, children),
}));

vi.mock('@/components/dashboard/dashboard-filters', () => ({
  DashboardFilters: ({
    onFilterValueAdd,
    onFilterValueRemove,
  }: {
    onFilterValueAdd: (key: string, value: string) => void;
    onFilterValueRemove: (key: string, value: string) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'filters' },
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => onFilterValueAdd('Division', 'Enterprise'),
          'data-testid': 'add-filter',
        },
        'Add filter',
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => onFilterValueRemove('Division', 'Enterprise'),
          'data-testid': 'remove-filter',
        },
        'Remove filter',
      ),
    ),
}));

vi.mock('@/components/dashboard/category-tabs', () => ({
  CategoryTabs: ({
    activeCategory,
    onValueChange,
    children,
  }: {
    activeCategory: DashboardState['activeCategory'];
    onValueChange?: (category: DashboardState['activeCategory']) => void;
    children: React.ReactNode;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'category-tabs' },
      React.createElement('span', { 'data-testid': 'active-category' }, activeCategory),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => onValueChange?.('Total'),
          'data-testid': 'select-total',
        },
        'Total',
      ),
      children,
    ),
}));

vi.mock('@/components/dashboard/tile-table', () => ({
  TileTable: ({
    snapshot,
    onRowSelect,
  }: {
    snapshot: CategorySnapshotPayload;
    onRowSelect?: (tileId: string) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'tile-table' },
      snapshot.rows.map((row) =>
        React.createElement(
          'button',
          {
            key: row.tileId,
            type: 'button',
            onClick: () => onRowSelect?.(row.tileId),
            'data-testid': `row-${row.tileId}`,
          },
          row.label,
        ),
      ),
    ),
}));

vi.mock('@/components/dashboard/trend-panel', () => ({
  TrendPanel: ({ trend }: { trend: TileTrendPayload }) =>
    React.createElement('div', { 'data-testid': 'trend-panel' }, trend.label),
}));

const snapshotCalls: string[] = [];
const trendCalls: string[] = [];

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('dashboard shell client interactions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  const initialState: DashboardState = {
    activeCategory: 'New Logo',
    selectedTileId: 'new_logo_sql',
    filters: {},
    dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
    previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
    trendGrain: 'weekly',
  };

  const initialSnapshot: CategorySnapshotPayload = {
    category: 'New Logo',
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
    lastRefreshedAt: '2026-03-22T00:00:00.000Z',
    rows: [
      {
        tileId: 'new_logo_sql',
        label: 'SQL',
        sortOrder: 1,
        formatType: 'number',
        currentValue: '10',
        previousValue: '8',
        pctChange: '+25%',
      },
    ],
    tileTimings: [],
  };

  const initialTrend: TileTrendPayload = {
    category: 'New Logo',
    tileId: 'new_logo_sql',
    label: 'SQL',
    grain: 'weekly',
    currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
    previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
    points: [],
  };

  const dictionaries: Record<string, FilterDictionaryPayload> = {
    Division: {
      filterKey: 'Division',
      options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
    } as FilterDictionaryPayload,
  } as Record<string, FilterDictionaryPayload>;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    snapshotCalls.length = 0;
    trendCalls.length = 0;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/dashboard/category/')) {
          snapshotCalls.push(url);
          return jsonResponse(initialSnapshot);
        }

        if (url.startsWith('/api/dashboard/trend/')) {
          trendCalls.push(url);
          return jsonResponse(initialTrend);
        }

        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell');
    root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(DashboardShell, {
          initialState,
          initialSnapshot,
          initialTrend,
          initialDictionaries: dictionaries,
        }),
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    replaceStateSpy.mockRestore();
    vi.unstubAllGlobals();
    container.remove();
  });

  it('refreshes only the trend endpoint when a row is selected', async () => {
    const rowButton = container.querySelector('[data-testid="row-new_logo_sql"]');
    expect(rowButton).not.toBeNull();

    await act(async () => {
      rowButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await flush();

    expect(snapshotCalls).toHaveLength(0);
    expect(trendCalls).toHaveLength(1);
    expect(trendCalls[0]).toContain('/api/dashboard/trend/new_logo_sql');
  });

  it('defaults to the first tile and refreshes both endpoints when the category changes', async () => {
    const categoryButton = container.querySelector('[data-testid="select-total"]');
    expect(categoryButton).not.toBeNull();

    await act(async () => {
      categoryButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await flush();

    expect(snapshotCalls).toHaveLength(1);
    expect(snapshotCalls[0]).toBe(
      '/api/dashboard/category/Total?category=Total&startDate=2026-01-01&endDate=2026-03-31',
    );
    expect(trendCalls).toHaveLength(1);
    expect(trendCalls[0]).toContain('/api/dashboard/trend/total_bookings_amount');
    expect(replaceStateSpy).toHaveBeenCalled();
  });
});
