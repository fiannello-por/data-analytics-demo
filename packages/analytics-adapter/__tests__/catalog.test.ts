import { describe, expect, it, vi } from 'vitest';

import { createLightdashProvider } from '../src';

describe('Lightdash catalog', () => {
  it('normalizes Lightdash table metadata into semantic catalog entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          fields: [
            {
              name: 'bookings_amount',
              label: 'Bookings $',
              fieldType: 'metric',
              tableName: 'sales_dashboard_v2_opportunity_base',
              description: 'Booked ACV.',
            },
            {
              name: 'division',
              label: 'Division',
              fieldType: 'dimension',
              tableName: 'sales_dashboard_v2_opportunity_base',
              description: 'Sales division.',
            },
          ],
        },
      }),
    });

    const provider = createLightdashProvider({
      baseUrl: 'https://lightdash.example.com',
      projectUuid: 'project-123',
      apiKey: 'secret',
      fetch: fetchMock,
    });

    const catalog = await provider.getCatalogEntries?.({
      model: 'sales_dashboard_v2_opportunity_base',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://lightdash.example.com/api/v1/projects/project-123/dataCatalog/sales_dashboard_v2_opportunity_base/metadata',
      expect.any(Object),
    );
    expect(catalog).toEqual([
      {
        model: 'sales_dashboard_v2_opportunity_base',
        field: 'bookings_amount',
        label: 'Bookings $',
        fieldType: 'metric',
        description: 'Booked ACV.',
      },
      {
        model: 'sales_dashboard_v2_opportunity_base',
        field: 'division',
        label: 'Division',
        fieldType: 'dimension',
        description: 'Sales division.',
      },
    ]);
  });
});
