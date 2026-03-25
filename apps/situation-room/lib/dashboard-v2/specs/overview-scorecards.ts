import type {
  CompositeTileSpec,
  MetricTileSpec,
} from '@por/dashboard-spec';
import type {
  OverviewCategoryCard,
  OverviewMetric,
  OverviewTotalCard,
} from '@/lib/dashboard/overview-model';

export type OverviewMetricBindings = Record<string, OverviewMetric>;

function toSpecId(...parts: string[]) {
  return parts
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '');
}

function buildMetricSpec(
  scope: string,
  metric: OverviewMetric,
): MetricTileSpec {
  return {
    id: toSpecId(scope, metric.tileId),
    kind: 'metric',
    title: metric.label,
    description: metric.description,
    data: {
      kind: 'binding',
      key: metric.tileId,
    },
    visualization: {
      type: 'metric',
      valueField: 'value',
    },
  };
}

function collectMetricBindings(metrics: OverviewMetric[]): OverviewMetricBindings {
  return Object.fromEntries(metrics.map((metric) => [metric.tileId, metric]));
}

function buildMetricGroupSpec(
  scope: string,
  title: string,
  description: string,
  metrics: OverviewMetric[],
  layout?: CompositeTileSpec['layout'],
): CompositeTileSpec | null {
  if (metrics.length === 0) {
    return null;
  }

  return {
    id: toSpecId(scope),
    kind: 'composite',
    title,
    description,
    layout,
    children: metrics.map((metric) => buildMetricSpec(scope, metric)),
  };
}

export function buildOverviewCategoryScorecardSpec(
  card: OverviewCategoryCard,
): CompositeTileSpec {
  const scope = `overview_category_scorecard_${card.category}`;
  const primaryGroup = buildMetricGroupSpec(
    `${scope}_primary`,
    'Headline KPIs',
    `Primary overview metrics for ${card.category}.`,
    [card.sectionA.hero, ...(card.sectionA.support ? [card.sectionA.support] : [])],
    {
      type: 'grid',
      columns: card.sectionA.support ? 2 : 1,
      gap: 16,
    },
  );
  const sectionB = buildMetricGroupSpec(
    `${scope}_section_b`,
    'Trend KPIs',
    `Supporting trend metrics for ${card.category}.`,
    card.sectionB.metrics,
    {
      type: 'grid',
      columns: 3,
      gap: 16,
    },
  );
  const sectionC = buildMetricGroupSpec(
    `${scope}_section_c`,
    'Operational KPIs',
    `Pipeline and conversion context for ${card.category}.`,
    card.sectionC.metrics,
    {
      type: 'grid',
      columns: 3,
      gap: 16,
    },
  );
  const supportRow = buildMetricGroupSpec(
    `${scope}_support_row`,
    'Support metrics',
    `Lower-visibility supporting metrics for ${card.category}.`,
    card.supportRow.metrics,
    {
      type: 'grid',
      columns: 3,
      gap: 12,
    },
  );

  const children = [primaryGroup, sectionB, sectionC, supportRow].filter(
    (child): child is CompositeTileSpec => child !== null,
  );

  return {
    id: toSpecId(scope),
    kind: 'composite',
    title: `${card.category} overview`,
    description: `Overview scorecard for ${card.category}.`,
    layout: {
      type: 'stack',
      gap: 20,
    },
    children,
  };
}

export function buildOverviewCategoryMetricBindings(
  card: OverviewCategoryCard,
): OverviewMetricBindings {
  return {
    ...collectMetricBindings([card.sectionA.hero]),
    ...(card.sectionA.support
      ? collectMetricBindings([card.sectionA.support])
      : {}),
    ...collectMetricBindings(card.sectionB.metrics),
    ...collectMetricBindings(card.sectionC.metrics),
    ...collectMetricBindings(card.supportRow.metrics),
  };
}

export function buildOverviewTotalScorecardSpec(
  card: OverviewTotalCard,
): CompositeTileSpec {
  const scope = 'overview_total_scorecard';
  const primaryGroup = buildMetricGroupSpec(
    `${scope}_primary`,
    'Headline KPIs',
    'Primary total overview metrics.',
    [card.hero, ...(card.support ? [card.support] : [])],
    {
      type: 'grid',
      columns: card.support ? 2 : 1,
      gap: 16,
    },
  );
  const secondaryGroup = buildMetricGroupSpec(
    `${scope}_secondary`,
    'Supporting KPIs',
    'Secondary total overview metrics.',
    card.secondaryMetrics,
    {
      type: 'grid',
      columns: 2,
      gap: 16,
    },
  );

  const children = [primaryGroup, secondaryGroup].filter(
    (child): child is CompositeTileSpec => child !== null,
  );

  return {
    id: toSpecId(scope),
    kind: 'composite',
    title: 'Total overview',
    description: 'Total overview scorecard.',
    layout: {
      type: 'stack',
      gap: 20,
    },
    children,
  };
}

export function buildOverviewTotalMetricBindings(
  card: OverviewTotalCard,
): OverviewMetricBindings {
  return {
    ...collectMetricBindings([card.hero]),
    ...(card.support ? collectMetricBindings([card.support]) : {}),
    ...collectMetricBindings(card.secondaryMetrics),
  };
}
