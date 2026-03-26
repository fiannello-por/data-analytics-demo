import { describe, expect, it } from 'vitest';
import {
  normalizeFilters,
  serializeFilterCacheKey,
} from '@/lib/filter-normalization';

describe('filter normalization', () => {
  it('sorts keys and values into a stable cache key', () => {
    const left = serializeFilterCacheKey({
      Region: ['South', 'North'],
      Division: ['Rental'],
    });
    const right = serializeFilterCacheKey({
      Division: ['Rental'],
      Region: ['North', 'South'],
    });

    expect(left).toBe(right);
  });

  it('trims retained values and drops blank and duplicate values', () => {
    expect(normalizeFilters({ Owner: [' ', ' Alice ', 'Alice'] })).toEqual({
      Owner: ['Alice'],
    });
  });
});
