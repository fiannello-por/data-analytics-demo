// apps/challenger/components/category-scorecard.tsx

import type { ScorecardResult } from '@/lib/scorecard-loader';

export async function CategoryScorecard({
  data,
}: {
  data: Promise<ScorecardResult>;
}) {
  const result = await data;

  return (
    <div data-testid="section-ready">
      <h3 style={{ marginBottom: 4 }}>
        {result.category} Scorecard — {result.tiles.length} tiles, {result.queryCount}{' '}
        queries, {result.durationMs.toFixed(0)}ms
      </h3>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            {['Tile ID', 'Current', 'Previous', '% Change'].map((h) => (
              <th
                key={h}
                style={{
                  border: '1px solid #ccc',
                  padding: '4px 8px',
                  textAlign: 'left',
                  background: '#f5f5f5',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.tiles.map((tile) => (
            <tr key={tile.tileId}>
              <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                {tile.tileId}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                {tile.currentValue}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                {tile.previousValue}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                {tile.pctChange !== '' ? `${tile.pctChange}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
