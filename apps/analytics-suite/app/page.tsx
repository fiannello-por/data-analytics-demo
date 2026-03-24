import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Gauge, Network } from 'lucide-react';
import { SuiteShell } from '@/components/suite-shell';
import { dashboardModules } from '@/lib/suite/modules';

export default function HomePage() {
  return (
    <SuiteShell>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">
              Dashboard modules
            </p>
            <div className="space-y-3">
              {dashboardModules.map((module) => (
                <Link
                  key={module.id}
                  href={module.href}
                  className="group flex items-center justify-between rounded-2xl border border-border bg-surface-elevated px-4 py-4 transition-colors hover:border-primary/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{module.title}</h2>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-muted">
                        {module.status}
                      </span>
                    </div>
                    <p className="max-w-xl text-sm leading-6 text-muted">
                      {module.description}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Network className="mt-1 size-5 text-primary" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Shared runtime</h2>
                <p className="text-sm leading-6 text-muted">
                  The suite shell is the thin product layer. Semantic execution,
                  Lightdash compile, BigQuery execution, and future platform
                  policies stay in shared packages.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Database className="mt-1 size-5 text-primary" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Semantic-first dashboards</h2>
                <p className="text-sm leading-6 text-muted">
                  Each dashboard module declares semantic intent locally instead of
                  scattering measures and dimensions through route handlers and UI
                  components.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Gauge className="mt-1 size-5 text-primary" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Platform controls live</h2>
                <p className="text-sm leading-6 text-muted">
                  Caching, deduplication, and dashboard budgets now exist in the
                  shared runtime. The next layer is a richer semantic-system
                  architecture visualization.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </SuiteShell>
  );
}
