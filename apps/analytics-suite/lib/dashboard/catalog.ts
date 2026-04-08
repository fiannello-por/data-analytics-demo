import {
  OVERVIEW_TAB,
  CATEGORY_ORDER,
  DASHBOARD_TAB_ORDER,
  type Category,
  type DashboardTab,
  TILE_CATALOG,
  getCategoryTiles,
  getDefaultTileId,
  findTileDefinition,
  findCategoryForTileId,
  type TileDefinition,
  type TileFormatType,
  GLOBAL_FILTER_KEYS,
  type GlobalFilterKey,
} from '@por/dashboard-constants';

// Re-export everything from shared package
export {
  OVERVIEW_TAB,
  CATEGORY_ORDER,
  DASHBOARD_TAB_ORDER,
  type Category,
  type DashboardTab,
  TILE_CATALOG,
  getCategoryTiles,
  getDefaultTileId,
  findTileDefinition,
  findCategoryForTileId,
  type TileDefinition,
  type TileFormatType,
  GLOBAL_FILTER_KEYS,
  type GlobalFilterKey,
};

export function isCategory(value: string): value is Category {
  return CATEGORY_ORDER.includes(value as Category);
}

export function isOverviewTab(value: string): value is typeof OVERVIEW_TAB {
  return value === OVERVIEW_TAB;
}

export function isDashboardTab(value: string): value is DashboardTab {
  return isOverviewTab(value) || isCategory(value);
}
