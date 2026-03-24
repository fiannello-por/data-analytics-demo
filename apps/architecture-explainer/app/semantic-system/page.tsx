import * as React from 'react';
import Link from 'next/link';

import { SemanticSystemMap } from '@/components/semantic-system/semantic-system-map';

export default async function SemanticSystemPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 xl:px-6">
        <header className="rounded-3xl border border-border bg-card px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
                Semantic system
              </p>
              <h1 className="text-4xl font-semibold tracking-tight">
                Hierarchical architecture view
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                This route explains the semantic BI platform as nested subsystems
                instead of a flat graph, so dashboard modules, local registries,
                the shared runtime, and serving entities can be understood at the
                right conceptual level.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
            >
              Back to architecture map
            </Link>
          </div>
        </header>

        <SemanticSystemMap />
      </div>
    </main>
  );
}
