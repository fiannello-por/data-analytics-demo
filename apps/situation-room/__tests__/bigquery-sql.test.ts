import { describe, expect, it } from 'vitest';
import {
  buildFilterDictionaryQuery,
  buildScorecardReportQuery,
} from '@/lib/bigquery/sql';
import { normalizeFilters } from '@/lib/filter-normalization';

describe('buildScorecardReportQuery', () => {
  it('only emits allowlisted predicates and keeps user values parameterized', () => {
    const query = buildScorecardReportQuery(
      normalizeFilters({
        Division: ['Rental'],
        Region: ["North' OR 1=1 --"],
        DateRange: ['current_year'],
        UnknownKey: ['ignored'],
      } as never),
    );

    expect(query.sql).toContain('Division IN UNNEST(@Division)');
    expect(query.sql).toContain('Region IN UNNEST(@Region)');
    expect(query.sql).not.toContain('UnknownKey');
    expect(query.sql).not.toContain("North' OR 1=1 --");
    expect(query.params).toEqual({
      Division: ['Rental'],
      Region: ["North' OR 1=1 --"],
    });
  });

  it('scopes to current-year rows and selects only the latest report snapshot', () => {
    const query = buildScorecardReportQuery(normalizeFilters({}));

    expect(query.sql).toContain('report_date >= DATE_TRUNC(CURRENT_DATE(), YEAR)');
    expect(query.sql).toContain('with scoped_rows as');
    expect(query.sql).toContain('max(report_date) as latest_report_date');
    expect(query.sql).toContain('where report_date = (select latest_report_date from latest_snapshot)');
    expect(query.sql).toContain('scorecard_report_rows');
    expect(query.params).toEqual({});
  });

  it('rejects unsupported date-range values instead of widening scope', () => {
    expect(() =>
      buildScorecardReportQuery(
        normalizeFilters({ DateRange: ['last_30_days'] }),
      ),
    ).toThrowError(
      'Unsupported DateRange filter: last_30_days. Only current_year is supported.',
    );
  });
});

describe('buildFilterDictionaryQuery', () => {
  it('queries a single filter key', () => {
    const query = buildFilterDictionaryQuery('Division');

    expect(query.sql).toContain('where filter_key = @filterKey');
    expect(query.sql).toContain('scorecard_filter_dictionary');
    expect(query.params).toEqual({ filterKey: 'Division' });
  });

  it('rejects invalid filter keys', () => {
    expect(() => buildFilterDictionaryQuery('DateRange')).toThrowError(
      'Unsupported filter dictionary key: DateRange.',
    );
  });
});
