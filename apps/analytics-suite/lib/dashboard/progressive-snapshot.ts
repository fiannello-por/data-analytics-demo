import {
  getCategoryTiles,
  type Category,
} from '@/lib/dashboard/catalog';
import type {
  CategorySnapshotGroupManifest,
  CategorySnapshotGroupPayload,
  CategorySnapshotPayload,
} from '@/lib/dashboard/contracts';
import { getSnapshotGroups } from '@/lib/dashboard-v2/semantic-registry';

export function getCategorySnapshotGroupManifest(
  category: Category,
): CategorySnapshotGroupManifest[] {
  return getSnapshotGroups(category).map((group) => ({
    category,
    groupId: group.groupId,
    tileIds: group.tiles.map((tile) => tile.tileId),
  }));
}

export function isCategorySnapshotComplete(
  category: Category,
  snapshot: CategorySnapshotPayload | null | undefined,
): boolean {
  if (!snapshot) {
    return false;
  }

  return snapshot.rows.length === getCategoryTiles(category).length;
}

export function mergeCategorySnapshotGroupPayload(
  snapshot: CategorySnapshotPayload | null,
  group: CategorySnapshotGroupPayload,
): CategorySnapshotPayload {
  const rowsByTileId = new Map(
    snapshot?.rows.map((row) => [row.tileId, row]) ?? [],
  );
  const timingsByTileId = new Map(
    snapshot?.tileTimings.map((timing) => [timing.tileId, timing]) ?? [],
  );

  for (const row of group.rows) {
    rowsByTileId.set(row.tileId, row);
  }

  for (const timing of group.tileTimings) {
    timingsByTileId.set(timing.tileId, timing);
  }

  const rows = [...rowsByTileId.values()].toSorted(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  const tileTimings = rows
    .map((row) => timingsByTileId.get(row.tileId))
    .filter((timing): timing is NonNullable<typeof timing> => Boolean(timing));

  return {
    category: group.category,
    currentWindowLabel: group.currentWindowLabel,
    previousWindowLabel: group.previousWindowLabel,
    lastRefreshedAt: group.lastRefreshedAt,
    rows,
    tileTimings,
  };
}
