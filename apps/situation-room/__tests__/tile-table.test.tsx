import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TableTileSpec } from '@por/dashboard-spec';
import { TileTable } from '@/components/dashboard/tile-table';

describe('TileTable', () => {
  const columns: TableTileSpec['visualization']['columns'] = [
    { field: 'label', label: 'Metric' },
    { field: 'currentValue', label: 'Current period' },
    { field: 'previousValue', label: 'Previous year' },
    { field: 'pctChange', label: 'Change' },
  ];

  it('colors positive and negative change values in the change column', () => {
    const rows = [
      {
        tileId: 'positive_row',
        label: 'Bookings $',
        currentValue: '$100',
        previousValue: '$80',
        pctChange: '+25%',
      },
      {
        tileId: 'negative_row',
        label: 'SQL',
        currentValue: '8',
        previousValue: '10',
        pctChange: '-20%',
      },
      {
        tileId: 'neutral_row',
        label: 'SQO',
        currentValue: '8',
        previousValue: '8',
        pctChange: '—',
      },
    ];

    const html = renderToStaticMarkup(
      <TileTable
        columns={columns}
        rows={rows}
        selectedTileId="positive_row"
      />,
    );

    expect(html).toContain(
      'class="p-2 align-middle whitespace-nowrap [&amp;:has([role=checkbox])]:pr-0 text-positive">+25%</td>',
    );
    expect(html).toContain(
      'class="p-2 align-middle whitespace-nowrap [&amp;:has([role=checkbox])]:pr-0 text-negative">-20%</td>',
    );
    expect(html).toContain(
      'class="p-2 align-middle whitespace-nowrap [&amp;:has([role=checkbox])]:pr-0 text-neutral-change">—</td>',
    );
  });

  it('renders table content without owning its own chrome wrapper', () => {
    const rows = [
      {
        tileId: 'single_row',
        label: 'SQL',
        currentValue: '10',
        previousValue: '8',
        pctChange: '+25%',
      },
    ];

    const html = renderToStaticMarkup(
      <TileTable columns={columns} rows={rows} selectedTileId="single_row" />,
    );

    expect(html).not.toContain('rounded-lg border');
  });
});
