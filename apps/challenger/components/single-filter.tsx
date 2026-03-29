// apps/challenger/components/single-filter.tsx
// Async server component that awaits a single filter's data and renders
// its FilterDropdown. Each instance is wrapped in its own Suspense boundary
// so filters stream in individually.

import type { SingleFilterResult } from '../lib/single-filter-loader';
import type { DashboardUrlState } from '../lib/url-state';
import { FilterDropdown } from './filter-dropdown';

type Props = {
  data: Promise<SingleFilterResult>;
  state: DashboardUrlState;
};

export async function SingleFilter({ data, state }: Props) {
  const { key, options } = await data;

  return (
    <FilterDropdown
      filterKey={key}
      options={options}
      selected={state.filters[key] ?? []}
      state={state}
    />
  );
}
