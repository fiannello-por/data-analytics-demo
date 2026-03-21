import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type {
  AdapterResult,
  FilterDictionaryPayload,
} from '@/lib/data-adapters/types';
import type { ScorecardReportPayload } from '@/lib/contracts';

const getScorecardReportMock = vi.fn();
const getFilterDictionaryMock = vi.fn();

vi.mock('@/lib/data-adapters', () => ({
  getScorecardDataAdapter: () => ({
    getScorecardReport: getScorecardReportMock,
    getFilterDictionary: getFilterDictionaryMock,
  }),
}));

const unstableCacheMock = vi.fn((fn) => fn);

vi.mock('next/cache', () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock('server-only', () => ({}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('server loaders', () => {
  it('delegates scorecard report loading through the cached adapter wrapper', async () => {
    const result: AdapterResult<ScorecardReportPayload> = {
      data: {
        reportTitle: 'Situation Room',
        reportPeriodLabel: 'Current Year',
        lastRefreshedAt: '2026-03-21T00:00:00.000Z',
        appliedFilters: {
          Division: ['Enterprise'],
          Region: ['North'],
          DateRange: ['current_year'],
        },
        categories: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed: 42,
      },
    };

    getScorecardReportMock.mockResolvedValueOnce(result);

    const { getScorecardReport } = await import(
      '@/lib/server/get-scorecard-report'
    );

    const response = await getScorecardReport({
      Division: ['Enterprise'],
      Region: ['North'],
    });

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      [
        'report-payload',
        JSON.stringify({
          DateRange: ['current_year'],
          Division: ['Enterprise'],
          Region: ['North'],
        }),
      ],
      {
        revalidate: 60,
        tags: ['report-payload'],
      },
    );
    expect(getScorecardReportMock).toHaveBeenCalledWith({
      Division: ['Enterprise'],
      Region: ['North'],
    });
    expect(response).toEqual(result);
  });

  it('delegates filter dictionary loading through the cached adapter wrapper', async () => {
    const result: AdapterResult<FilterDictionaryPayload> = {
      data: {
        key: 'Division',
        refreshedAt: '2026-03-21T00:00:00.000Z',
        options: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
      },
    };

    getFilterDictionaryMock.mockResolvedValueOnce(result);

    const { getFilterDictionary } = await import(
      '@/lib/server/get-filter-dictionary'
    );

    const response = await getFilterDictionary('Division');

    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ['filter-dictionaries', 'Division'],
      {
        revalidate: 900,
        tags: ['filter-dictionaries'],
      },
    );
    expect(getFilterDictionaryMock).toHaveBeenCalledWith('Division');
    expect(response).toEqual(result);
  });

  it('returns report payloads from the report route and forwards adapter headers', async () => {
    const adapterResult: AdapterResult<ScorecardReportPayload> = {
      data: {
        reportTitle: 'Situation Room',
        reportPeriodLabel: 'Current Year',
        lastRefreshedAt: '2026-03-21T00:00:00.000Z',
        appliedFilters: {
          Division: ['Enterprise'],
          Region: ['North', 'South'],
          DateRange: ['current_year'],
        },
        categories: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 2,
        bytesProcessed: 128,
      },
    };

    const scorecardLoader = await import('@/lib/server/get-scorecard-report');
    vi.spyOn(scorecardLoader, 'getScorecardReport').mockResolvedValueOnce(
      adapterResult,
    );

    const { GET } = await import('../app/api/report/route');
    const request = new NextRequest(
      'http://localhost/api/report?Division=Enterprise&Region=North,South',
    );

    const response = await GET(request);

    expect(scorecardLoader.getScorecardReport).toHaveBeenCalledWith({
      Division: ['Enterprise'],
      Region: ['North', 'South'],
    });
    expect(await response.json()).toEqual(adapterResult.data);
    expect(response.headers.get('x-situation-room-query-count')).toBe('2');
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-bytes-processed')).toBe(
      '128',
    );
  });

  it('returns dictionary payloads from the filter dictionary route and forwards adapter headers', async () => {
    const adapterResult: AdapterResult<FilterDictionaryPayload> = {
      data: {
        key: 'Division',
        refreshedAt: '2026-03-21T00:00:00.000Z',
        options: [],
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
      },
    };

    const dictionaryLoader = await import(
      '@/lib/server/get-filter-dictionary'
    );
    vi.spyOn(dictionaryLoader, 'getFilterDictionary').mockResolvedValueOnce(
      adapterResult,
    );

    const { GET } = await import('../app/api/filter-dictionaries/[key]/route');

    const response = await GET(
      new NextRequest('http://localhost/api/filter-dictionaries/Division'),
      {
      params: Promise.resolve({ key: 'Division' }),
    },
    );

    expect(dictionaryLoader.getFilterDictionary).toHaveBeenCalledWith(
      'Division',
    );
    expect(await response.json()).toEqual(adapterResult.data);
    expect(response.headers.get('x-situation-room-query-count')).toBe('1');
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-bytes-processed')).toBeNull();
  });

  it('rejects repeated report query params with a 400', async () => {
    const { GET } = await import('../app/api/report/route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/report?Division=Enterprise&Division=SMB',
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Repeated query parameter "Division" is not supported.',
    });
  });

  it('rejects unsupported report date ranges with a 400', async () => {
    const { GET } = await import('../app/api/report/route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/report?DateRange=last_30_days',
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Unsupported DateRange filter: last_30_days. Only current_year is supported.',
    });
  });

  it('rejects unsupported filter dictionary keys with a 400', async () => {
    const { GET } = await import('../app/api/filter-dictionaries/[key]/route');
    const response = await GET(
      new NextRequest('http://localhost/api/filter-dictionaries/Bogus'),
      {
        params: Promise.resolve({ key: 'Bogus' }),
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Unsupported filter dictionary key: Bogus.',
    });
  });
});
