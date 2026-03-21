import React from 'react';
import { getScorecardReport } from '@/lib/server/get-scorecard-report';
import { ReportContent } from '@/components/report-content';
import {
  parseReportRequestFilters,
  ReportRequestError,
} from '@/lib/report-request';

interface ReportPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function ReportErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-10 md:px-10 md:py-14">
      <header className="pb-8 border-b border-border-subtle">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-text-tertiary mb-2">
          Situation Room
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary leading-tight">
          Sales Performance Report
        </h1>
      </header>

      <section className="mt-8 rounded-lg border border-negative/20 bg-negative-bg px-4 py-3">
        <p className="text-sm text-negative">{message}</p>
      </section>
    </main>
  );
}

export default async function ReportPage({
  searchParams,
}: ReportPageProps) {
  try {
    const filters = parseReportRequestFilters(
      await (searchParams ?? Promise.resolve({})),
    );
    const initialData = await getScorecardReport(filters);

    return <ReportContent initialData={initialData.data} />;
  } catch (error) {
    if (error instanceof ReportRequestError || error instanceof Error) {
      return <ReportErrorState message={error.message} />;
    }

    return <ReportErrorState message="Unable to load the report." />;
  }
}
