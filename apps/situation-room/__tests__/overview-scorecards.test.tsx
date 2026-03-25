import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateTileSpec } from '@por/dashboard-spec';
import { CategoryScorecard } from '@/components/dashboard/category-scorecard';
import { TotalScorecard } from '@/components/dashboard/total-scorecard';
import {
  buildOverviewCategoryScorecardSpec,
  buildOverviewTotalScorecardSpec,
} from '@/lib/dashboard-v2/specs/overview-scorecards';
import type {
  OverviewCategoryCard,
  OverviewTotalCard,
} from '@/lib/dashboard/overview-model';

describe('Overview scorecards', () => {
  it('renders section separators and keeps deltas next to KPI values', () => {
    const card: OverviewCategoryCard = {
      category: 'New Logo',
      sectionA: {
        id: 'section-a',
        hero: {
          tileId: 'bookings_amount',
          label: 'Bookings $',
          value: '$100K',
          fullValue: '$100,000',
          previousValue: '$88,900',
          delta: '+12.5%',
          formatType: 'currency',
          description: 'Booked revenue.',
          calculation: 'Current booked revenue in the selected period.',
        },
        support: {
          tileId: 'bookings_count',
          label: 'Bookings #',
          value: '42',
          fullValue: '42',
          previousValue: '39',
          delta: '+8.1%',
          formatType: 'number',
          description: 'Booked opportunity count.',
          calculation: 'Booked opportunities in the selected period.',
        },
      },
      sectionB: {
        id: 'section-b',
        metrics: [
          {
            tileId: 'annual_pacing',
            label: 'Annual Pacing (YTD)',
            value: '$1.2M',
            fullValue: '$1,200,000',
            previousValue: '$1,100,000',
            delta: '+4.2%',
            formatType: 'currency',
            description: 'Pacing view.',
            calculation: 'Annualized YTD result.',
          },
          {
            tileId: 'close_rate',
            label: 'Close Rate',
            value: '18.4%',
            fullValue: '18.4%',
            previousValue: '17.2%',
            delta: '+1.2%',
            formatType: 'percent',
            description: 'Conversion rate.',
            calculation: 'Bookings divided by qualified opps.',
          },
          {
            tileId: 'avg_age',
            label: 'Avg Age',
            value: '24d',
            fullValue: '24 days',
            previousValue: '26 days',
            delta: '-2.0%',
            formatType: 'days',
            description: 'Average age.',
            calculation: 'Mean age of contributing opps.',
          },
        ],
      },
      sectionC: {
        id: 'section-c',
        metrics: [
          {
            tileId: 'pipeline_created',
            label: 'Pipeline Created',
            value: '$2.4M',
            fullValue: '$2,400,000',
            previousValue: '$2,196,000',
            delta: '+9.3%',
            formatType: 'currency',
            description: 'Created pipeline.',
            calculation: 'Pipeline created in period.',
          },
          {
            tileId: 'avg_booked_deal',
            label: 'Avg Booked Deal',
            value: '$14K',
            fullValue: '$14,000',
            previousValue: '$13,592',
            delta: '+3.0%',
            formatType: 'currency',
            description: 'Average booked deal size.',
            calculation: 'Booked revenue divided by booked opps.',
          },
          {
            tileId: 'avg_quoted_deal',
            label: 'Avg Quoted Deal',
            value: '$19K',
            fullValue: '$19,000',
            previousValue: '$19,289',
            delta: '-1.5%',
            formatType: 'currency',
            description: 'Average quoted deal size.',
            calculation: 'Quoted revenue divided by quoted opps.',
          },
        ],
      },
      supportRow: {
        metrics: [
          {
            tileId: 'sql',
            label: 'SQL',
            value: '32',
            fullValue: '32',
            previousValue: '30',
            delta: '+7.0%',
            formatType: 'number',
            description: 'SQL count.',
            calculation: 'SQLs in period.',
          },
        ],
      },
    };

    const html = renderToStaticMarkup(<CategoryScorecard card={card} />);

    expect(
      (html.match(/data-slot="separator"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(3);
    expect(html).toContain('aria-label="About New Logo"');
    expect(html).toContain('grid gap-4 md:grid-cols-3');
    expect(html).toContain(
      'flex w-fit items-baseline gap-2 text-left outline-none',
    );
    expect(html).toContain('text-2xl tracking-tight');
    expect(html).not.toContain('text-4xl');
  });

  it('builds a valid shared spec for category scorecards', () => {
    const card: OverviewCategoryCard = {
      category: 'New Logo',
      sectionA: {
        id: 'section-a',
        hero: {
          tileId: 'bookings_amount',
          label: 'Bookings $',
          value: '$100K',
          fullValue: '$100,000',
          previousValue: '$88,900',
          delta: '+12.5%',
          formatType: 'currency',
          description: 'Booked revenue.',
          calculation: 'Current booked revenue in the selected period.',
        },
        support: {
          tileId: 'bookings_count',
          label: 'Bookings #',
          value: '42',
          fullValue: '42',
          previousValue: '39',
          delta: '+8.1%',
          formatType: 'number',
          description: 'Booked opportunity count.',
          calculation: 'Booked opportunities in the selected period.',
        },
      },
      sectionB: {
        id: 'section-b',
        metrics: [
          {
            tileId: 'annual_pacing',
            label: 'Annual Pacing (YTD)',
            value: '$1.2M',
            fullValue: '$1,200,000',
            previousValue: '$1,100,000',
            delta: '+4.2%',
            formatType: 'currency',
            description: 'Pacing view.',
            calculation: 'Annualized YTD result.',
          },
        ],
      },
      sectionC: {
        id: 'section-c',
        metrics: [
          {
            tileId: 'pipeline_created',
            label: 'Pipeline Created',
            value: '$2.4M',
            fullValue: '$2,400,000',
            previousValue: '$2,196,000',
            delta: '+9.3%',
            formatType: 'currency',
            description: 'Created pipeline.',
            calculation: 'Pipeline created in period.',
          },
        ],
      },
      supportRow: {
        metrics: [
          {
            tileId: 'sql',
            label: 'SQL',
            value: '32',
            fullValue: '32',
            previousValue: '30',
            delta: '+7.0%',
            formatType: 'number',
            description: 'SQL count.',
            calculation: 'SQLs in period.',
          },
        ],
      },
    };

    const spec = buildOverviewCategoryScorecardSpec(card);
    const validation = validateTileSpec(spec);

    expect(validation.ok).toBe(true);
    expect(spec.kind).toBe('composite');
    expect(spec.children).toHaveLength(4);
    expect(spec.children[0]?.kind).toBe('composite');
  });

  it('uses the same restrained KPI hierarchy in the total scorecard', () => {
    const card: OverviewTotalCard = {
      category: 'Total',
      hero: {
        tileId: 'total_bookings_amount',
        label: 'Bookings $',
        value: '$400K',
        fullValue: '$400,000',
        previousValue: '$362,000',
        delta: '+10.5%',
        formatType: 'currency',
        description: 'Booked revenue.',
        calculation: 'Current booked revenue in the selected period.',
      },
      support: {
        tileId: 'total_bookings_count',
        label: 'Bookings #',
        value: '130',
        fullValue: '130',
        previousValue: '122',
        delta: '+6.2%',
        formatType: 'number',
        description: 'Booked opportunity count.',
        calculation: 'Booked opportunities in the selected period.',
      },
      secondaryMetrics: [
        {
          tileId: 'annual_pacing',
          label: 'Annual Pacing (YTD)',
          value: '$4.6M',
          fullValue: '$4,600,000',
          previousValue: '$4,364,000',
          delta: '+5.4%',
          formatType: 'currency',
          description: 'Pacing view.',
          calculation: 'Annualized YTD result.',
        },
        {
          tileId: 'one_time_revenue',
          label: 'One-time Revenue',
          value: '$90K',
          fullValue: '$90,000',
          previousValue: '$90,909',
          delta: '-1.0%',
          formatType: 'currency',
          description: 'One-time revenue.',
          calculation: 'Revenue recognized as non-recurring.',
        },
      ],
    };

    const html = renderToStaticMarkup(<TotalScorecard card={card} />);

    expect(
      (html.match(/data-slot="separator"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
    expect(html).toContain(
      'flex w-fit items-baseline gap-2 text-left outline-none',
    );
    expect(html).toContain('text-3xl tracking-tight');
    expect(html).not.toContain('text-4xl');
  });

  it('builds a valid shared spec for the total scorecard', () => {
    const card: OverviewTotalCard = {
      category: 'Total',
      hero: {
        tileId: 'total_bookings_amount',
        label: 'Bookings $',
        value: '$400K',
        fullValue: '$400,000',
        previousValue: '$362,000',
        delta: '+10.5%',
        formatType: 'currency',
        description: 'Booked revenue.',
        calculation: 'Current booked revenue in the selected period.',
      },
      support: {
        tileId: 'total_bookings_count',
        label: 'Bookings #',
        value: '130',
        fullValue: '130',
        previousValue: '122',
        delta: '+6.2%',
        formatType: 'number',
        description: 'Booked opportunity count.',
        calculation: 'Booked opportunities in the selected period.',
      },
      secondaryMetrics: [
        {
          tileId: 'annual_pacing',
          label: 'Annual Pacing (YTD)',
          value: '$4.6M',
          fullValue: '$4,600,000',
          previousValue: '$4,364,000',
          delta: '+5.4%',
          formatType: 'currency',
          description: 'Pacing view.',
          calculation: 'Annualized YTD result.',
        },
        {
          tileId: 'one_time_revenue',
          label: 'One-time Revenue',
          value: '$90K',
          fullValue: '$90,000',
          previousValue: '$90,909',
          delta: '-1.0%',
          formatType: 'currency',
          description: 'One-time revenue.',
          calculation: 'Revenue recognized as non-recurring.',
        },
      ],
    };

    const spec = buildOverviewTotalScorecardSpec(card);
    const validation = validateTileSpec(spec);

    expect(validation.ok).toBe(true);
    expect(spec.kind).toBe('composite');
    expect(spec.children).toHaveLength(2);
  });
});
