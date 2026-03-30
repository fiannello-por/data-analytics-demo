'use client';

import * as React from 'react';
import {
  CalendarRangeIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import type {
  FilterDictionaryPayload,
  DashboardState,
  DateRange,
} from '@/lib/dashboard/contracts';
import type { GlobalFilterKey } from '@/lib/dashboard/catalog';
import {
  DATE_RANGE_FILTER_LABEL,
  DASHBOARD_FILTER_DEFINITIONS,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
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
  dictionaryLoading?: Partial<Record<GlobalFilterKey, boolean>>;
  lastRefreshedAt?: string | null;
  renderedAt: string;
  onFilterOpen?: (key: GlobalFilterKey) => void;
  onFilterValueAdd: (key: GlobalFilterKey, value: string) => void;
  onFilterValueRemove: (key: GlobalFilterKey, value: string) => void;
  onDateRangeApply: (range: DateRange) => void;
};

function formatFreshnessDistance(
  lastRefreshedAt: string,
  nowIsoString: string,
): string {
  const refreshedTime = Date.parse(lastRefreshedAt);
  const currentTime = Date.parse(nowIsoString);

  if (Number.isNaN(refreshedTime) || Number.isNaN(currentTime)) {
    return 'Updated recently';
  }

  const elapsedMinutes = Math.max(
    0,
    Math.round((currentTime - refreshedTime) / 60000),
  );

  if (elapsedMinutes < 1) {
    return 'Updated just now';
  }

  if (elapsedMinutes === 1) {
    return 'Updated 1 min ago';
  }

  if (elapsedMinutes < 60) {
    return `Updated ${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);

  if (elapsedHours === 1) {
    return 'Updated 1 hr ago';
  }

  if (elapsedHours < 24) {
    return `Updated ${elapsedHours} hr ago`;
  }

  const elapsedDays = Math.round(elapsedHours / 24);

  if (elapsedDays === 1) {
    return 'Updated 1 day ago';
  }

  return `Updated ${elapsedDays} days ago`;
}

function formatFreshnessTimestamp(timestamp: string): string {
  const parsedTime = Date.parse(timestamp);

  if (Number.isNaN(parsedTime)) {
    return timestamp;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(parsedTime));
}

function getFreshnessTone(
  lastRefreshedAt: string,
  nowIsoString: string,
): string {
  const refreshedTime = Date.parse(lastRefreshedAt);
  const currentTime = Date.parse(nowIsoString);

  if (Number.isNaN(refreshedTime) || Number.isNaN(currentTime)) {
    return 'bg-muted-foreground/60';
  }

  const elapsedMinutes = Math.max(
    0,
    Math.round((currentTime - refreshedTime) / 60000),
  );

  if (elapsedMinutes <= 30) {
    return 'bg-emerald-500';
  }

  if (elapsedMinutes <= 180) {
    return 'bg-amber-500';
  }

  return 'bg-rose-500';
}

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
  dateRange: DashboardState['dateRange'],
): number {
  const selectedValueFilters = Object.values(filters).filter(
    (values) => (values?.length ?? 0) > 0,
  ).length;
  const hasDateRange = Boolean(dateRange.startDate && dateRange.endDate);

  return selectedValueFilters + (hasDateRange ? 1 : 0);
}

function hasActiveDateRange(dateRange: DashboardState['dateRange']): boolean {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

function getActiveFilterDetails(
  filters: DashboardState['filters'],
  dateRange: DashboardState['dateRange'],
): Array<{ label: string; value: string }> {
  const details: Array<{ label: string; value: string }> = [];

  if (hasActiveDateRange(dateRange)) {
    details.push({
      label: DATE_RANGE_FILTER_LABEL,
      value: formatDateRange(dateRange),
    });
  }

  for (const filter of DASHBOARD_FILTER_DEFINITIONS) {
    const selectedValues = normalizeValues(filters[filter.key]);
    if (selectedValues.length === 0) {
      continue;
    }

    details.push({
      label: filter.label,
      value: selectedValues.join(', '),
    });
  }

  return details;
}

export function getFilterOptionClassName(checked: boolean): string {
  return checked
    ? 'bg-[color:color-mix(in_srgb,var(--accent-brand)_16%,transparent)] text-foreground'
    : 'hover:bg-muted/80';
}

function getApplyButtonClassName(): string {
  return 'bg-[var(--dashboard-action)] text-[var(--dashboard-action-foreground)] hover:bg-[color:color-mix(in_srgb,var(--dashboard-action)_88%,white)]';
}

export function DashboardFilters({
  state,
  dictionaries,
  dictionaryLoading,
  lastRefreshedAt,
  renderedAt,
  onFilterOpen,
  onFilterValueAdd,
  onFilterValueRemove,
  onDateRangeApply,
}: DashboardFiltersProps) {
  const [isControlsOpen, setControlsOpen] = React.useState(true);
  const [openFilterKey, setOpenFilterKey] =
    React.useState<GlobalFilterKey | null>(null);
  const [isDatePickerOpen, setDatePickerOpen] = React.useState(false);
  const [draftSelections, setDraftSelections] = React.useState<
    Partial<Record<GlobalFilterKey, string[]>>
  >(() => state.filters);
  const [searchQueries, setSearchQueries] = React.useState<
    Partial<Record<GlobalFilterKey, string>>
  >({});
  const [nowIsoString, setNowIsoString] = React.useState(renderedAt);
  const [draftDateRange, setDraftDateRange] = React.useState<
    DayPickerDateRange | undefined
  >({
    from: parseIsoDate(state.dateRange.startDate) ?? undefined,
    to: parseIsoDate(state.dateRange.endDate) ?? undefined,
  });

  React.useEffect(() => {
    setDraftSelections(state.filters);
  }, [state.filters]);

  React.useEffect(() => {
    setDraftDateRange({
      from: parseIsoDate(state.dateRange.startDate) ?? undefined,
      to: parseIsoDate(state.dateRange.endDate) ?? undefined,
    });
  }, [state.dateRange.endDate, state.dateRange.startDate]);

  React.useEffect(() => {
    setNowIsoString(renderedAt);
  }, [renderedAt]);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowIsoString(new Date().toISOString());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const activeFilterCount = countActiveFilters(state.filters, state.dateRange);
  const activeFilterDetails = getActiveFilterDetails(
    state.filters,
    state.dateRange,
  );
  const currentPeriodLabel = formatDateRange(state.dateRange);
  const priorPeriodLabel = `${state.previousDateRange.startDate} to ${state.previousDateRange.endDate}`;
  const freshnessLabel = lastRefreshedAt
    ? formatFreshnessDistance(lastRefreshedAt, nowIsoString)
    : null;
  const freshnessTimestamp = lastRefreshedAt
    ? formatFreshnessTimestamp(lastRefreshedAt)
    : null;
  const freshnessTone = lastRefreshedAt
    ? getFreshnessTone(lastRefreshedAt, nowIsoString)
    : 'bg-muted-foreground/60';

  function updateSearchQuery(key: GlobalFilterKey, value: string) {
    setSearchQueries((current) => ({
      ...current,
      [key]: value,
    }));
  }

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
    const draftValues = normalizeValues(
      draftSelections[key] ?? committedValues,
    );

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
    setSearchQueries((current) => ({
      ...current,
      [key]: '',
    }));
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
    <Collapsible open={isControlsOpen} onOpenChange={setControlsOpen}>
      <Card>
        <CardHeader className="gap-1.5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Global Controls</CardTitle>
                <Tooltip>
                  <TooltipTrigger className="outline-none">
                    <Badge variant="secondary">
                      {activeFilterCount} active filter
                      {activeFilterCount === 1 ? '' : 's'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    className="[--tooltip-bg:#09090b] [--tooltip-fg:#fafafa] w-80 max-w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-white/10 px-3.5 py-3 shadow-2xl shadow-black/35"
                  >
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                          Active filters
                        </span>
                        <span className="text-[11px] text-white/45">
                          {activeFilterCount} total
                        </span>
                      </div>
                      {activeFilterDetails.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {activeFilterDetails.map((item) => (
                            <div
                              key={`${item.label}:${item.value}`}
                              className="grid grid-cols-[max-content,minmax(0,1fr)] items-start gap-x-2 rounded-lg bg-white/5 px-2.5 py-2"
                            >
                              <span className="text-[11px] font-medium text-white/55">
                                {item.label}
                              </span>
                              <span className="min-w-0 text-[12px] leading-5 text-white/92">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-white/5 px-2.5 py-2 text-[12px] text-white/72">
                          No active filters applied.
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
                {freshnessLabel && freshnessTimestamp ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
                          aria-label={`Last updated at ${freshnessTimestamp}`}
                        />
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={cn('size-1.5 rounded-full', freshnessTone)}
                      />
                      {freshnessLabel}
                    </TooltipTrigger>
                    <TooltipContent>{`Last updated at ${freshnessTimestamp}`}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="min-w-0">
                  <span className="font-medium text-foreground/80">
                    Current period:
                  </span>{' '}
                  {currentPeriodLabel}
                </span>
                <span className="min-w-0">
                  <span className="font-medium text-foreground/80">
                    Prior period:
                  </span>{' '}
                  {priorPeriodLabel}
                </span>
              </div>
            </div>
            <CollapsibleTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Toggle global controls"
                  className="gap-1.5 text-muted-foreground"
                />
              }
            >
              <span>{isControlsOpen ? 'Collapse' : 'Expand'}</span>
              <ChevronDownIcon
                data-icon="inline-end"
                className={cn(
                  'transition-transform',
                  isControlsOpen && 'rotate-180',
                )}
              />
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div
              className={cn(
                'flex flex-col gap-3 transition-[opacity,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                isControlsOpen
                  ? 'translate-y-0 opacity-100'
                  : '-translate-y-1 opacity-0',
              )}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <Popover
                  open={isDatePickerOpen}
                  onOpenChange={setDatePickerOpen}
                >
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
                    className="sales-dashboard-accent w-fit max-w-[calc(100vw-1rem)] p-0"
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
                          className={getApplyButtonClassName()}
                          disabled={
                            !draftDateRange?.from || !draftDateRange?.to
                          }
                          onClick={applyDateRange}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Separator />
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
                {DASHBOARD_FILTER_DEFINITIONS.map((filter) => {
                  const dictionary = dictionaries[filter.key];
                  const selectedValues = normalizeValues(
                    state.filters[filter.key],
                  );
                  const draftValues = normalizeValues(
                    draftSelections[filter.key] ?? selectedValues,
                  );
                  const searchQuery =
                    searchQueries[filter.key]?.trim().toLowerCase() ?? '';
                  const filteredOptions = (dictionary?.options ?? []).filter(
                    (option) =>
                      option.label.toLowerCase().includes(searchQuery),
                  );
                  const isOpen = openFilterKey === filter.key;
                  const isDictionaryLoading = Boolean(
                    dictionaryLoading?.[filter.key],
                  );
                  const selectedCount = selectedValues.length;
                  const hasChanges =
                    selectedValues.length !== draftValues.length ||
                    selectedValues.some(
                      (value, index) => value !== draftValues[index],
                    );

                  return (
                    <Popover
                      key={filter.key}
                      open={isOpen}
                      onOpenChange={(open) => {
                        setOpenFilterKey(open ? filter.key : null);
                        if (open) {
                          onFilterOpen?.(filter.key);
                        }
                        if (!open) {
                          setSearchQueries((current) => ({
                            ...current,
                            [filter.key]: '',
                          }));
                        }
                      }}
                    >
                      <PopoverTrigger
                        render={
                          <Button
                            id={`filter-trigger-${toStableDomId(filter.key)}`}
                            type="button"
                            variant={
                              selectedCount > 0 ? 'secondary' : 'outline'
                            }
                            aria-label={`${filter.label} filter`}
                            aria-expanded={isOpen}
                            className="h-9 w-full justify-between rounded-lg px-3"
                          />
                        }
                      >
                        <span className="truncate text-left text-sm">
                          {getTriggerLabel(filter.label, selectedCount)}
                        </span>
                        <ChevronDownIcon
                          data-icon="inline-end"
                          className={cn(
                            'transition-transform',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="sales-dashboard-accent w-[15.5rem] p-0"
                      >
                        <div className="flex items-center gap-2 border-b px-2 py-2">
                          <div className="relative flex-1">
                            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="search"
                              aria-label={`Search ${filter.label} values`}
                              placeholder="Search values"
                              value={searchQueries[filter.key] ?? ''}
                              onChange={(event) =>
                                updateSearchQuery(
                                  filter.key,
                                  event.currentTarget.value,
                                )
                              }
                              onInput={(event) =>
                                updateSearchQuery(
                                  filter.key,
                                  event.currentTarget.value,
                                )
                              }
                              className="h-8 rounded-md border-0 bg-transparent pl-8 pr-2 shadow-none ring-0 focus-visible:border-transparent focus-visible:ring-0"
                            />
                          </div>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`About ${filter.label}`}
                                  className="shrink-0 rounded-full text-muted-foreground"
                                />
                              }
                            >
                              <CircleHelpIcon className="size-4" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-56 flex-col items-start gap-0.5 text-left">
                              <span className="font-medium">
                                {filter.label}
                              </span>
                              <span>{filter.description}</span>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="max-h-56 overflow-auto p-1.5">
                          <div className="flex flex-col gap-0.5">
                            {filteredOptions.map((option) => {
                              const checked = draftValues.includes(
                                option.value,
                              );

                              return (
                                <label
                                  key={option.value}
                                  className={cn(
                                    'flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
                                    getFilterOptionClassName(checked),
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
                                  <span className="truncate leading-tight">
                                    {option.label}
                                  </span>
                                </label>
                              );
                            })}
                            {filteredOptions.length === 0 ? (
                              <div className="px-2 py-4 text-sm text-muted-foreground">
                                {isDictionaryLoading
                                  ? 'Loading options...'
                                  : 'No matches'}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t px-2 py-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            aria-label={`Clear ${filter.label} filter`}
                            className="h-7 leading-none"
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
                            className={cn(
                              'h-7 leading-none',
                              getApplyButtonClassName(),
                            )}
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
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
