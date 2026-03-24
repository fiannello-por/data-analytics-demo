import * as React from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Layers3, Sparkles } from 'lucide-react';
import { dashboardModules } from '@/lib/suite/modules';

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
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 py-6">
        <header className="rounded-3xl border border-border bg-surface px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted">
                <Layers3 className="size-3.5" />
                RevOps Analytics Suite
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                  Shared semantic analytics platform
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted">
                  One internal suite shell, many dashboard modules. Each dashboard
                  keeps its own semantic registry while the runtime, semantic
                  contracts, and future tooling stay shared.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Sparkles className="size-4 text-accent" />
                Suite pattern in progress
              </div>
              <p className="mt-1 max-w-sm leading-5">
                This PoC slice now includes dashboard module boundaries, shared
                cache semantics, and budget-aware platform reporting on top of the
                shared runtime.
              </p>
            </div>
          </div>
          <nav aria-label="Dashboards" className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/platform"
              className={
                activeSection === 'platform'
                  ? 'rounded-full border border-primary bg-primary-soft px-4 py-2 text-sm font-medium text-foreground'
                  : 'rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground'
              }
            >
              Platform
            </Link>
            {dashboardModules.map((module) => {
              const isActive = module.id === activeDashboardId;

              return (
                <Link
                  key={module.id}
                  href={module.href}
                  className={
                    isActive
                      ? 'rounded-full border border-primary bg-primary-soft px-4 py-2 text-sm font-medium text-foreground'
                      : 'rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary/40 hover:text-foreground'
                  }
                >
                  {module.title}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="mt-6 flex-1">{children}</div>
      </div>
    </div>
  );
}
