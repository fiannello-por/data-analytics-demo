'use client';

import * as React from 'react';
import { OverviewTotalScorecardSpecRenderer } from '@/components/dashboard/overview-scorecard-spec-renderer';
import type { OverviewTotalCard } from '@/lib/dashboard/overview-model';

export function TotalScorecard({ card }: { card: OverviewTotalCard }) {
  return <OverviewTotalScorecardSpecRenderer card={card} />;
}
