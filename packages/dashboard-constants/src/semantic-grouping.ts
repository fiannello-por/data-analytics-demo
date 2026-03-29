// packages/dashboard-constants/src/semantic-grouping.ts

import type {
  SemanticFilter,
  DateRange,
  DateRangeStrategy,
  SnapshotGroup,
} from './semantic-types';
import { getSemanticTileSpec } from './semantic-specs';

export function buildFilterSignature(filters?: SemanticFilter[]): string {
  if (!filters?.length) {
    return '';
  }
  return JSON.stringify(filters);
}

export function getEffectiveDateRange(
  dateRange: DateRange,
  strategy: DateRangeStrategy | undefined,
): DateRange {
  if (strategy !== 'ytd_to_end') {
    return dateRange;
  }
  return {
    startDate: `${dateRange.endDate.slice(0, 4)}-01-01`,
    endDate: dateRange.endDate,
  };
}

export function getSnapshotGroups(tileIds: string[]): SnapshotGroup[] {
  const groups = new Map<string, SnapshotGroup>();

  for (const tileId of tileIds) {
    const semantic = getSemanticTileSpec(tileId);
    const key = `${semantic.dateDimension}:${semantic.dateRangeStrategy ?? 'selected'}:${buildFilterSignature(semantic.extraFilters)}`;
    const group = groups.get(key) ?? {
      dateDimension: semantic.dateDimension,
      extraFilters: semantic.extraFilters,
      dateRangeStrategy: semantic.dateRangeStrategy,
      tiles: [],
    };
    group.tiles.push({ ...semantic, tileId });
    groups.set(key, group);
  }

  return [...groups.values()];
}
