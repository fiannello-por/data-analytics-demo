'use client';

import * as React from 'react';
import type {
  CategorySnapshotPayload,
  DashboardState,
  FilterDictionaryPayload,
  TileTrendPayload,
} from '@/lib/dashboard/contracts';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { CategoryTabs } from '@/components/dashboard/category-tabs';
import { TileTable } from '@/components/dashboard/tile-table';
import { TrendPanel } from '@/components/dashboard/trend-panel';

type DashboardShellProps = {
  initialState: DashboardState;
  initialSnapshot: CategorySnapshotPayload;
  initialTrend: TileTrendPayload;
  initialDictionaries: Record<string, FilterDictionaryPayload>;
};

export function DashboardShell({
  initialState,
  initialSnapshot,
  initialTrend,
  initialDictionaries,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Situation Room</Badge>
            <Badge variant="secondary">Executive product</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Weekly executive scorecards
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Fixed tabs, curated metric rows, and a selected-metric trend panel
              backed by direct BigQuery reads for the baseline architecture.
            </p>
          </div>
        </header>

        <DashboardFilters
          state={initialState}
          dictionaries={initialDictionaries}
        />

        <CategoryTabs activeCategory={initialState.activeCategory}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{initialSnapshot.category}</CardTitle>
                  <Badge variant="outline">
                    {initialSnapshot.currentWindowLabel}
                  </Badge>
                </div>
                <CardDescription>
                  Current period vs previous-year equivalent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TileTable
                  snapshot={initialSnapshot}
                  selectedTileId={initialState.selectedTileId}
                />
              </CardContent>
            </Card>
            <TrendPanel trend={initialTrend} />
          </div>
        </CategoryTabs>
      </div>
    </main>
  );
}
