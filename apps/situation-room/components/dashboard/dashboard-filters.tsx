'use client';

import * as React from 'react';
import { CalendarRangeIcon, ChevronDownIcon, CircleHelpIcon, XIcon } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toStableDomId } from '@/lib/stable-dom-id';
import { cn } from '@/lib/utils';

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

function countActiveFilters(
  filters: DashboardState['filters'],
): number {
  return Object.values(filters).filter((values) => (values?.length ?? 0) > 0).length;
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

  const activeFilterCount = countActiveFilters(state.filters);

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
      <CardHeader className="gap-2 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Global Controls</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
            </Badge>
            <Badge variant="outline">Weekly trend grain</Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Shared across every category tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="outline">{DATE_RANGE_FILTER_LABEL}</Badge>
          <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <Button
                  id="date-range-trigger"
                  variant="outline"
                  aria-label="Date range filter"
                  className="h-9 min-w-56 justify-between rounded-lg px-3"
                />
              }
            >
              <CalendarRangeIcon data-icon="inline-start" />
              {formatDateRange(state.dateRange)}
              <ChevronDownIcon data-icon="inline-end" />
            </PopoverTrigger>
            <PopoverContent
              align="center"
              className="w-fit max-w-[calc(100vw-1rem)] p-0"
            >
              <div>
                <PopoverHeader className="px-4 pt-4 pb-2">
                  <PopoverTitle>Date Range</PopoverTitle>
                  <PopoverDescription>
                    Compare against the same dates last year.
                  </PopoverDescription>
                </PopoverHeader>
                <Separator />
                <div className="px-2 pb-2">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={draftDateRange}
                    onSelect={(range) => setDraftDateRange(range)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {draftDateRange?.from && draftDateRange?.to
                      ? `${toIsoDateString(draftDateRange.from)} to ${toIsoDateString(draftDateRange.to)}`
                      : 'Select a start and end date'}
                  </span>
                  <Button
                    type="button"
                    aria-label="Apply date range"
                    className="bg-accent-brand text-background hover:bg-accent-brand/90"
                    disabled={!draftDateRange?.from || !draftDateRange?.to}
                    onClick={applyDateRange}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">Prior year</Badge>
            <span className="text-muted-foreground">
              {state.previousDateRange.startDate} to {state.previousDateRange.endDate}
            </span>
          </div>
        </div>
        <Separator />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
          {DASHBOARD_FILTER_DEFINITIONS.map((filter) => {
            const dictionary = dictionaries[filter.key];
            const selectedValues = normalizeValues(state.filters[filter.key]);
            const draftValues = normalizeValues(
              draftSelections[filter.key] ?? selectedValues,
            );
            const isOpen = openFilterKey === filter.key;
            const selectedCount = selectedValues.length;
            const hasChanges =
              selectedValues.length !== draftValues.length ||
              selectedValues.some((value, index) => value !== draftValues[index]);

            return (
              <Popover
                key={filter.key}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenFilterKey(open ? filter.key : null)
                }
              >
                <PopoverTrigger
                  render={
                    <Button
                      id={`filter-trigger-${toStableDomId(filter.key)}`}
                      type="button"
                      variant={selectedCount > 0 ? 'secondary' : 'outline'}
                      aria-label={`${filter.label} filter`}
                      aria-expanded={isOpen}
                      className={cn(
                        'h-9 w-full justify-between rounded-lg px-3',
                        selectedCount > 0 && 'border-transparent',
                      )}
                    />
                  }
                >
                  <span className="truncate text-left text-sm">
                    {getTriggerLabel(filter.label, selectedCount)}
                  </span>
                  <ChevronDownIcon
                    data-icon="inline-end"
                    className={cn('transition-transform', isOpen && 'rotate-180')}
                  />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[17.5rem] p-0">
                  <PopoverHeader className="px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`About ${filter.label}`}
                                className="rounded-full text-muted-foreground"
                              />
                            }
                          >
                            <CircleHelpIcon />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56 flex-col items-start gap-0.5 text-left">
                            <span className="font-medium">{filter.label}</span>
                            <span>{filter.description}</span>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-1">
                        {draftValues.length > 0 ? (
                          <Badge variant="secondary">{draftValues.length} selected</Badge>
                        ) : null}
                      </div>
                    </div>
                  </PopoverHeader>
                  <Separator />
                  <div className="max-h-56 overflow-auto px-1 py-1">
                    <div className="flex flex-col gap-0.5">
                      {(dictionary?.options ?? []).map((option) => {
                        const checked = draftValues.includes(option.value);

                        return (
                          <label
                            key={option.value}
                            className={cn(
                              'flex min-h-7 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
                              checked
                                ? 'bg-accent-brand-subtle text-foreground'
                                : 'hover:bg-muted/80',
                            )}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${option.label} for ${filter.label}`}
                              className="size-3.5 rounded-sm border-input text-accent-brand"
                              checked={checked}
                              onChange={() =>
                                toggleDraftValue(filter.key, option.value)
                              }
                            />
                            <span className="truncate leading-tight">{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex h-10 items-center justify-between px-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      aria-label={`Clear ${filter.label} filter`}
                      className="h-7 self-auto leading-none"
                      disabled={draftValues.length === 0}
                      onClick={() =>
                        setDraftSelections((current) => ({
                          ...current,
                          [filter.key]: [],
                        }))
                      }
                    >
                      <XIcon data-icon="inline-start" />
                      Clear
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      aria-label={`Apply ${filter.label} filter`}
                      className="h-7 self-auto leading-none bg-accent-brand text-background hover:bg-accent-brand/90"
                      disabled={!hasChanges}
                      onClick={() => applyDraft(filter.key)}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
