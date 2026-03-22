import type { DateRange } from '@/lib/dashboard/contracts';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDateUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return toIsoDateUTC(date) === value ? date : null;
}

export function getCurrentYearRange(referenceDate: Date = new Date()): DateRange {
  const year = referenceDate.getUTCFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function derivePreviousYearRange(range: DateRange): DateRange {
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);

  if (!start || !end) {
    throw new Error('Invalid date range');
  }

  start.setUTCFullYear(start.getUTCFullYear() - 1);
  end.setUTCFullYear(end.getUTCFullYear() - 1);

  return {
    startDate: toIsoDateUTC(start),
    endDate: toIsoDateUTC(end),
  };
}

export function isValidDateRange(range: DateRange): boolean {
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);

  if (!start || !end) {
    return false;
  }

  return start.getTime() <= end.getTime();
}

export function formatDateRange(range: DateRange): string {
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);

  if (!start || !end) {
    throw new Error('Invalid date range');
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}
