import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Gauge, Network } from 'lucide-react';

import { SuiteShell } from '@/components/suite-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { dashboardModules } from '@/lib/suite/modules';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <SuiteShell>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-[0.18em]">
              Dashboard modules
            </CardDescription>
            <CardTitle className="text-lg">
              Shared shell, local analytical intent
            </CardTitle>
            <CardDescription>
              Every dashboard below plugs into the same semantic runtime and
              suite shell, but keeps its own registry, mapper notes, and
              performance policy.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2.5">
              {dashboardModules.map((module) => (
                <Card
                  key={module.id}
                  className="transition-[box-shadow,ring-color] hover:ring-primary/20"
                >
                  <CardHeader className="gap-2">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-[15px]">
                        {module.title}
                      </CardTitle>
                      <Badge
                        variant={
                          module.status === 'active' ? 'secondary' : 'outline'
                        }
                      >
                        {module.status}
                      </Badge>
                    </div>
                    <CardDescription className="max-w-xl text-[13px] leading-5">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-0 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {module.registry.models.map((model) => (
                        <Badge key={model} variant="outline">
                          {model}
                        </Badge>
                      ))}
                    </div>
                    <Link
                      href={module.href}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                      )}
                    >
                      Open module
                      <ArrowRight data-icon="inline-end" className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <aside className="grid gap-3">
          <Card className="bg-card">
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <Network className="mt-0.5 size-4 text-primary" />
              <div className="flex flex-col gap-1.5">
                <CardDescription className="text-[11px] font-medium uppercase tracking-[0.18em]">
                  Runtime
                </CardDescription>
                <CardTitle className="text-[15px]">Shared runtime</CardTitle>
                <CardDescription>
                  The suite shell is the thin product layer. Semantic execution,
                  Lightdash compile, BigQuery execution, and future platform
                  policies stay in shared packages.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <Database className="mt-0.5 size-4 text-primary" />
              <div className="flex flex-col gap-1.5">
                <CardDescription className="text-[11px] font-medium uppercase tracking-[0.18em]">
                  Query model
                </CardDescription>
                <CardTitle className="text-[15px]">
                  Semantic-first dashboards
                </CardTitle>
                <CardDescription>
                  Each dashboard module declares semantic intent locally instead
                  of scattering measures and dimensions through route handlers
                  and UI components.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <Gauge className="mt-0.5 size-4 text-primary" />
              <div className="flex flex-col gap-1.5">
                <CardDescription className="text-[11px] font-medium uppercase tracking-[0.18em]">
                  Policy
                </CardDescription>
                <CardTitle className="text-[15px]">
                  Platform controls live
                </CardTitle>
                <CardDescription>
                  Caching, deduplication, and dashboard budgets now exist in the
                  shared runtime. The next layer is a richer semantic-system
                  architecture visualization.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </aside>
      </section>
    </SuiteShell>
  );
}
