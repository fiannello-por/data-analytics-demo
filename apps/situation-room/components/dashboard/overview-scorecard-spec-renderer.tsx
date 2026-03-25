'use client';

import * as React from 'react';
import {
  normalizeTileSpec,
  validateTileSpec,
  type CompositeTileSpec,
  type MetricTileSpec,
  type TileSpec,
} from '@por/dashboard-spec';
import { CircleHelpIcon } from 'lucide-react';
import { OverviewMetricTile } from '@/components/dashboard/overview-metric-tile';
import { ScorecardSection } from '@/components/dashboard/scorecard-section';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CATEGORY_DESCRIPTIONS } from '@/lib/dashboard/category-descriptions';
import type {
  OverviewCategoryCard,
  OverviewMetric,
  OverviewTotalCard,
} from '@/lib/dashboard/overview-model';
import {
  buildOverviewCategoryMetricBindings,
  buildOverviewCategoryScorecardSpec,
  buildOverviewTotalMetricBindings,
  buildOverviewTotalScorecardSpec,
  type OverviewMetricBindings,
} from '@/lib/dashboard-v2/specs/overview-scorecards';

function resolveMetric(
  spec: MetricTileSpec,
  metricBindings: OverviewMetricBindings,
): OverviewMetric {
  const metric = metricBindings[spec.data.key];

  if (!metric) {
    throw new Error(`Missing overview metric binding for "${spec.data.key}".`);
  }

  return metric;
}

function resolveCompositeSpec(spec: TileSpec): CompositeTileSpec {
  const validation = validateTileSpec(spec);

  if (!validation.ok) {
    throw new Error(
      `Invalid overview scorecard spec: ${validation.errors.join(', ')}`,
    );
  }

  const normalized = normalizeTileSpec(spec);

  if (normalized.kind !== 'composite') {
    throw new Error('Overview scorecards must normalize to a composite tile.');
  }

  return normalized as CompositeTileSpec;
}

function isMetricTileSpec(child: TileSpec): child is MetricTileSpec {
  return child.kind === 'metric';
}

function isCompositeTileSpec(child: TileSpec): child is CompositeTileSpec {
  return child.kind === 'composite';
}

type MetricPresentation = {
  valueClassName: string;
  labelClassName?: string;
  triggerClassName?: string;
};

function renderMetricTile(
  spec: MetricTileSpec,
  metricBindings: OverviewMetricBindings,
  presentation?: MetricPresentation,
) {
  const metric = resolveMetric(spec, metricBindings);
  const isSupportRow = spec.id.includes('_support_row_');
  const resolvedPresentation: MetricPresentation =
    presentation ??
    (isSupportRow
      ? {
          valueClassName: 'text-sm font-medium',
          labelClassName: 'text-[11px] tracking-[0.04em] text-muted-foreground/85',
          triggerClassName:
            'flex w-fit items-baseline gap-1.5 text-left outline-none',
        }
      : {
          valueClassName: 'text-2xl tracking-tight',
        });

  return (
    <OverviewMetricTile
      key={spec.id}
      metric={metric}
      valueClassName={resolvedPresentation.valueClassName}
      labelClassName={resolvedPresentation.labelClassName}
      triggerClassName={resolvedPresentation.triggerClassName}
    />
  );
}

function renderMetricGrid(
  spec: CompositeTileSpec,
  metricBindings: OverviewMetricBindings,
  className: string,
  presentation?: MetricPresentation,
) {
  const children = (spec.children ?? []).filter(isMetricTileSpec);

  if (children.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {children.map((child) =>
        renderMetricTile(child, metricBindings, presentation),
      )}
    </div>
  );
}

export function OverviewCategoryScorecardSpecRenderer({
  card,
}: {
  card: OverviewCategoryCard;
}) {
  const spec = React.useMemo(
    () => resolveCompositeSpec(buildOverviewCategoryScorecardSpec(card)),
    [card],
  );
  const metricBindings = React.useMemo(
    () => buildOverviewCategoryMetricBindings(card),
    [card],
  );
  const sections = (spec.children ?? []).filter(isCompositeTileSpec);
  const primarySection = sections[0];
  const performanceSection = sections[1];
  const qualitySection = sections[2];
  const supportRowSection = sections[3];

  return (
    <Card className="h-full border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {card.category}
        </CardTitle>
        <CardAction>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`About ${card.category}`}
                  className="rounded-full text-muted-foreground"
                />
              }
            >
              <CircleHelpIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-56 flex-col items-start gap-0.5 text-left">
              <span className="font-medium">{card.category}</span>
              <span>{CATEGORY_DESCRIPTIONS[card.category]}</span>
            </TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {primarySection ? (
          <ScorecardSection>
            {renderMetricGrid(primarySection, metricBindings, 'grid gap-4 md:grid-cols-3')}
          </ScorecardSection>
        ) : null}

        {performanceSection ? <Separator className="bg-border/60" /> : null}

        {performanceSection ? (
          <ScorecardSection>
            {renderMetricGrid(
              performanceSection,
              metricBindings,
              'grid gap-4 md:grid-cols-3',
            )}
          </ScorecardSection>
        ) : null}

        {qualitySection ? <Separator className="bg-border/60" /> : null}

        {qualitySection ? (
          <ScorecardSection>
            {renderMetricGrid(qualitySection, metricBindings, 'grid gap-4 md:grid-cols-3')}
            {supportRowSection && (supportRowSection.children?.length ?? 0) > 0 ? (
              <>
                <Separator className="bg-border/50" />
                {renderMetricGrid(
                  supportRowSection,
                  metricBindings,
                  'grid gap-3 md:grid-cols-2 xl:grid-cols-3',
                )}
              </>
            ) : null}
          </ScorecardSection>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OverviewTotalScorecardSpecRenderer({
  card,
}: {
  card: OverviewTotalCard;
}) {
  const spec = React.useMemo(
    () => resolveCompositeSpec(buildOverviewTotalScorecardSpec(card)),
    [card],
  );
  const metricBindings = React.useMemo(
    () => buildOverviewTotalMetricBindings(card),
    [card],
  );
  const sections = (spec.children ?? []).filter(isCompositeTileSpec);
  const primarySection = sections[0];
  const secondarySection = sections[1];

  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {card.category}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,0.9fr)] lg:items-start">
        {primarySection ? (
          renderMetricGrid(primarySection, metricBindings, 'grid gap-4 md:grid-cols-2', {
            valueClassName: 'text-3xl tracking-tight',
          })
        ) : (
          <div />
        )}

        <Separator className="bg-border/60 lg:hidden" />

        <div className="hidden lg:flex lg:justify-center">
          <Separator orientation="vertical" className="bg-border/60" />
        </div>

        {secondarySection ? (
          <div className="lg:pl-1">
            {renderMetricGrid(secondarySection, metricBindings, 'grid gap-4 md:grid-cols-2')}
          </div>
        ) : (
          <div />
        )}
      </CardContent>
    </Card>
  );
}
