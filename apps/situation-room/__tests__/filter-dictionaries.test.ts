import { describe, expect, it, vi } from 'vitest';
import { FILTER_DEFINITIONS } from '@/lib/filters';
import { loadFilterDictionaries } from '@/components/filter-rail';
import { parseCommaSeparatedValues } from '@/hooks/use-filters';

describe('loadFilterDictionaries', () => {
  it('preloads string filter dictionaries once in filter definition order', async () => {
    const stringFilterKeys = FILTER_DEFINITIONS.filter(
      (filter) => filter.type === 'string',
    ).map((filter) => filter.key);

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return new Response(
        JSON.stringify({
          key: url.split('/').at(-1),
          refreshedAt: '2026-03-21T00:00:00.000Z',
          options: [
            {
              value: url,
              label: url,
              sortOrder: 1,
            },
          ],
        }),
        {
          headers: { 'content-type': 'application/json' },
        },
      );
    });

    const result = await loadFilterDictionaries(fetchImpl as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledTimes(stringFilterKeys.length);
    expect(fetchImpl.mock.calls.map(([input]) => String(input))).toEqual(
      stringFilterKeys.map(
        (key) => `/api/filter-dictionaries/${encodeURIComponent(key)}`,
      ),
    );
    expect(Object.keys(result)).toEqual(stringFilterKeys);
  });

  it('does not poison a later load after a failed request', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        return new Response(
          JSON.stringify({
            key: url.split('/').at(-1),
            refreshedAt: '2026-03-21T00:00:00.000Z',
            options: [],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        );
      });

    await expect(
      loadFilterDictionaries(fetchImpl as typeof fetch),
    ).rejects.toThrow('temporary failure');

    await expect(
      loadFilterDictionaries(fetchImpl as typeof fetch),
    ).resolves.toEqual(
      expect.objectContaining({
        Division: [],
      }),
    );
  });
});

describe('parseCommaSeparatedValues', () => {
  it('trims whitespace and removes empty entries', () => {
    expect(parseCommaSeparatedValues('  North, , South ,  ')).toEqual([
      'North',
      'South',
    ]);
  });
});
