import * as React from 'react';
import { ArchitectureExplorerScreen } from '@/components/architecture/explorer-screen';
import { architectureManifest } from '@/lib/architecture/manifest';
import { sampleArchitectureReport } from '@/lib/architecture/report';

export default async function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex w-full flex-col gap-5 px-3 py-4 xl:px-5 2xl:px-6">
        <header className="grid gap-2 border-b border-border/50 pb-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end xl:gap-8">
          <div className="space-y-2">
            <p className="text-sm tracking-[0.24em] text-muted-foreground uppercase">
              Architecture Explainer
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Sales Performance Dashboard
            </h1>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground xl:justify-self-end">
            Interactive system map for understanding how UI refreshes turn into BigQuery
            queries, transformations, and rendered results.
          </p>
        </header>

        <ArchitectureExplorerScreen
          manifest={architectureManifest}
          report={sampleArchitectureReport}
        />
      </div>
    </main>
  );
}
