import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildNormalizedReportRequestPath,
  fetchNormalizedReport,
} from '@/hooks/use-scorecard-query';
import type { ScorecardReportPayload } from '@/lib/contracts';

describe('buildNormalizedReportRequestPath', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('issues a normalized GET request against the canonical report endpoint', async () => {
    const payload: ScorecardReportPayload = {
      reportTitle: 'Situation Room',
      reportPeriodLabel: 'Current Year',
      lastRefreshedAt: '2026-03-21T00:00:00.000Z',
      appliedFilters: {
        DateRange: ['current_year'],
      },
      categories: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(payload),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchNormalizedReport({
      Division: ['Enterprise'],
      Region: ['South', 'North'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/report?DateRange=current_year&Division=Enterprise&Region=North%2CSouth',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body');
    expect(result).toEqual(payload);
  });
});
