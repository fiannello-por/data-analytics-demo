// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

const selectValues = new Map<string, string | undefined>();

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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLSpanElement>) =>
    React.createElement('span', props, children),
}));

vi.mock('@/components/ui/select', () => {
  const ReactLocal = require('react') as typeof React;
  const SelectContext = ReactLocal.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
  } | null>(null);

  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) =>
      ReactLocal.createElement(
        SelectContext.Provider,
        { value: { value, onValueChange } },
        children,
      ),
    SelectContent: ({ children }: { children: React.ReactNode }) =>
      ReactLocal.createElement('div', null, children),
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => ReactLocal.createElement('div', { 'data-item-value': value }, children),
    SelectTrigger: ({
      children,
      'aria-label': ariaLabel,
    }: {
      children: React.ReactNode;
      'aria-label'?: string;
    }) => {
      const context = ReactLocal.useContext(SelectContext);
      const key = ariaLabel ?? 'unknown';
      selectValues.set(key, context?.value);
      return ReactLocal.createElement(
        'button',
        {
          type: 'button',
          'aria-label': ariaLabel,
          'data-value': context?.value ?? '',
          onClick: () => context?.onValueChange?.('Enterprise'),
        },
        children,
      );
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      ReactLocal.createElement('span', null, placeholder),
  };
});

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
    />
  );
}

describe('dashboard filters', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    selectValues.clear();
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

  it('resets the additive filter picker after selection and allows re-adding a removed value', async () => {
    const divisionTrigger = container.querySelector(
      'button[aria-label="Division"]',
    ) as HTMLButtonElement | null;
    expect(divisionTrigger).not.toBeNull();
    expect(selectValues.get('Division') ?? '').toBe('');

    await act(async () => {
      divisionTrigger!.click();
    });

    expect(container.textContent).toContain('Enterprise');
    expect(selectValues.get('Division') ?? '').toBe('');

    const removeButton = container.querySelector(
      'button[aria-label="Remove Enterprise from Division"]',
    ) as HTMLButtonElement | null;
    expect(removeButton).not.toBeNull();

    await act(async () => {
      removeButton!.click();
    });

    expect(container.textContent).not.toContain('Remove Enterprise from Division');
    expect(selectValues.get('Division') ?? '').toBe('');

    await act(async () => {
      divisionTrigger!.click();
    });

    expect(container.textContent).toContain('Enterprise');
  });
});
