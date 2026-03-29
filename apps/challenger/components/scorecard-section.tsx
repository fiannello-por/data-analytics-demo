'use client';

// apps/challenger/components/scorecard-section.tsx

import type { Category, DashboardFilters, DateRange } from '@por/dashboard-constants';
import { findTileDefinition } from '@por/dashboard-constants';

import { useScorecard } from '@/lib/query-hooks';

import { RefreshingIndicator } from './refreshing-indicator';
import { SectionError } from './section-error';
import { SectionSkeleton } from './section-skeleton';

type ScorecardSectionProps = {
  category: Category;
  filters: DashboardFilters;
  dateRange: DateRange;
  selectedTileId: string | undefined;
  onTileSelect: (tileId: string) => void;
  enabled: boolean;
};

export function ScorecardSection({
  category,
  filters,
  dateRange,
  selectedTileId,
  onTileSelect,
  enabled,
}: ScorecardSectionProps) {
  const { data, isPending, isFetching, isError, error, refetch } =
    useScorecard(category, filters, dateRange, { enabled });

  if (isPending) {
    return <SectionSkeleton height={200} label="scorecard" />;
  }

  if (isError) {
    return (
      <SectionError
        message={
          error instanceof Error
            ? error.message
            : 'Failed to load scorecard data'
        }
        onRetry={() => void refetch()}
        staleContent={data ? renderTable(data.tiles) : undefined}
      />
    );
  }

  const content = renderTable(data.tiles);

  if (isFetching) {
    return <RefreshingIndicator isRefreshing>{content}</RefreshingIndicator>;
  }

  return content;

  // ── Table renderer ──────────────────────────────────────────────────────

  function renderTable(
    tiles: {
      tileId: string;
      currentValue: string;
      previousValue: string;
      pctChange: string;
    }[],
  ) {
    return (
      <div data-testid="section-ready">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              <th style={thStyle}>Current</th>
              <th style={thStyle}>Previous</th>
              <th style={thStyle}>% Change</th>
            </tr>
          </thead>
          <tbody>
            {tiles.map((tile) => {
              const isSelected = tile.tileId === selectedTileId;
              const def = findTileDefinition(category, tile.tileId);
              const label = def?.label ?? tile.tileId;

              return (
                <tr
                  key={tile.tileId}
                  onClick={() => onTileSelect(tile.tileId)}
                  style={{
                    cursor: 'pointer',
                    borderLeft: isSelected
                      ? '3px solid #2563eb'
                      : '3px solid transparent',
                    backgroundColor: isSelected ? '#eff6ff' : undefined,
                  }}
                  data-testid={`scorecard-tile-${tile.tileId}`}
                >
                  <td style={tdStyle}>{label}</td>
                  <td style={tdStyle}>{tile.currentValue}</td>
                  <td style={tdStyle}>{tile.previousValue}</td>
                  <td style={tdStyle}>{tile.pctChange}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

// ── Inline styles ─────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid #e5e7eb',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #f3f4f6',
  fontSize: 14,
};
