// apps/challenger/components/closed-won-pagination.tsx

import { buildCwPageUrl, type DashboardUrlState } from '@/lib/url-state';

export function ClosedWonPagination({
  state,
  page,
  totalPageCount,
  totalResults,
}: {
  state: DashboardUrlState;
  page: number;
  totalPageCount: number;
  totalResults: number;
}) {
  if (totalPageCount <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPageCount;

  const linkStyle: React.CSSProperties = {
    padding: '4px 12px',
    border: '1px solid #ccc',
    background: '#f5f5f5',
    textDecoration: 'none',
    color: '#333',
    fontSize: 12,
  };

  const disabledStyle: React.CSSProperties = {
    ...linkStyle,
    color: '#aaa',
    pointerEvents: 'none',
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        fontSize: 12,
      }}
    >
      {hasPrev ? (
        <a href={buildCwPageUrl(state, page - 1)} style={linkStyle}>
          Prev
        </a>
      ) : (
        <span style={disabledStyle}>Prev</span>
      )}

      <span>
        Page {page} of {totalPageCount} ({totalResults} total)
      </span>

      {hasNext ? (
        <a href={buildCwPageUrl(state, page + 1)} style={linkStyle}>
          Next
        </a>
      ) : (
        <span style={disabledStyle}>Next</span>
      )}
    </nav>
  );
}
