import { describe, it, expect } from 'vitest';
import { buildCategoryFilters, CATEGORIES } from '@/lib/queries';

describe('buildCategoryFilters', () => {
  it('returns filter rules for a category with no additional filters', () => {
    const result = buildCategoryFilters('New Logo', {});
    expect(result.and).toHaveLength(2);
    expect(result.and[0].values).toEqual(['New Logo']);
  });

  it('includes additional filter rules when provided', () => {
    const result = buildCategoryFilters('Expansion', {
      Division: ['Enterprise'],
    });
    expect(result.and).toHaveLength(3);
    expect(result.and[2].target.fieldId).toBe('scorecard_daily_Division');
    expect(result.and[2].values).toEqual(['Enterprise']);
  });
});

describe('CATEGORIES', () => {
  it('contains all five categories', () => {
    expect(CATEGORIES).toEqual([
      'New Logo',
      'Expansion',
      'Migration',
      'Renewal',
      'Total',
    ]);
  });
});
