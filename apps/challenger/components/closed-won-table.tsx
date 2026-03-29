// apps/challenger/components/closed-won-table.tsx

import { CLOSED_WON_DIMENSIONS } from '@por/dashboard-constants';
import type { ClosedWonResult } from '@/lib/closed-won-loader';

export async function ClosedWonTable({
  data,
}: {
  data: Promise<ClosedWonResult>;
}) {
  const result = await data;

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>
        {result.category} Closed Won — {result.rows.length} rows, {result.queryCount}{' '}
        queries, {result.durationMs.toFixed(0)}ms
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}
        >
          <thead>
            <tr>
              {CLOSED_WON_DIMENSIONS.map((dim) => (
                <th
                  key={dim}
                  style={{
                    border: '1px solid #ccc',
                    padding: '4px 8px',
                    textAlign: 'left',
                    background: '#f5f5f5',
                  }}
                >
                  {dim}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={CLOSED_WON_DIMENSIONS.length}
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
              result.rows.map((row, i) => (
                <tr key={i}>
                  {CLOSED_WON_DIMENSIONS.map((dim) => (
                    <td
                      key={dim}
                      style={{ border: '1px solid #ccc', padding: '4px 8px' }}
                    >
                      {row[dim] ?? ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
