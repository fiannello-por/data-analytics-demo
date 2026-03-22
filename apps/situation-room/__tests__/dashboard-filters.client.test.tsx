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
});
