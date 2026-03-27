import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  DEFAULT_DATE_RANGE,
  type ScorecardFilters,
  summarizeFilters,
  withDefaultDateRange,
} from '@/lib/contracts';

describe('contracts', () => {
  it('keeps the canonical category order', () => {
    expect(CATEGORY_ORDER).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });

  it('omits empty filters from summaries', () => {
    const filters: ScorecardFilters = {
      Division: ['North'],
      Owner: [],
    };

    expect(summarizeFilters(filters)).toEqual([
      { key: 'Division', values: ['North'] },
    ]);
  });

  it('applies the default date range when missing', () => {
    expect(withDefaultDateRange({})).toEqual({
      DateRange: DEFAULT_DATE_RANGE,
    });
  });
});
