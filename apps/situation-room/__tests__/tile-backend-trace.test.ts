import { describe, expect, it } from 'vitest';

import { buildTileBackendTrace } from '@/lib/server/v2/tile-backend-trace';

describe('buildTileBackendTrace', () => {
  it('includes a GitHub model URL in this repo context', async () => {
    const trace = await buildTileBackendTrace({
      kind: 'single',
      includes: ['Bookings $'],
      executions: [
        {
          label: 'Current window',
          semanticRequest: {
            model: 'sales_dashboard_v2_opportunity_base',
            measures: ['bookings_amount'],
          },
          result: {
            rows: [],
            meta: {
              source: 'lightdash',
              model: 'sales_dashboard_v2_opportunity_base',
              queryCount: 1,
              compileDurationMs: 1,
              executionDurationMs: 1,
              compiledSql: 'select 1',
            },
          },
        },
      ],
    });

    expect(trace.githubModelUrl).toContain(
      'github.com/fiannello-por/data-analytics-demo/blob/',
    );
    expect(trace.githubModelUrl).toContain(
      '/lightdash/models/sales_dashboard_v2_opportunity_base.yml',
    );
  });
});
