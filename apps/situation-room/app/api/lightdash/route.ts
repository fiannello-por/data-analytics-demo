import { NextRequest, NextResponse } from 'next/server';
import { executeScorecardQuery, pollResults } from '@/lib/lightdash-client';
import { parseScorecardRows } from '@/lib/scorecard-parser';
import type { Category, CategoryData } from '@/lib/types';
import { buildCategoryFilters, CATEGORIES } from '@/lib/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filters: Record<string, string[]> = body.filters ?? {};
    const categories: Category[] = body.categories ?? CATEGORIES;

    const results: CategoryData[] = [];

    for (const category of categories) {
      const filterGroup = buildCategoryFilters(category, filters);
      const queryUuid = await executeScorecardQuery(filterGroup);
      const rawRows = await pollResults(queryUuid);
      results.push({ category, rows: parseScorecardRows(rawRows) });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
