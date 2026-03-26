'use client';

import * as React from 'react';
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import { cn } from '@/lib/utils';

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  );
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden will-change-[height] transition-[height] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        'data-[open]:h-[var(--collapsible-panel-height)] data-[closed]:h-0',
        'data-[starting-style]:h-0 data-[ending-style]:h-0',
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
