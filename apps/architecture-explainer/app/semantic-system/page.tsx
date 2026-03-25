import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { SemanticSystemMap } from '@/components/semantic-system/semantic-system-map';

export default async function SemanticSystemPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-4 xl:px-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Architecture map
          </Link>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Semantic system diagram
          </div>
        </div>

        <SemanticSystemMap />
      </div>
    </main>
  );
}
