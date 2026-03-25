'use client';

import * as React from 'react';
import { ClosedWonOpportunitiesTable } from '@/components/dashboard/closed-won-opportunities-table';
import type { ClosedWonOpportunitiesPayload } from '@/lib/dashboard/contracts';
import type { OverviewBoardModel } from '@/lib/dashboard/overview-model';
import { CategoryScorecard } from '@/components/dashboard/category-scorecard';
import { TotalScorecard } from '@/components/dashboard/total-scorecard';

export function OverviewTab({
  board,
  closedWonOpportunities,
}: {
  board: OverviewBoardModel;
  closedWonOpportunities?: ClosedWonOpportunitiesPayload | null;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        {board.categoryCards.map((card) => (
          <CategoryScorecard key={card.category} card={card} />
        ))}
      </div>
      <TotalScorecard card={board.totalCard} />
      {closedWonOpportunities ? (
        <ClosedWonOpportunitiesTable payload={closedWonOpportunities} />
      ) : null}
    </div>
  );
}
