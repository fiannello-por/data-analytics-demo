import { describe, expect, it } from 'vitest';
import {
  derivePreviousYearRange,
  getCurrentYearRange,
  isValidDateRange,
} from '@/lib/dashboard/date-range';

describe('dashboard date range', () => {
  it('defaults to the current year', () => {
    const range = getCurrentYearRange(new Date('2026-03-22T00:00:00Z'));

    expect(range).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-03-22',
    });
  });

  it('derives the same period in the previous year', () => {
    expect(
      derivePreviousYearRange({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      }),
    ).toEqual({
      startDate: '2025-01-01',
      endDate: '2025-03-31',
    });
  });

  it('rejects malformed date ranges', () => {
    expect(
      isValidDateRange({
        startDate: 'bad-date',
        endDate: '2026-03-31',
      }),
    ).toBe(false);
  });

  it('rejects reversed date ranges', () => {
    expect(
      isValidDateRange({
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      }),
    ).toBe(false);
  });
});
