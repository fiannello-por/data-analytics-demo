// apps/challenger/components/closed-won-sort-header.tsx

import { buildCwSortUrl, type ClosedWonSort, type DashboardUrlState } from '@/lib/url-state';

export function ClosedWonSortHeader({
  state,
  field,
  label,
  currentSort,
}: {
  state: DashboardUrlState;
  field: string;
  label: string;
  currentSort: ClosedWonSort;
}) {
  const isActive = currentSort.field === field;
  const arrow = isActive ? (currentSort.direction === 'desc' ? ' \u2193' : ' \u2191') : '';

  return (
    <th
      style={{
        border: '1px solid #ccc',
        padding: '4px 8px',
        textAlign: 'left',
        background: '#f5f5f5',
        whiteSpace: 'nowrap',
      }}
    >
      <a
        href={buildCwSortUrl(state, field)}
        style={{
          textDecoration: 'none',
          color: isActive ? '#000' : '#555',
          fontWeight: isActive ? 700 : 600,
          cursor: 'pointer',
        }}
      >
        {label}{arrow}
      </a>
    </th>
  );
}
