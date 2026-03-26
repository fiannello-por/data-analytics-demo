'use client';

import * as React from 'react';
import { OverviewCategoryScorecardSpecRenderer } from '@/components/dashboard/overview-scorecard-spec-renderer';
import type { OverviewCategoryCard } from '@/lib/dashboard/overview-model';

export function CategoryScorecard({ card }: { card: OverviewCategoryCard }) {
  return <OverviewCategoryScorecardSpecRenderer card={card} />;
}
