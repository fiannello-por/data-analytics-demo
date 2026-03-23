import { describe, expect, it } from 'vitest';
import { buildOverviewBoard } from '@/lib/dashboard/overview-model';
import type { CategorySnapshotPayload } from '@/lib/dashboard/contracts';

describe('overview model', () => {
  it('abbreviates large number and currency values while preserving full values for tooltips', () => {
    const snapshot = {
      category: 'New Logo',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      lastRefreshedAt: '2026-03-22T00:00:00.000Z',
      tileTimings: [],
      rows: [
        {
          tileId: 'new_logo_bookings_amount',
          label: 'Bookings $',
          sortOrder: 1,
          formatType: 'currency',
          currentValue: '$125,000',
          previousValue: '$100,000',
          pctChange: '+25.0%',
        },
        {
          tileId: 'new_logo_bookings_count',
          label: 'Bookings #',
          sortOrder: 2,
          formatType: 'number',
          currentValue: '5,391',
          previousValue: '4,800',
          pctChange: '+12.3%',
        },
        {
          tileId: 'new_logo_annual_pacing_ytd',
          label: 'Annual Pacing (YTD)',
          sortOrder: 3,
          formatType: 'number',
          currentValue: '1,250,000',
          previousValue: '1,100,000',
          pctChange: '+13.6%',
        },
        {
          tileId: 'new_logo_close_rate',
          label: 'Close Rate',
          sortOrder: 4,
          formatType: 'percent',
          currentValue: '18.4%',
          previousValue: '17.1%',
          pctChange: '+1.3%',
        },
        {
          tileId: 'new_logo_avg_age',
          label: 'Avg Age',
          sortOrder: 5,
          formatType: 'days',
          currentValue: '24 days',
          previousValue: '28 days',
          pctChange: '-14.3%',
        },
        {
          tileId: 'new_logo_pipeline_created',
          label: 'Pipeline Created',
          sortOrder: 8,
          formatType: 'number',
          currentValue: '12,340',
          previousValue: '11,000',
          pctChange: '+12.2%',
        },
        {
          tileId: 'new_logo_avg_booked_deal',
          label: 'Avg Booked Deal',
          sortOrder: 6,
          formatType: 'currency',
          currentValue: '$14,250',
          previousValue: '$13,000',
          pctChange: '+9.6%',
        },
        {
          tileId: 'new_logo_avg_quoted_deal',
          label: 'Avg Quoted Deal',
          sortOrder: 7,
          formatType: 'currency',
          currentValue: '$19,800',
          previousValue: '$18,400',
          pctChange: '+7.6%',
        },
        {
          tileId: 'new_logo_sql',
          label: 'SQL',
          sortOrder: 9,
          formatType: 'number',
          currentValue: '938',
          previousValue: '852',
          pctChange: '+10.1%',
        },
        {
          tileId: 'new_logo_sqo',
          label: 'SQO',
          sortOrder: 10,
          formatType: 'number',
          currentValue: '223',
          previousValue: '236',
          pctChange: '-5.5%',
        },
        {
          tileId: 'new_logo_gate_1_complete',
          label: 'Gate 1 Complete',
          sortOrder: 11,
          formatType: 'number',
          currentValue: '157',
          previousValue: '149',
          pctChange: '+5.4%',
        },
        {
          tileId: 'new_logo_sdr_points',
          label: 'SDR Points',
          sortOrder: 12,
          formatType: 'number',
          currentValue: '5,391',
          previousValue: '6,468',
          pctChange: '-16.6%',
        },
        {
          tileId: 'new_logo_sqo_users',
          label: 'SQO Users',
          sortOrder: 13,
          formatType: 'number',
          currentValue: '2,358',
          previousValue: '2,646',
          pctChange: '-10.9%',
        },
      ],
    } as const satisfies CategorySnapshotPayload;

    const totalSnapshot = {
      ...snapshot,
      category: 'Total',
      rows: [
        {
          tileId: 'total_bookings_amount',
          label: 'Bookings $',
          sortOrder: 1,
          formatType: 'currency',
          currentValue: '$400,000',
          previousValue: '$360,000',
          pctChange: '+11.1%',
        },
        {
          tileId: 'total_bookings_count',
          label: 'Bookings #',
          sortOrder: 2,
          formatType: 'number',
          currentValue: '1,234',
          previousValue: '1,102',
          pctChange: '+12.0%',
        },
        {
          tileId: 'total_annual_pacing_ytd',
          label: 'Annual Pacing (YTD)',
          sortOrder: 3,
          formatType: 'number',
          currentValue: '4,200,000',
          previousValue: '3,900,000',
          pctChange: '+7.7%',
        },
        {
          tileId: 'total_one_time_revenue',
          label: 'One-time Revenue',
          sortOrder: 4,
          formatType: 'currency',
          currentValue: '$90,000',
          previousValue: '$110,000',
          pctChange: '-18.2%',
        },
      ],
    } as const satisfies CategorySnapshotPayload;

    const board = buildOverviewBoard([
      snapshot,
      { ...snapshot, category: 'Expansion' },
      { ...snapshot, category: 'Migration' },
      { ...snapshot, category: 'Renewal' },
      totalSnapshot,
    ]);

    expect(board.categoryCards[0].sectionA.hero.value).toBe('$125K');
    expect(board.categoryCards[0].sectionA.hero.fullValue).toBe('$125,000');
    expect(board.categoryCards[0].sectionA.hero.previousValue).toBe('$100,000');
    expect(board.categoryCards[0].sectionA.hero.description).toContain('Total booked revenue');
    expect(board.categoryCards[0].sectionA.hero.calculation).toContain('booked ACV');
    expect(board.categoryCards[0].sectionA.support?.value).toBe('5.4K');
    expect(board.categoryCards[0].sectionB.metrics[1]?.value).toBe('18.4%');
    expect(board.categoryCards[0].sectionC.metrics[0]?.value).toBe('12.3K');
    expect(board.categoryCards[0].supportRow.metrics.find((metric) => metric.label === 'SDR Points')?.value).toBe('5.4K');
    expect(board.totalCard.hero.value).toBe('$400K');
    expect(board.totalCard.secondaryMetrics[1]?.value).toBe('$90K');
  });
});
