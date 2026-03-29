// apps/challenger/components/category-trend.tsx

import type { TrendPoint, TrendResult } from '@/lib/trend-loader';

function TrendTable({ points, label }: { points: TrendPoint[]; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h4 style={{ marginBottom: 4 }}>{label}</h4>
      <table
        style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}
      >
        <thead>
          <tr>
            {['Week', 'Value'].map((h) => (
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
          {points.length === 0 ? (
            <tr>
              <td
                colSpan={2}
                style={{
                  border: '1px solid #ccc',
                  padding: '4px 8px',
                  color: '#999',
                }}
              >
                No data
              </td>
            </tr>
          ) : (
            points.map((pt, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {pt.week}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>
                  {pt.value}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export async function CategoryTrend({
  data,
}: {
  data: Promise<TrendResult>;
}) {
  const result = await data;
  const { category, tileId } = result;

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>
        {category} Trend ({tileId}) — {result.queryCount} queries,{' '}
        {result.durationMs.toFixed(0)}ms
      </h3>
      <div style={{ display: 'flex', gap: 16 }}>
        <TrendTable points={result.currentPoints} label="Current" />
        <TrendTable points={result.previousPoints} label="Previous" />
      </div>
    </div>
  );
}
