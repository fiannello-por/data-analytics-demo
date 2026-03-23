import type { Category, TileFormatType } from '@/lib/dashboard/catalog';
import type { CategorySnapshotPayload, CategorySnapshotRow } from '@/lib/dashboard/contracts';
import { getMetricCopy } from '@/lib/dashboard/metric-copy';

type OverviewMetric = {
  tileId: string;
  label: string;
  value: string;
  fullValue: string;
  previousValue: string;
  delta: string;
  formatType: TileFormatType;
  description: string;
  calculation: string;
};

type OverviewSectionA = {
  id: 'section-a';
  hero: OverviewMetric;
  support: OverviewMetric | null;
};

type OverviewMetricRowSection = {
  id: 'section-b' | 'section-c';
  metrics: OverviewMetric[];
};

type OverviewSupportRow = {
  metrics: OverviewMetric[];
};

export type OverviewCategoryCard = {
  category: Category;
  sectionA: OverviewSectionA;
  sectionB: OverviewMetricRowSection;
  sectionC: OverviewMetricRowSection;
  supportRow: OverviewSupportRow;
};

export type OverviewTotalCard = {
  category: 'Total';
  hero: OverviewMetric;
  support: OverviewMetric | null;
  secondaryMetrics: OverviewMetric[];
};

export type OverviewBoardModel = {
  categoryCards: OverviewCategoryCard[];
  totalCard: OverviewTotalCard;
};

const SECTION_B_LABELS = ['Annual Pacing (YTD)', 'Close Rate', 'Avg Age'] as const;
const SECTION_C_LABELS = ['Pipeline Created', 'Avg Booked Deal', 'Avg Quoted Deal'] as const;

const SUPPORT_ROW_LABELS: Record<Exclude<Category, 'Total'>, readonly string[]> = {
  'New Logo': ['SQL', 'SQO', 'Gate 1 Complete', 'SDR Points', 'SQO Users'],
  Expansion: ['SQL', 'SQO'],
  Migration: ['SQL', 'SQO', 'SAL', 'Avg Users'],
  Renewal: ['SQL'],
};

function parseMetricValue(value: string, formatType: TileFormatType): number | null {
  if (value === '—') {
    return null;
  }

  if (formatType === 'percent') {
    const parsed = Number(value.replace('%', ''));
    return Number.isFinite(parsed) ? parsed / 100 : null;
  }

  if (formatType === 'days') {
    const parsed = Number(value.replace(/\s*days$/u, '').replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCompactMetricValue(
  value: string,
  formatType: TileFormatType,
): string {
  const parsed = parseMetricValue(value, formatType);

  if (parsed == null) {
    return value;
  }

  if (formatType === 'currency') {
    if (Math.abs(parsed) < 1000) {
      return value;
    }

    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1,
    })
      .format(parsed)
      .replace(/\.0([KMBT])$/u, '$1');
  }

  if (formatType === 'number') {
    if (Math.abs(parsed) < 1000) {
      return value;
    }

    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    })
      .format(parsed)
      .replace(/\.0([KMBT])$/u, '$1');
  }

  return value;
}

function toMetric(row: CategorySnapshotRow | undefined): OverviewMetric | null {
  if (!row) {
    return null;
  }

  return {
    ...getMetricCopy(row.label),
    tileId: row.tileId,
    label: row.label,
    value: formatCompactMetricValue(row.currentValue, row.formatType),
    fullValue: row.currentValue,
    previousValue: row.previousValue,
    delta: row.pctChange,
    formatType: row.formatType,
  };
}

function findRow(snapshot: CategorySnapshotPayload, label: string) {
  return snapshot.rows.find((row) => row.label === label);
}

function requireMetric(snapshot: CategorySnapshotPayload, label: string): OverviewMetric {
  const metric = toMetric(findRow(snapshot, label));

  if (!metric) {
    throw new Error(`Overview metric "${label}" missing from category "${snapshot.category}".`);
  }

  return metric;
}

function optionalMetrics(snapshot: CategorySnapshotPayload, labels: readonly string[]) {
  return labels
    .map((label) => toMetric(findRow(snapshot, label)))
    .filter((metric): metric is OverviewMetric => metric !== null);
}

function buildCategoryScorecard(snapshot: CategorySnapshotPayload): OverviewCategoryCard {
  if (snapshot.category === 'Total') {
    throw new Error('Total snapshot cannot be rendered as a category scorecard.');
  }

  return {
    category: snapshot.category,
    sectionA: {
      id: 'section-a',
      hero: requireMetric(snapshot, 'Bookings $'),
      support: toMetric(findRow(snapshot, 'Bookings #')),
    },
    sectionB: {
      id: 'section-b',
      metrics: optionalMetrics(snapshot, SECTION_B_LABELS),
    },
    sectionC: {
      id: 'section-c',
      metrics: optionalMetrics(snapshot, SECTION_C_LABELS),
    },
    supportRow: {
      metrics: optionalMetrics(snapshot, SUPPORT_ROW_LABELS[snapshot.category]),
    },
  };
}

function buildTotalScorecard(snapshot: CategorySnapshotPayload | undefined): OverviewTotalCard {
  if (!snapshot || snapshot.category !== 'Total') {
    throw new Error('Overview board requires a Total snapshot.');
  }

  return {
    category: 'Total',
    hero: requireMetric(snapshot, 'Bookings $'),
    support: toMetric(findRow(snapshot, 'Bookings #')),
    secondaryMetrics: optionalMetrics(snapshot, ['Annual Pacing (YTD)', 'One-time Revenue']),
  };
}

export function buildOverviewBoard(
  snapshots: CategorySnapshotPayload[],
): OverviewBoardModel {
  const totalSnapshot = snapshots.find((snapshot) => snapshot.category === 'Total');

  return {
    categoryCards: snapshots
      .filter((snapshot): snapshot is CategorySnapshotPayload & { category: Exclude<Category, 'Total'> } => snapshot.category !== 'Total')
      .map(buildCategoryScorecard),
    totalCard: buildTotalScorecard(totalSnapshot),
  };
}
