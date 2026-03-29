// apps/challenger/lib/tab-manifest.ts

export type SectionId = 'overview' | 'scorecard' | 'trend' | 'closedWon' | 'filters';

export type SectionEntry = {
  id: SectionId;
  priority: number;
};

export const OVERVIEW_MANIFEST: SectionEntry[] = [
  { id: 'overview', priority: 1 },
  { id: 'filters', priority: 2 },
];

export const CATEGORY_MANIFEST: SectionEntry[] = [
  { id: 'scorecard', priority: 1 },
  { id: 'trend', priority: 2 },
  { id: 'closedWon', priority: 3 },
  { id: 'filters', priority: 4 },
];
