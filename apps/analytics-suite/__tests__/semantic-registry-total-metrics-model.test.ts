import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

type LightdashMetric = {
  sql?: string;
  label?: string;
};

type LightdashModel = {
  metrics?: Record<string, LightdashMetric>;
};

describe('sales dashboard v2 semantic model', () => {
  it('defines annual pacing using the source fiscal day counter instead of the selected range length', () => {
    const model = parse(
      readFileSync(
        new URL(
          '../../../semantic/lightdash/models/sales_dashboard_v2_opportunity_base.yml',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as LightdashModel;

    expect(model.metrics?.annual_pacing_ytd?.sql).toContain(
      'calendar_days_passed_since_first_day_of_close_date_fy',
    );
    expect(model.metrics?.annual_pacing_ytd?.sql).not.toContain('DATE_DIFF');
  });

  it('defines one-time revenue independently from ACV positivity', () => {
    const model = parse(
      readFileSync(
        new URL(
          '../../../semantic/lightdash/models/sales_dashboard_v2_opportunity_base.yml',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as LightdashModel;

    expect(model.metrics?.one_time_revenue?.sql).toContain(
      'hard_imp_value_usd > 0',
    );
    expect(model.metrics?.one_time_revenue?.sql).not.toContain(
      "stage_name = 'Closed Won'",
    );
  });

  it('defines the scorecard avg age metric using close date minus pipeline start date', () => {
    const model = parse(
      readFileSync(
        new URL(
          '../../../semantic/lightdash/models/sales_dashboard_v2_opportunity_base.yml',
          import.meta.url,
        ),
        'utf8',
      ),
    ) as LightdashModel;

    expect(model.metrics?.avg_age_scorecard?.sql).toContain(
      'DATE_DIFF(${TABLE}.close_date, ${TABLE}.pipeline_start_date, DAY)',
    );
    expect(model.metrics?.avg_age_scorecard?.label).toBe('Avg Age (Scorecard)');
    expect(model.metrics?.avg_age?.label).toBe('Avg Age');
    expect(model.metrics?.avg_age_scorecard?.sql).toContain('${TABLE}.acv > 0');
    expect(model.metrics?.avg_age_scorecard?.sql).not.toContain(
      '${TABLE}.age_days',
    );
  });
});
