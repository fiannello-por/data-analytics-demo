// apps/challenger/app/page.tsx

import {
  getCategoryTiles,
  CATEGORY_ORDER,
  type Category,
} from '@por/dashboard-constants';
import { DashboardQueryProvider } from '@/components/dashboard-query-provider';
import { DashboardShell } from '@/components/dashboard-shell';
import { createInitialState } from '@/lib/dashboard-reducer';
import { isCategory } from '@/lib/dashboard-reducer';
import { parseDashboardUrl } from '@/lib/url-state';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type SearchParamsInput = Promise<
  Record<string, string | string[] | undefined> | undefined
>;

export default async function ChallengerPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const parsed = parseDashboardUrl(resolvedParams);

  // Validate the tile: must be a real tile ID for the active category
  let validatedTile: string | undefined;
  if (parsed.tile && isCategory(parsed.tab)) {
    const tiles = getCategoryTiles(parsed.tab as Category);
    if (tiles.some((t) => t.tileId === parsed.tile)) {
      validatedTile = parsed.tile;
    }
  }

  const initialState = createInitialState({
    activeTab: parsed.tab,
    committedFilters: parsed.filters,
    committedDateRange: parsed.dateRange,
    selectedTileByCategory:
      validatedTile && isCategory(parsed.tab)
        ? { [parsed.tab as Category]: validatedTile }
        : {},
    cwSortByCategory:
      isCategory(parsed.tab)
        ? { [parsed.tab as Category]: parsed.cwSort }
        : {},
    cwPage: parsed.cwPage,
  });

  return (
    <DashboardQueryProvider>
      <DashboardShell initialState={initialState} />
    </DashboardQueryProvider>
  );
}
