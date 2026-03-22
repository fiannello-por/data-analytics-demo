'use client';

import * as React from 'react';
import { CalendarRangeIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import type {
  FilterDictionaryPayload,
  DashboardState,
} from '@/lib/dashboard/contracts';
import type { GlobalFilterKey } from '@/lib/dashboard/catalog';
import {
  DASHBOARD_FILTER_DEFINITIONS,
  DATE_RANGE_FILTER_LABEL,
} from '@/lib/dashboard/filter-config';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DashboardFiltersProps = {
  state: DashboardState;
  dictionaries: Record<string, FilterDictionaryPayload>;
  onFilterValueAdd: (key: GlobalFilterKey, value: string) => void;
  onFilterValueRemove: (key: GlobalFilterKey, value: string) => void;
};

export function DashboardFilters({
  state,
  dictionaries,
  onFilterValueAdd,
  onFilterValueRemove,
}: DashboardFiltersProps) {
  const [draftSelections, setDraftSelections] = React.useState<
    Partial<Record<GlobalFilterKey, string>>
  >({});

  function handleValueChange(key: GlobalFilterKey, value: unknown) {
    if (typeof value !== 'string' || value.length === 0) return;
    onFilterValueAdd(key, value);
    setDraftSelections((current) => ({ ...current, [key]: '' }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>
          One global date range and shared multi-select dimensions for every tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">{DATE_RANGE_FILTER_LABEL}</Badge>
          <Button variant="outline" className="justify-between" disabled title="Date range is fixed from the initial load">
            <CalendarRangeIcon data-icon="inline-start" />
            {state.dateRange.startDate} to {state.dateRange.endDate}
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
          <Badge variant="secondary">
            Previous year: {state.previousDateRange.startDate} to{' '}
            {state.previousDateRange.endDate}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {DASHBOARD_FILTER_DEFINITIONS.map((filter) => {
            const dictionary = dictionaries[filter.key];
            const previewOption = dictionary?.options[0]?.label;
            const selectedValues = state.filters[filter.key] ?? [];

            return (
              <div key={filter.key} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{filter.label}</span>
                  <Badge variant="outline">
                    {dictionary?.options.length ?? 0} options
                  </Badge>
                </div>
                <Select
                  value={draftSelections[filter.key] ?? ''}
                  onValueChange={(value) => handleValueChange(filter.key, value)}
                >
                  <SelectTrigger aria-label={filter.label}>
                    <SelectValue placeholder={`Add ${filter.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {(dictionary?.options ?? []).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedValues.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedValues.map((value) => (
                      <Badge key={value} variant="secondary" className="gap-1 pr-1">
                        <span>{value}</span>
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-background/70"
                          aria-label={`Remove ${value} from ${filter.label}`}
                          onClick={() => {
                            onFilterValueRemove(filter.key, value);
                            setDraftSelections((current) => ({
                              ...current,
                              [filter.key]: '',
                            }));
                          }}
                        >
                          <XIcon className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {previewOption ?? 'Options load from the global dictionary.'}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Date range stays fixed from the initial load in this task.
        </p>
      </CardContent>
    </Card>
  );
}
