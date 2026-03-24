import * as React from 'react';
import { notFound } from 'next/navigation';
import { SuiteShell } from '@/components/suite-shell';
import { getDashboardModule } from '@/lib/suite/modules';

export default async function DashboardModulePage({
  params,
}: {
  params: Promise<{ dashboardId: string }>;
}) {
  const { dashboardId } = await params;
  const module = getDashboardModule(dashboardId);

  if (!module) {
    notFound();
  }

  return (
    <SuiteShell activeDashboardId={module.id}>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted">
                {module.title}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                Dashboard-local semantic registry
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted">
                This page is the module boundary proof. The dashboard describes its
                own semantic intent locally while the suite shell and future runtime
                concerns remain shared.
              </p>
            </div>

            <div className="space-y-4">
              {module.registry.surfaces.map((surface) => (
                <article
                  key={surface.id}
                  className="rounded-2xl border border-border bg-surface-elevated p-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{surface.label}</h3>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-muted">
                        {surface.id}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-muted">
                      {surface.description}
                    </p>
                  </div>
                  <dl className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                        Measures
                      </dt>
                      <dd className="text-sm leading-6 text-foreground">
                        {surface.measures.length > 0
                          ? surface.measures.join(', ')
                          : 'None'}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                        Dimensions
                      </dt>
                      <dd className="text-sm leading-6 text-foreground">
                        {surface.dimensions?.length
                          ? surface.dimensions.join(', ')
                          : 'None'}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                        Filters
                      </dt>
                      <dd className="text-sm leading-6 text-foreground">
                        {surface.filters?.length
                          ? surface.filters.join(', ')
                          : 'None'}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Module metadata</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-muted">Dashboard ID</dt>
                <dd>{module.id}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Status</dt>
                <dd>{module.status}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Semantic models</dt>
                <dd>{module.registry.models.join(', ')}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Budget policy</h3>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-muted">Max queries per load</dt>
                <dd>{module.budgetPolicy.maxQueryCount}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Target bytes</dt>
                <dd>{module.budgetPolicy.targetBytesProcessed.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Target execution</dt>
                <dd>{module.budgetPolicy.targetExecutionDurationMs} ms</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Warning ratio</dt>
                <dd>{module.budgetPolicy.warningRatio ?? 0.8}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Mapper notes</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
              {module.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </SuiteShell>
  );
}
