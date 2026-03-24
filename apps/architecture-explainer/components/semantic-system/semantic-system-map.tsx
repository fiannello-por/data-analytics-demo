import * as React from 'react';

import {
  semanticRuntimeStages,
  semanticSystemModules,
  servingEntities,
  sourceEntities,
} from '@/lib/semantic-system-manifest';

export function SemanticSystemMap() {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
            Semantic system
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Dashboard modules with local registries
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {semanticSystemModules.map((module) => (
              <article
                key={module.id}
                className="rounded-2xl border border-border bg-secondary/35 p-5"
              >
                <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                  Dashboard module
                </p>
                <h3 className="mt-2 text-xl font-semibold">{module.title}</h3>
                <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Local semantic registry
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {module.registryItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
            Shared subsystem
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Shared analytics runtime
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {semanticRuntimeStages.map((stage) => (
              <article
                key={stage.id}
                className="rounded-2xl border border-border bg-secondary/35 p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Runtime stage
                </p>
                <h3 className="mt-2 text-lg font-semibold">{stage.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {stage.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
            Serving layer
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            App-serving entities
          </h2>
          <ul className="mt-5 space-y-3">
            {servingEntities.map((entity) => (
              <li
                key={entity}
                className="rounded-2xl border border-border bg-secondary/35 px-4 py-3 text-sm"
              >
                {entity}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
            Source entity
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Canonical warehouse origin
          </h2>
          <ul className="mt-5 space-y-3">
            {sourceEntities.map((entity) => (
              <li
                key={entity}
                className="rounded-2xl border border-border bg-secondary/35 px-4 py-3 text-sm"
              >
                {entity}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}
