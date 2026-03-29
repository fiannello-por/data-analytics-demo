// apps/challenger/components/category-scorecard.tsx

import { getCategoryTiles } from '@por/dashboard-constants';
import type { Category } from '@por/dashboard-constants';
import { loadScorecard } from '@/lib/scorecard-loader';
import { defaultDateRange, defaultPreviousDateRange } from '@/lib/query-builder';
import type { ProbeCacheMode } from '@/lib/cache-mode';

export async function CategoryScorecard({
  category,
  cacheMode,
}: {
  category: Category;
  cacheMode: ProbeCacheMode;
}) {
  const tileIds = getCategoryTiles(category).map((t) => t.tileId);
  const result = await loadScorecard(
    category,
    tileIds,
    {},
    defaultDateRange(),
    defaultPreviousDateRange(),
    cacheMode,
  );

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>
        {category} Scorecard — {result.tiles.length} tiles, {result.queryCount}{' '}
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
