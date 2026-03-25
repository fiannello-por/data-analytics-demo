import * as React from 'react';
import { ArrowDown, ArrowRight, Boxes, Database, Layers3, Workflow } from 'lucide-react';

import {
  semanticRuntimeStages,
  semanticSystemModules,
  servingEntities,
  sourceEntities,
} from '@/lib/semantic-system-manifest';

function FlowConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <div className="flex h-10 w-px bg-gradient-to-b from-border/20 via-border to-border/20" />
      {label ? (
        <div className="rounded-full border border-border/60 bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </div>
      ) : null}
      <div className="flex size-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-[0_10px_24px_-18px_rgba(0,0,0,0.85)]">
        <ArrowDown className="size-3.5" />
      </div>
    </div>
  );
}

function FlowNode({
  eyebrow,
  title,
  description,
  children,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-[24px] border border-border/70 bg-card px-6 py-6 shadow-[0_18px_48px_-40px_rgba(0,0,0,0.9)]">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-foreground">
            {title}
          </h2>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

function RegistryChip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
      {children}
    </li>
  );
}

function RuntimeStageCard({
  title,
  description,
  isLast,
}: {
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex min-h-[172px] flex-1 flex-col rounded-2xl border border-border/60 bg-background/55 px-4 py-4 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Runtime stage
      </p>
      <h3 className="mt-2 text-[19px] font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      {!isLast ? (
        <div className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 items-center lg:flex">
          <div className="h-px w-8 bg-border/80" />
          <div className="flex size-7 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground">
            <ArrowRight className="size-3.5" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SemanticSystemMap() {
  return (
    <section className="mx-auto flex w-full max-w-[1260px] flex-col items-stretch">
      <FlowNode
        eyebrow="Step 1"
        title="Dashboard modules with local registries"
        description="Each dashboard declares its own semantic query menu locally. The shared platform does not hardcode dashboard intent; it only provides the execution system."
        icon={Layers3}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {semanticSystemModules.map((module) => (
            <article
              key={module.id}
              className="rounded-2xl border border-border/60 bg-background/50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Dashboard module
                  </p>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-foreground">
                    {module.title}
                  </h3>
                </div>
                <div className="rounded-full border border-border/60 bg-card px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Local semantic registry
                </div>
              </div>
              <ul className="mt-5 grid gap-2">
                {module.registryItems.map((item) => (
                  <RegistryChip key={item}>{item}</RegistryChip>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </FlowNode>

      <FlowConnector label="declares semantic intent" />

      <FlowNode
        eyebrow="Step 2"
        title="Shared analytics runtime"
        description="This is the orchestration subsystem. It receives semantic requests from dashboard modules, compiles them through Lightdash, executes them in BigQuery, and returns normalized payloads with platform telemetry."
        icon={Workflow}
      >
        <div className="rounded-[22px] border border-border/60 bg-muted/20 p-4">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Boxes className="size-3.5" />
            Internal runtime flow
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute left-10 right-10 top-1/2 hidden h-px -translate-y-1/2 bg-border/50 lg:block" />
            <div className="grid gap-4 lg:grid-cols-3">
            {semanticRuntimeStages.map((stage, index) => (
              <RuntimeStageCard
                key={stage.id}
                title={stage.title}
                description={stage.description}
                isLast={index === semanticRuntimeStages.length - 1}
              />
            ))}
            </div>
          </div>
        </div>
      </FlowNode>

      <FlowConnector label="reads optimized serving entities" />

      <FlowNode
        eyebrow="Step 3"
        title="App-serving entities"
        description="The runtime does not query raw business tables directly for every dashboard interaction. It executes against narrow, purpose-built serving entities designed for BI performance and reuse."
        icon={Database}
      >
        <div className="grid gap-3">
          {servingEntities.map((entity) => (
            <div
              key={entity}
              className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-sm text-foreground"
            >
              {entity}
            </div>
          ))}
        </div>
      </FlowNode>

      <FlowConnector label="derived from canonical source" />

      <FlowNode
        eyebrow="Step 4"
        title="Canonical source entity"
        description="All serving entities in this PoC derive from the same underlying warehouse entity, keeping business meaning centralized and avoiding hidden metric drift across dashboards."
        icon={Database}
      >
        <div className="grid gap-3">
          {sourceEntities.map((entity) => (
            <div
              key={entity}
              className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-sm font-medium text-foreground"
            >
              {entity}
            </div>
          ))}
        </div>
      </FlowNode>
    </section>
  );
}
