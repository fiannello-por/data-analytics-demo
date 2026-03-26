export type MetricCopy = {
  description: string;
  calculation: string;
};

export const METRIC_COPY_BY_LABEL: Record<string, MetricCopy> = {
  'Bookings $': {
    description:
      'Total booked revenue for opportunities in this category during the selected period.',
    calculation:
      'Sum of booked ACV for opportunities whose booked date falls inside the current or prior comparison window.',
  },
  'Bookings #': {
    description:
      'Count of booked opportunities in this category during the selected period.',
    calculation:
      'Number of opportunities booked inside the current or prior comparison window.',
  },
  'Annual Pacing (YTD)': {
    description: 'Year-to-date pace relative to the current booking run-rate.',
    calculation:
      'Current period results annualized from year-to-date performance through the selected end date.',
  },
  'Close Rate': {
    description:
      'Conversion efficiency from qualified pipeline into booked business.',
    calculation:
      'Booked opportunities divided by qualified opportunities for the same category and time window.',
  },
  'Avg Age': {
    description: 'Average age of opportunities contributing to the metric set.',
    calculation:
      'Mean days between opportunity creation and the relevant milestone date for the selected category.',
  },
  'Pipeline Created': {
    description: 'New pipeline generated within the selected period.',
    calculation:
      'Sum of pipeline value created during the current or prior comparison window.',
  },
  'Avg Booked Deal': {
    description: 'Average size of deals that booked in the selected period.',
    calculation:
      'Booked revenue divided by booked opportunity count for the category and comparison window.',
  },
  'Avg Quoted Deal': {
    description: 'Average quoted value of pipeline entering the funnel.',
    calculation:
      'Quoted pipeline value divided by quoted opportunity count for the category and comparison window.',
  },
  SQL: {
    description: 'Sales-qualified leads entering the monitored funnel stage.',
    calculation:
      'Count of opportunities that reached SQL during the selected comparison window.',
  },
  SQO: {
    description:
      'Sales-qualified opportunities created in the selected period.',
    calculation:
      'Count of opportunities that reached SQO during the selected comparison window.',
  },
  'Gate 1 Complete': {
    description: 'Opportunities that completed the first gating milestone.',
    calculation:
      'Count of opportunities marked as Gate 1 complete during the selected comparison window.',
  },
  'SDR Points': {
    description:
      'Weighted SDR contribution associated with the selected category.',
    calculation:
      'Sum of SDR point allocations recorded for opportunities in the comparison window.',
  },
  'SQO Users': {
    description: 'Total users associated with SQO-stage opportunities.',
    calculation:
      'Sum of user counts across opportunities that reached SQO in the comparison window.',
  },
  SAL: {
    description: 'Sales-accepted leads entering the opportunity funnel.',
    calculation:
      'Count of opportunities that reached SAL during the selected comparison window.',
  },
  'Avg Users': {
    description: 'Average user count per relevant opportunity.',
    calculation:
      'Total users divided by opportunity count for the category and comparison window.',
  },
  'One-time Revenue': {
    description: 'Revenue recognized as one-time rather than recurring.',
    calculation:
      'Sum of one-time revenue booked within the selected comparison window.',
  },
};

export function getMetricCopy(label: string): MetricCopy {
  return (
    METRIC_COPY_BY_LABEL[label] ?? {
      description:
        'Executive KPI for the selected category and comparison window.',
      calculation:
        'Calculated directly from the current and prior comparison windows for this metric.',
    }
  );
}
