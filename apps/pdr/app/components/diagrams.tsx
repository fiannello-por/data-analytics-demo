import { Fragment } from 'react';

/* ───────────────────────────────────────────
   Arrow — inline SVG, respects currentColor
   ─────────────────────────────────────────── */

function Arrow() {
  return (
    <div className="flex shrink-0 items-center self-center px-1 text-fd-muted-foreground max-sm:rotate-90 max-sm:py-1">
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
        <path
          d="M0 5h16m-4-4l5 4-5 4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function BiArrow() {
  return (
    <div className="flex shrink-0 items-center self-center px-1 text-fd-muted-foreground max-sm:rotate-90 max-sm:py-1">
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
        <path
          d="M4 1l-4 4 4 4M16 1l4 4-4 4M2 5h16"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ───────────────────────────────────────────
   FlowDiagram — boxes connected by arrows
   ─────────────────────────────────────────── */

interface FlowStep {
  label: string;
  sublabel?: string;
  tag?: string;
  details?: string[];
  biArrow?: boolean;
}

function getStepStyles(tag?: string) {
  const t = tag?.toLowerCase() ?? '';
  if (t === 'new')
    return {
      box: 'border-fd-primary/30 bg-fd-primary/10',
      tag: 'text-fd-primary',
    };
  if (t === 'phase 2')
    return {
      box: 'border-purple-500/30 bg-purple-500/10',
      tag: 'text-purple-400',
    };
  return {
    box: 'border-fd-border bg-fd-muted',
    tag: 'text-fd-muted-foreground/60',
  };
}

export function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="not-prose my-8 flex flex-wrap items-stretch gap-y-3 sm:flex-nowrap">
      {steps.map((step, i) => {
        const styles = getStepStyles(step.tag);
        return (
          <Fragment key={i}>
            {i > 0 && (step.biArrow ? <BiArrow /> : <Arrow />)}
            <div
              className={`flex min-w-0 flex-1 flex-col justify-between border p-3 max-sm:w-full ${styles.box}`}
            >
              <div>
                <div className="text-sm font-medium leading-snug">
                  {step.label}
                </div>
                {step.sublabel && (
                  <div className="mt-0.5 text-xs text-fd-muted-foreground">
                    {step.sublabel}
                  </div>
                )}
                {step.details && (
                  <div className="mt-2 space-y-0.5">
                    {step.details.map((d, j) => (
                      <div
                        key={j}
                        className="text-xs leading-relaxed text-fd-muted-foreground"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {step.tag && (
                <div
                  className={`mt-2 text-[0.625rem] font-semibold uppercase tracking-wider ${styles.tag}`}
                >
                  {step.tag}
                </div>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/* ───────────────────────────────────────────
   Pipeline — simple inline labels with arrows
   ─────────────────────────────────────────── */

export function Pipeline({ steps }: { steps: string[] }) {
  return (
    <div className="not-prose my-6 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-sm">
      {steps.map((step, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span className="text-fd-muted-foreground/50 select-none">→</span>
          )}
          <span className="rounded-sm border border-fd-border bg-fd-muted px-2 py-0.5 font-medium">
            {step}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────
   BranchFlow — trigger fans out to outputs
   Tree-fork layout: trigger → stem → bar → drops → boxes
   ─────────────────────────────────────────── */

interface Branch {
  label: string;
  sublabel?: string;
}

export function BranchFlow({
  trigger,
  branches,
}: {
  trigger?: string;
  branches: Branch[];
}) {
  return (
    <div className={`not-prose ${trigger ? 'my-8' : '-mt-5 mb-8'}`}>
      {/* Trigger box — centered */}
      {trigger && (
        <div className="flex justify-center">
          <div className="border border-fd-primary/30 bg-fd-primary/10 px-5 py-2 text-center text-sm font-medium">
            {trigger}
          </div>
        </div>
      )}

      {/* Vertical stem from trigger (or from element above) */}
      <div className="flex justify-center">
        <div className="h-5 w-px bg-fd-border" />
      </div>

      {/* Horizontal bar spanning all branches */}
      <div className="mx-auto flex" style={{ width: `${Math.min(branches.length * 200, 100)}%`, maxWidth: '100%' }}>
        <div className="flex w-full items-start">
          {branches.map((_, i) => (
            <div key={i} className="flex flex-1 justify-center">
              {/* Left half of bar + right half of bar, forming continuous line */}
              <div className="flex w-full items-start">
                <div className={`h-px flex-1 ${i === 0 ? 'bg-transparent' : 'bg-fd-border'}`} style={{ marginTop: 0 }} />
                <div className="flex flex-col items-center">
                  {/* Junction dot */}
                  <div className="h-px w-px" />
                </div>
                <div className={`h-px flex-1 ${i === branches.length - 1 ? 'bg-transparent' : 'bg-fd-border'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Branch drops + output boxes */}
      <div className="flex gap-3 max-sm:flex-col">
        {branches.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center">
            {/* Vertical drop line */}
            <div className="h-4 w-px bg-fd-border max-sm:hidden" />
            {/* Small arrow */}
            <div className="text-fd-border max-sm:hidden">
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                <path d="M0 0l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>
            {/* Output box */}
            <div className="mt-1 w-full border border-fd-border bg-fd-muted px-3 py-2 text-center text-sm max-sm:text-left">
              <div className="font-medium">{b.label}</div>
              {b.sublabel && (
                <div className="mt-0.5 text-xs text-fd-muted-foreground">
                  {b.sublabel}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────
   Timeline — parallel tracks across phases
   ─────────────────────────────────────────── */

interface Phase {
  label: string;
  description: string;
}

interface Track {
  label: string;
  startPhase: number;
  note?: string;
}

export function Timeline({
  phases,
  tracks,
}: {
  phases: Phase[];
  tracks: Track[];
}) {
  return (
    <div className="not-prose my-8 overflow-x-auto">
      {/* Phase markers */}
      <div className="mb-1 flex">
        <div className="w-28 shrink-0" />
        <div className="flex flex-1">
          {phases.map((p, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="text-[0.625rem] font-semibold uppercase tracking-wider text-fd-muted-foreground">
                {p.label}
              </div>
              <div className="text-xs text-fd-muted-foreground/70">
                {p.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mb-3 flex items-center">
        <div className="w-28 shrink-0" />
        <div className="h-px flex-1 bg-fd-border" />
      </div>

      {/* Tracks */}
      {tracks.map((t, i) => (
        <div key={i} className="mb-2 flex items-center">
          <div className="w-28 shrink-0 pr-3 text-right text-xs font-medium">
            {t.label}
          </div>
          <div className="relative flex-1" style={{ height: '1.5rem' }}>
            <div
              className="absolute inset-y-0 rounded-sm bg-fd-primary/25"
              style={{
                left: `${(t.startPhase / phases.length) * 100}%`,
                right: '0%',
              }}
            >
              {t.note && (
                <span className="absolute inset-y-0 right-2 flex items-center text-[0.625rem] text-fd-muted-foreground">
                  {t.note}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
