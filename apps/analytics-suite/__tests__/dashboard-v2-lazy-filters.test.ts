import { describe, expect, it, vi } from 'vitest';

describe('dashboard v2 lazy filter dictionaries', () => {
  it('fetches a filter dictionary from the dashboard-v2 route on demand', async () => {
    const payload = {
      filterKey: 'Division',
      options: [{ value: 'Enterprise', label: 'Enterprise', sortOrder: 1 }],
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return payload;
      },
    }));

    const { fetchFilterDictionary } =
      await import('@/lib/dashboard/filter-dictionary-client');
    const result = await fetchFilterDictionary(
      '/api/dashboard-v2',
      'Division',
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dashboard-v2/filter-dictionaries/Division',
      {
        headers: { Accept: 'application/json' },
      },
    );
    expect(result).toEqual(payload);
  });
});
