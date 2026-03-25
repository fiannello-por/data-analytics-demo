import 'server-only';

import { BigQueryAdapter } from '@/lib/data-adapters/bigquery-adapter';

export function getScorecardDataAdapter() {
  return new BigQueryAdapter();
}
