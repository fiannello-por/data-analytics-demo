import { describe, expect, it } from 'vitest';
import { buildClosedWonPrefetchUrls } from '@/components/dashboard/dashboard-shell';

describe('dashboard closed won prefetching', () => {
  it('builds prefetch urls for every category using the current filter/date state', () => {
    const urls = buildClosedWonPrefetchUrls('/api/dashboard-v2', {
      filters: {
        Owner: ['Abby Arrigoni'],
        Segment: ['Enterprise'],
      },
      dateRange: {
        startDate: '2026-01-01',
        endDate: '2026-03-26',
      },
    });

    expect(urls).toEqual([
      '/api/dashboard-v2/closed-won/New%20Logo?category=New+Logo&startDate=2026-01-01&endDate=2026-03-26&Owner=Abby+Arrigoni&Segment=Enterprise',
      '/api/dashboard-v2/closed-won/Expansion?category=Expansion&startDate=2026-01-01&endDate=2026-03-26&Owner=Abby+Arrigoni&Segment=Enterprise',
      '/api/dashboard-v2/closed-won/Migration?category=Migration&startDate=2026-01-01&endDate=2026-03-26&Owner=Abby+Arrigoni&Segment=Enterprise',
      '/api/dashboard-v2/closed-won/Renewal?category=Renewal&startDate=2026-01-01&endDate=2026-03-26&Owner=Abby+Arrigoni&Segment=Enterprise',
      '/api/dashboard-v2/closed-won/Total?category=Total&startDate=2026-01-01&endDate=2026-03-26&Owner=Abby+Arrigoni&Segment=Enterprise',
    ]);
  });
});
