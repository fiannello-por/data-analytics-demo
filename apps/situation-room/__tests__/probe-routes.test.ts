import { afterEach, describe, expect, it, vi } from 'vitest';
const getProbePingMock = vi.fn();
const getProbeSummaryMock = vi.fn();
const getProbeDivisionFilterOptionsMock = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('@/lib/server/architecture-probes', () => ({
  getProbePing: getProbePingMock,
  getProbeSummary: getProbeSummaryMock,
  getProbeDivisionFilterOptions: getProbeDivisionFilterOptionsMock,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('probe routes', { timeout: 10000 }, () => {
  it('returns a ping payload with headers', async () => {
    getProbePingMock.mockResolvedValueOnce({
      data: {
        ok: true,
        refreshedAt: '2026-03-21T00:00:00.000Z',
        pingValue: 1,
        table: 'scorecard_test.scorecard_daily',
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed: 11,
        cacheMode: 'off',
      },
    });

    const { GET } = await import('../app/api/probe/ping/route');
    const response = await GET(
      new Request('http://localhost/api/probe/ping?cache=off'),
    );

    expect(getProbePingMock).toHaveBeenCalledWith(undefined, {
      cacheMode: 'off',
    });
    expect(await response.json()).toEqual({
      ok: true,
      refreshedAt: '2026-03-21T00:00:00.000Z',
      pingValue: 1,
      table: 'scorecard_test.scorecard_daily',
    });
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-query-count')).toBe('1');
    expect(response.headers.get('x-situation-room-bytes-processed')).toBe('11');
    expect(response.headers.get('x-situation-room-cache-mode')).toBe('off');
    expect(response.headers.get('x-situation-room-server-ms')).toBeTruthy();
  });

  it('returns a source summary payload with headers', async () => {
    getProbeSummaryMock.mockResolvedValueOnce({
      data: {
        dataset: 'scorecard_test',
        table: 'scorecard_daily',
        refreshedAt: '2026-03-21T00:00:00.000Z',
        rowCount: 12,
        divisionCount: 3,
        minReportDate: '2026-03-01',
        maxReportDate: '2026-03-21',
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed: 99,
        cacheMode: 'auto',
      },
    });

    const { GET } = await import('../app/api/probe/summary/route');
    const response = await GET(
      new Request('http://localhost/api/probe/summary?cache=auto'),
    );

    expect(getProbeSummaryMock).toHaveBeenCalledWith(undefined, {
      cacheMode: 'auto',
    });
    expect(await response.json()).toEqual({
      dataset: 'scorecard_test',
      table: 'scorecard_daily',
      refreshedAt: '2026-03-21T00:00:00.000Z',
      rowCount: 12,
      divisionCount: 3,
      minReportDate: '2026-03-01',
      maxReportDate: '2026-03-21',
    });
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-query-count')).toBe('1');
    expect(response.headers.get('x-situation-room-bytes-processed')).toBe('99');
    expect(response.headers.get('x-situation-room-cache-mode')).toBe('auto');
    expect(response.headers.get('x-situation-room-server-ms')).toBeTruthy();
  });

  it('rejects an unsupported cache mode before running a probe', async () => {
    const { GET } = await import('../app/api/probe/summary/route');
    const response = await GET(
      new Request('http://localhost/api/probe/summary?cache=nope'),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Unsupported probe cache mode: nope.',
    });
    expect(getProbeSummaryMock).not.toHaveBeenCalled();
  });

  it('returns Division filter options from the source probe route', async () => {
    getProbeDivisionFilterOptionsMock.mockResolvedValueOnce({
      data: {
        key: 'Division',
        refreshedAt: '2026-03-21T00:00:00.000Z',
        optionCount: 1,
        options: [
          { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
        ],
      },
      meta: {
        source: 'bigquery',
        queryCount: 1,
        bytesProcessed: 88,
        cacheMode: 'off',
      },
    });

    const { GET } = await import(
      '../app/api/probe/filter-options/[key]/route'
    );
    const response = await GET(
      new Request('http://localhost/api/probe/filter-options/Division?cache=off'),
      { params: Promise.resolve({ key: 'Division' }) },
    );

    expect(getProbeDivisionFilterOptionsMock).toHaveBeenCalledWith('Division', undefined, {
      cacheMode: 'off',
    });
    expect(await response.json()).toEqual({
      key: 'Division',
      refreshedAt: '2026-03-21T00:00:00.000Z',
      optionCount: 1,
      options: [
        { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
      ],
    });
    expect(response.headers.get('x-situation-room-source')).toBe('bigquery');
    expect(response.headers.get('x-situation-room-query-count')).toBe('1');
    expect(response.headers.get('x-situation-room-bytes-processed')).toBe('88');
    expect(response.headers.get('x-situation-room-cache-mode')).toBe('off');
    expect(response.headers.get('x-situation-room-server-ms')).toBeTruthy();
  });
});
