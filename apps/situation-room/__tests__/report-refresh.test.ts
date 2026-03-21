import { describe, expect, it } from 'vitest';
import { buildNormalizedReportRequestPath } from '@/hooks/use-scorecard-query';

describe('buildNormalizedReportRequestPath', () => {
  it('returns the same report URL for logically equivalent filter orderings', () => {
    const left = buildNormalizedReportRequestPath({
      Division: ['Enterprise'],
      Region: ['South', 'North'],
    });

    const right = buildNormalizedReportRequestPath({
      Region: ['North', 'South'],
      Division: ['Enterprise'],
    });

    expect(left).toBe(right);
    expect(left).toBe(
      '/api/report?DateRange=current_year&Division=Enterprise&Region=North%2CSouth',
    );
  });
});
