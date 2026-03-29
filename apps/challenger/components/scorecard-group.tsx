// apps/challenger/components/scorecard-group.tsx
// Async server component that renders one snapshot group's tiles as table rows.
// Each instance is wrapped in its own Suspense so tile clusters stream in
// as their group's queries complete.

import type { ScorecardGroupResult } from '../lib/scorecard-group-loader';

type Props = {
  data: Promise<ScorecardGroupResult>;
};

export async function ScorecardGroup({ data }: Props) {
  const result = await data;

  // Sort tiles by sortOrder within this group
  const sorted = [...result.tiles].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {sorted.map((tile) => (
        <tr key={tile.tileId} data-testid="scorecard-tile">
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
            {tile.pctChange}
          </td>
        </tr>
      ))}
    </>
  );
}
