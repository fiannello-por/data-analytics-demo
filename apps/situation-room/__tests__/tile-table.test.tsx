import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TileTable } from '@/components/dashboard/tile-table';
import type { CategorySnapshotPayload } from '@/lib/dashboard/contracts';

describe('TileTable', () => {
  it('colors positive and negative change values in the change column', () => {
    const snapshot: CategorySnapshotPayload = {
      category: 'New Logo',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      lastRefreshedAt: '2026-03-22T00:00:00.000Z',
      tileTimings: [],
      rows: [
        {
          tileId: 'positive_row',
          label: 'Bookings $',
          sortOrder: 1,
          formatType: 'currency',
          currentValue: '$100',
          previousValue: '$80',
          pctChange: '+25%',
        },
        {
          tileId: 'negative_row',
          label: 'SQL',
          sortOrder: 2,
          formatType: 'number',
          currentValue: '8',
          previousValue: '10',
          pctChange: '-20%',
        },
        {
          tileId: 'neutral_row',
          label: 'SQO',
          sortOrder: 3,
          formatType: 'number',
          currentValue: '8',
          previousValue: '8',
          pctChange: '—',
        },
      ],
    };

    const html = renderToStaticMarkup(
      <TileTable snapshot={snapshot} selectedTileId="positive_row" />,
    );

    expect(html).toContain('class="p-2 align-middle whitespace-nowrap [&amp;:has([role=checkbox])]:pr-0 text-positive">+25%</td>');
    expect(html).toContain('class="p-2 align-middle whitespace-nowrap [&amp;:has([role=checkbox])]:pr-0 text-negative">-20%</td>');
    expect(html).toContain('class="p-2 align-middle whitespace-nowrap [&amp;:has([role=checkbox])]:pr-0 text-neutral-change">—</td>');
  });

  it('renders an inner bordered wrapper around the table content', () => {
    const snapshot: CategorySnapshotPayload = {
      category: 'New Logo',
      currentWindowLabel: 'Jan 1, 2026 - Mar 31, 2026',
      previousWindowLabel: 'Jan 1, 2025 - Mar 31, 2025',
      lastRefreshedAt: '2026-03-22T00:00:00.000Z',
      tileTimings: [],
      rows: [
        {
          tileId: 'single_row',
          label: 'SQL',
          sortOrder: 1,
          formatType: 'number',
          currentValue: '10',
          previousValue: '8',
          pctChange: '+25%',
        },
      ],
    };

    const html = renderToStaticMarkup(
      <TileTable snapshot={snapshot} selectedTileId="single_row" />,
    );

    expect(html).toContain('rounded-lg border');
  });
});
