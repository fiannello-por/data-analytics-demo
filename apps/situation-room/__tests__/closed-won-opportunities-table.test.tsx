// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClosedWonOpportunitiesTable } from '@/components/dashboard/closed-won-opportunities-table';
import type { ClosedWonOpportunitiesPayload } from '@/lib/dashboard/contracts';

function buildPayload(): ClosedWonOpportunitiesPayload {
  return {
    category: 'New Logo',
    currentWindowLabel: 'Jan 1, 2026 - Mar 23, 2026',
    lastRefreshedAt: '2026-03-23T00:00:00.000Z',
    rows: Array.from({ length: 11 }, (_, index) => {
      const rank = index + 1;

      return {
        accountName: `Account ${String(rank).padStart(2, '0')}`,
        accountLink: `https://example.com/accounts/${rank}`,
        opportunityName: `Opportunity ${String(rank).padStart(2, '0')}`,
        opportunityLink: `https://example.com/opportunities/${rank}`,
        closeDate: `2026-03-${String(rank).padStart(2, '0')}`,
        createdDate: `2026-02-${String(rank).padStart(2, '0')}`,
        division: 'Enterprise',
        type: 'New',
        productFamily: 'Core',
        bookingPlanOppType2025: 'Standard',
        owner: `Owner ${rank}`,
        sdr: `SDR ${rank}`,
        oppRecordType: 'POR',
        age: `${12 - rank}d`,
        se: `SE ${rank}`,
        quarter: '2026-Q1',
        contractStartDate: `2026-04-${String(rank).padStart(2, '0')}`,
        users: String(rank * 10),
        acv: `$${(12 - rank) * 1000}`,
      };
    }),
  };
}

describe('ClosedWonOpportunitiesTable', { timeout: 10000 }, () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('supports sortable headers and pagination controls', async () => {
    await act(async () => {
      root.render(<ClosedWonOpportunitiesTable payload={buildPayload()} />);
    });

    const getFirstAccountName = () =>
      container.querySelector('[data-slot="table-body"] tr td')?.textContent ?? '';

    expect(container.textContent).toContain('1-10 of 11');
    expect(getFirstAccountName()).toContain('Account 01');

    const usersSortButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Users'),
    );

    expect(usersSortButton).toBeTruthy();

    await act(async () => {
      usersSortButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(getFirstAccountName()).toContain('Account 01');

    await act(async () => {
      usersSortButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(getFirstAccountName()).toContain('Account 11');

    const nextButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Next'),
    );

    expect(nextButton).toBeTruthy();

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('11-11 of 11');
    expect(container.textContent).toContain('Account 01');
  });
});
