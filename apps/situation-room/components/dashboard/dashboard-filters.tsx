'use client';

import * as React from 'react';
import { CalendarRangeIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import type {
  FilterDictionaryPayload,
  DashboardState,
  DateRange,
} from '@/lib/dashboard/contracts';
import type { GlobalFilterKey } from '@/lib/dashboard/catalog';
import {
  DASHBOARD_FILTER_DEFINITIONS,
  DATE_RANGE_FILTER_LABEL,
} from '@/lib/dashboard/filter-config';
import {
  formatDateRange,
  parseIsoDate,
  toIsoDateString,
} from '@/lib/dashboard/date-range';
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
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type DashboardFiltersProps = {
  state: DashboardState;
  dictionaries: Record<string, FilterDictionaryPayload>;
  onFilterValueAdd: (key: GlobalFilterKey, value: string) => void;
  onFilterValueRemove: (key: GlobalFilterKey, value: string) => void;
  onDateRangeApply: (range: DateRange) => void;
};

function normalizeValues(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).filter(Boolean))].sort();
}

function getTriggerLabel(label: string, selectedCount: number): string {
  if (selectedCount === 0) {
    return label;
  }

  return `${label} · ${selectedCount}`;
}

export function DashboardFilters({
  state,
  dictionaries,
  onFilterValueAdd,
  onFilterValueRemove,
  onDateRangeApply,
}: DashboardFiltersProps) {
  const [openFilterKey, setOpenFilterKey] = React.useState<GlobalFilterKey | null>(
    null,
  );
  const [isDatePickerOpen, setDatePickerOpen] = React.useState(false);
  const [draftSelections, setDraftSelections] = React.useState<
    Partial<Record<GlobalFilterKey, string[]>>
  >(() => state.filters);
  const [draftDateRange, setDraftDateRange] = React.useState<DayPickerDateRange | undefined>(
    {
      from: parseIsoDate(state.dateRange.startDate) ?? undefined,
      to: parseIsoDate(state.dateRange.endDate) ?? undefined,
    },
  );

  React.useEffect(() => {
    setDraftSelections(state.filters);
  }, [state.filters]);

  React.useEffect(() => {
    setDraftDateRange({
      from: parseIsoDate(state.dateRange.startDate) ?? undefined,
      to: parseIsoDate(state.dateRange.endDate) ?? undefined,
    });
  }, [state.dateRange.endDate, state.dateRange.startDate]);

  function toggleDraftValue(key: GlobalFilterKey, value: string) {
    setDraftSelections((current) => {
      const currentValues = normalizeValues(current[key] ?? state.filters[key]);
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...current,
        [key]: normalizeValues(nextValues),
      };
    });
  }

  function applyDraft(key: GlobalFilterKey) {
    const committedValues = normalizeValues(state.filters[key]);
    const draftValues = normalizeValues(draftSelections[key] ?? committedValues);

    for (const value of committedValues) {
      if (!draftValues.includes(value)) {
        onFilterValueRemove(key, value);
      }
    }

    for (const value of draftValues) {
      if (!committedValues.includes(value)) {
        onFilterValueAdd(key, value);
      }
    }

    setOpenFilterKey(null);
  }

  function applyDateRange() {
    if (!draftDateRange?.from || !draftDateRange?.to) {
      return;
    }

    onDateRangeApply({
      startDate: toIsoDateString(draftDateRange.from),
      endDate: toIsoDateString(draftDateRange.to),
    });
    setDatePickerOpen(false);
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
          <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  aria-label="Date range filter"
                  className="h-10 min-w-64 justify-between rounded-full px-4"
                />
              }
            >
              <CalendarRangeIcon data-icon="inline-start" />
              {formatDateRange(state.dateRange)}
              <ChevronDownIcon data-icon="inline-end" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <PopoverHeader className="px-4 pt-4">
                <PopoverTitle>Date Range</PopoverTitle>
                <PopoverDescription>
                  Choose a current-period range. The previous period stays aligned to the same dates in the previous year.
                </PopoverDescription>
              </PopoverHeader>
              <div className="px-2 pb-2">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={draftDateRange}
                  onSelect={(range) => setDraftDateRange(range)}
                />
              </div>
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {draftDateRange?.from && draftDateRange?.to
                    ? `${toIsoDateString(draftDateRange.from)} to ${toIsoDateString(draftDateRange.to)}`
                    : 'Select a start and end date'}
                </span>
                <Button
                  type="button"
                  aria-label="Apply date range"
                  className="bg-sky-600 text-white hover:bg-sky-700"
                  disabled={!draftDateRange?.from || !draftDateRange?.to}
                  onClick={applyDateRange}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Badge variant="secondary">
            Previous year: {state.previousDateRange.startDate} to{' '}
            {state.previousDateRange.endDate}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          {DASHBOARD_FILTER_DEFINITIONS.map((filter) => {
            const dictionary = dictionaries[filter.key];
            const selectedValues = normalizeValues(state.filters[filter.key]);
            const draftValues = normalizeValues(
              draftSelections[filter.key] ?? selectedValues,
            );
            const isOpen = openFilterKey === filter.key;
            const selectedCount = selectedValues.length;

            return (
              <div
                key={filter.key}
                className="relative"
              >
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`${filter.label} filter`}
                  className="h-10 min-w-44 justify-between rounded-full px-4"
                  onClick={() =>
                    setOpenFilterKey((current) =>
                      current === filter.key ? null : filter.key,
                    )
                  }
                >
                  <span className="truncate text-left text-sm">
                    {getTriggerLabel(filter.label, selectedCount)}
                  </span>
                  <ChevronDownIcon
                    className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
                {isOpen ? (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 flex w-72 flex-col gap-3 rounded-2xl border bg-popover p-4 shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{filter.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Select one or more values, then apply.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full"
                        aria-label={`Close ${filter.label} filter`}
                        onClick={() => setOpenFilterKey(null)}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                    <div className="max-h-48 space-y-2 overflow-auto">
                      {(dictionary?.options ?? []).map((option) => {
                        const checked = draftValues.includes(option.value);

                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${option.label} for ${filter.label}`}
                              checked={checked}
                              onChange={() =>
                                toggleDraftValue(filter.key, option.value)
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <Button
                      type="button"
                      aria-label={`Apply ${filter.label} filter`}
                      className="bg-sky-600 text-white hover:bg-sky-700"
                      onClick={() => applyDraft(filter.key)}
                    >
                      Apply
                    </Button>
                  </div>
                ) : null}
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
