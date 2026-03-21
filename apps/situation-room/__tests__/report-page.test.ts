import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';

const getScorecardReportMock = vi.fn();

vi.mock('@/lib/server/get-scorecard-report', () => ({
  getScorecardReport: getScorecardReportMock,
}));

vi.mock('@/components/report-content', () => ({
  ReportContent: () => null,
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const { default: ReportPage } = await import('../app/page');
  return ReportPage({
    searchParams: Promise.resolve(searchParams),
  });
}

describe('ReportPage', () => {
  it('renders a validation error for repeated supported query params', async () => {
    const element = await renderPage({
      Division: ['Enterprise', 'SMB'],
    });

    const markup = renderToStaticMarkup(element as ReactElement);

    expect(markup).toContain(
      'Repeated query parameter &quot;Division&quot; is not supported.',
    );
    expect(getScorecardReportMock).not.toHaveBeenCalled();
  });

  it('renders a validation error for unsupported date ranges', async () => {
    const element = await renderPage({
      DateRange: 'last_30_days',
    });

    expect(renderToStaticMarkup(element as ReactElement)).toContain(
      'Unsupported DateRange filter: last_30_days. Only current_year is supported.',
    );
    expect(getScorecardReportMock).not.toHaveBeenCalled();
  });

  it('rejects when the report loader fails', async () => {
    getScorecardReportMock.mockRejectedValueOnce(new Error('loader failed'));

    await expect(
      renderPage({
        Division: 'Enterprise',
      }),
    ).rejects.toThrow('loader failed');
  });
});
