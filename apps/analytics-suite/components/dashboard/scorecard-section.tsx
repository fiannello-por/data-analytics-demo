'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function ScorecardSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      {title ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
      ) : null}
      {children}
    </section>
  );
}
