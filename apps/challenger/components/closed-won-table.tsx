// apps/challenger/components/closed-won-table.tsx

import { CLOSED_WON_DIMENSIONS } from '@por/dashboard-constants';
import type { ClosedWonResult } from '@/lib/closed-won-loader';
import type { DashboardUrlState } from '@/lib/url-state';
import { ClosedWonSortHeader } from './closed-won-sort-header';
import { ClosedWonPagination } from './closed-won-pagination';

export async function ClosedWonTable({
  data,
  state,
}: {
  data: Promise<ClosedWonResult>;
  state: DashboardUrlState;
}) {
  const result = await data;

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>
        {result.category} Closed Won — page {result.page} of {result.totalPageCount} ({result.totalResults} total), {result.queryCount}{' '}
        queries, {result.durationMs.toFixed(0)}ms
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}
        >
          <thead>
            <tr>
              {CLOSED_WON_DIMENSIONS.map((dim) => (
                <ClosedWonSortHeader
                  key={dim}
                  state={state}
                  field={dim}
                  label={dim}
                  currentSort={state.cwSort}
                />
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
      <ClosedWonPagination
        state={state}
        page={result.page}
        totalPageCount={result.totalPageCount}
        totalResults={result.totalResults}
      />
    </div>
  );
}
