import * as React from 'react';
import { notFound } from 'next/navigation';

import { SuiteShell } from '@/components/suite-shell';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
        <Card>
          <CardHeader>
            <CardDescription className="text-sm font-medium uppercase tracking-[0.22em]">
              {module.title}
            </CardDescription>
            <CardTitle className="text-2xl">
              Dashboard-local semantic registry
            </CardTitle>
            <CardDescription className="max-w-3xl">
              This page is the module boundary proof. The dashboard describes
              its own semantic intent locally while the suite shell and future
              runtime concerns remain shared.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              {module.registry.surfaces.map((surface) => (
                <Card
                  key={surface.id}
                  className="border-border/60 bg-surface-elevated/80"
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{surface.label}</CardTitle>
                      <Badge variant="outline">{surface.id}</Badge>
                    </div>
                    <CardDescription>{surface.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <dl className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Measures
                        </dt>
                        <dd className="text-sm leading-6 text-foreground">
                          {surface.measures.length > 0
                            ? surface.measures.join(', ')
                            : 'None'}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Dimensions
                        </dt>
                        <dd className="text-sm leading-6 text-foreground">
                          {surface.dimensions?.length
                            ? surface.dimensions.join(', ')
                            : 'None'}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Filters
                        </dt>
                        <dd className="text-sm leading-6 text-foreground">
                          {surface.filters?.length
                            ? surface.filters.join(', ')
                            : 'None'}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Module metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Dashboard ID
                  </dt>
                  <dd>{module.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Status</dt>
                  <dd>{module.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Semantic models
                  </dt>
                  <dd>{module.registry.models.join(', ')}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget policy</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Max queries per load
                  </dt>
                  <dd>{module.budgetPolicy.maxQueryCount}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Target bytes
                  </dt>
                  <dd>
                    {module.budgetPolicy.targetBytesProcessed.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Target execution
                  </dt>
                  <dd>{module.budgetPolicy.targetExecutionDurationMs} ms</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Warning ratio
                  </dt>
                  <dd>{module.budgetPolicy.warningRatio ?? 0.8}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapper notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                {module.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </section>
    </SuiteShell>
  );
}
