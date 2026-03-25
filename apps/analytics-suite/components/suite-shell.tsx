import * as React from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Layers3, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { dashboardModules } from '@/lib/suite/modules';
import { cn } from '@/lib/utils';

type SuiteShellProps = {
  children: ReactNode;
  activeDashboardId?: string;
  activeSection?: 'dashboard' | 'platform';
};

export function SuiteShell({
  children,
  activeDashboardId,
  activeSection = 'dashboard',
}: SuiteShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5">
        <header>
          <Card className="bg-card">
            <CardHeader className="gap-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                  <Badge className="gap-2" variant="outline">
                    <Layers3 className="size-3.5" />
                    RevOps Analytics Suite
                  </Badge>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl sm:text-[2rem]">
                      Shared semantic analytics platform
                    </CardTitle>
                    <CardDescription className="max-w-2xl">
                      One internal suite shell, many dashboard modules. Each
                      dashboard keeps its own semantic registry while the runtime,
                      semantic contracts, and future tooling stay shared.
                    </CardDescription>
                  </div>
                </div>

                <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    Suite pattern in progress
                  </div>
                  <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                    This PoC slice now includes dashboard module boundaries,
                    shared cache semantics, and budget-aware platform reporting
                    on top of the shared runtime.
                  </p>
                </div>
              </div>

            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Separator className="bg-border" />
              <nav aria-label="Dashboards" className="flex">
                <div className="inline-flex flex-wrap gap-1 rounded-xl bg-card p-1 ring-1 ring-foreground/10">
                  <Link
                    href="/platform"
                    className={cn(
                      buttonVariants({
                        variant: activeSection === 'platform' ? 'secondary' : 'ghost',
                        size: 'sm',
                      }),
                    )}
                  >
                    Platform
                  </Link>
                  {dashboardModules.map((module) => {
                    const isActive = module.id === activeDashboardId;

                    return (
                      <Link
                        key={module.id}
                        href={module.href}
                        className={cn(
                          buttonVariants({
                            variant: isActive ? 'secondary' : 'ghost',
                            size: 'sm',
                          }),
                        )}
                      >
                        {module.title}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </CardContent>
          </Card>
        </header>
        <div className="mt-5 flex-1">{children}</div>
      </div>
    </div>
  );
}
