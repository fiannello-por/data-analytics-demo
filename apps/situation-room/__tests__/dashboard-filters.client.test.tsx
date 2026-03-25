// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import type {
  DashboardState,
  FilterDictionaryPayload,
} from '@/lib/dashboard/contracts';
import {
  addDashboardFilterValue,
  removeDashboardFilterValue,
} from '@/lib/dashboard/query-inputs';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    React.createElement('button', props, children),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement('section', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('header', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLSpanElement>) =>
    React.createElement('span', props, children),
}));

vi.mock('@/components/ui/collapsible', () => {
  const React = require('react') as typeof import('react');

  const CollapsibleContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  } | null>(null);

  return {
    Collapsible: ({
      children,
      open,
      defaultOpen,
      onOpenChange,
    }: {
      children: React.ReactNode;
      open?: boolean;
      defaultOpen?: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => {
      const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
      const isControlled = open !== undefined;
      const resolvedOpen = isControlled ? open : internalOpen;

      const setOpen = (nextOpen: boolean) => {
        if (!isControlled) {
          setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
      };

      return React.createElement(
        CollapsibleContext.Provider,
        { value: { open: resolvedOpen, setOpen } },
        React.createElement('div', null, children),
      );
    },
    CollapsibleTrigger: ({
      children,
      render,
      ...props
    }: {
      children: React.ReactNode;
      render: React.ReactElement;
    }) => {
      const context = React.useContext(CollapsibleContext);
      return React.cloneElement(
        render as React.ReactElement<any>,
        {
          ...props,
          onClick: () => context?.setOpen(!context.open),
          'aria-expanded': context?.open,
        } as any,
        children,
      );
    },
    CollapsibleContent: ({ children }: { children: React.ReactNode }) => {
      const context = React.useContext(CollapsibleContext);
      return context?.open ? React.createElement('div', null, children) : null;
    },
  };
});

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverTrigger: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render: React.ReactElement;
  }) => React.cloneElement(render, undefined, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  PopoverDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  TooltipTrigger: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render: React.ReactElement;
  }) => React.cloneElement(render, undefined, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    onSelect,
  }: {
    onSelect?: (range: DayPickerDateRange | undefined) => void;
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        'aria-label': 'Select Q2 2026 range',
        onClick: () =>
          onSelect?.({
            from: new Date('2026-04-01T00:00:00.000Z'),
            to: new Date('2026-06-30T00:00:00.000Z'),
          }),
      },
      'Calendar',
    ),
}));

function FiltersHarness({
  dictionaries,
}: {
  dictionaries: Record<string, FilterDictionaryPayload>;
}) {
  const [state, setState] = React.useState<DashboardState>({
    activeCategory: 'New Logo',
    selectedTileId: 'new_logo_sql',
    filters: {},
    dateRange: { startDate: '2026-01-01', endDate: '2026-03-31' },
    previousDateRange: { startDate: '2025-01-01', endDate: '2025-03-31' },
    trendGrain: 'weekly',
  });

  return (
    <DashboardFilters
      state={state}
      dictionaries={dictionaries}
      lastRefreshedAt="2026-03-31T12:00:00.000Z"
      renderedAt="2026-03-31T12:05:00.000Z"
      onFilterValueAdd={(key, value) =>
        setState((current) => ({
          ...current,
          filters: addDashboardFilterValue(current.filters, key, value),
        }))
      }
      onFilterValueRemove={(key, value) =>
        setState((current) => ({
          ...current,
          filters: removeDashboardFilterValue(current.filters, key, value),
        }))
      }
      onDateRangeApply={(dateRange) =>
        setState((current) => ({
          ...current,
          dateRange,
          previousDateRange: {
            startDate: '2025-04-01',
            endDate: '2025-06-30',
          },
        }))
      }
    />
  );
}

describe('dashboard filters', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <FiltersHarness
          dictionaries={{
            Division: {
              filterKey: 'Division',
              options: [
                { value: 'Enterprise', label: 'Enterprise', sortOrder: 1 },
                { value: 'SMB', label: 'SMB', sortOrder: 2 },
              ],
            } as FilterDictionaryPayload,
          }}
        />,
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    vi.unstubAllGlobals();
    container.remove();
  });

  it('counts the date range as an active filter in the summary badge', () => {
    expect(container.textContent).toContain('1 active filter');
  });

  it('shows a data freshness label in the controls summary', () => {
    expect(container.textContent).toContain('Updated 5 min ago');
    expect(container.textContent).toContain('Last updated at Mar 31, 2026, 12:00 PM UTC');
  });

  it('keeps multi-select choices local until apply and lets users reopen to change selections', async () => {
    const divisionTrigger = container.querySelector(
      'button[aria-label="Division filter"]',
    ) as HTMLButtonElement | null;
    expect(divisionTrigger).not.toBeNull();
    expect(container.textContent).toContain('Division');

    await act(async () => {
      divisionTrigger!.click();
    });

    const enterpriseCheckbox = container.querySelector(
      'input[aria-label="Select Enterprise for Division"]',
    ) as HTMLInputElement | null;
    const smbCheckbox = container.querySelector(
      'input[aria-label="Select SMB for Division"]',
    ) as HTMLInputElement | null;
    const applyButton = container.querySelector(
      'button[aria-label="Apply Division filter"]',
    ) as HTMLButtonElement | null;

    expect(enterpriseCheckbox).not.toBeNull();
    expect(smbCheckbox).not.toBeNull();
    expect(applyButton).not.toBeNull();

    await act(async () => {
      enterpriseCheckbox!.click();
      smbCheckbox!.click();
    });

    expect(container.textContent).toContain('Division');

    await act(async () => {
      applyButton!.click();
    });

    expect(container.textContent).toContain('Division · 2');

    await act(async () => {
      divisionTrigger!.click();
    });

    const smbCheckboxFinal = container.querySelector(
      'input[aria-label="Select SMB for Division"]',
    ) as HTMLInputElement | null;
    const applyButtonFinal = container.querySelector(
      'button[aria-label="Apply Division filter"]',
    ) as HTMLButtonElement | null;

    await act(async () => {
      smbCheckboxFinal!.click();
      applyButtonFinal!.click();
    });

    expect(container.textContent).toContain('Division · 1');
  });

  it('shows a search field and info button inside each filter popover', () => {
    expect(
      container.querySelector('input[aria-label="Search Division values"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="About Division"]'),
    ).not.toBeNull();
  });

  it('filters option labels locally inside the filter popover search', async () => {
    const searchInput = container.querySelector(
      'input[aria-label="Search Division values"]',
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();
    const divisionPopoverCandidate = searchInput!.parentElement?.parentElement?.parentElement as HTMLElement | null;
    expect(divisionPopoverCandidate).not.toBeNull();
    const divisionPopover = divisionPopoverCandidate!;

    await act(async () => {
      searchInput!.value = 'enter';
      searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(divisionPopover.textContent).toContain('Enterprise');
    expect(divisionPopover.textContent).not.toContain('SMB');
    expect(divisionPopover.textContent).not.toContain('No matches');

    await act(async () => {
      searchInput!.value = 'zzz';
      searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(divisionPopover.textContent).toContain('No matches');
  });

  it('applies a draft date range only after the date apply action', async () => {
    expect(container.textContent).toContain('Jan 1, 2026 - Mar 31, 2026');

    const applyDateButton = container.querySelector(
      'button[aria-label="Apply date range"]',
    ) as HTMLButtonElement | null;
    const dateTrigger = container.querySelector(
      'button[aria-label="Date range filter"]',
    ) as HTMLButtonElement | null;
    expect(applyDateButton).not.toBeNull();
    expect(dateTrigger).not.toBeNull();

    const calendarButton = container.querySelector(
      'button[aria-label="Select Q2 2026 range"]',
    ) as HTMLButtonElement | null;
    expect(calendarButton).not.toBeNull();

    await act(async () => {
      dateTrigger!.click();
      calendarButton!.click();
    });

    expect(container.textContent).toContain('Jan 1, 2026 - Mar 31, 2026');

    await act(async () => {
      applyDateButton!.click();
    });

    expect(container.textContent).toContain('Apr 1, 2026 - Jun 30, 2026');
  });

  it('starts expanded and lets the header collapse and reopen the global controls', async () => {
    expect(container.textContent).toContain('Prior period: 2025-01-01 to 2025-03-31');
    expect(container.textContent).toContain('Current period: Jan 1, 2026 - Mar 31, 2026');
    expect(
      container.querySelector('button[aria-label="Date range filter"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Division filter"]'),
    ).not.toBeNull();

    const toggleButton = container.querySelector(
      'button[aria-label="Toggle global controls"]',
    ) as HTMLButtonElement | null;
    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');

    await act(async () => {
      toggleButton!.click();
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).toContain('Prior period: 2025-01-01 to 2025-03-31');
    expect(
      container.querySelector('button[aria-label="Date range filter"]'),
    ).toBeNull();
    expect(
      container.querySelector('button[aria-label="Division filter"]'),
    ).toBeNull();

    await act(async () => {
      toggleButton!.click();
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Prior period: 2025-01-01 to 2025-03-31');
    expect(
      container.querySelector('button[aria-label="Date range filter"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Division filter"]'),
    ).not.toBeNull();
  });
});
