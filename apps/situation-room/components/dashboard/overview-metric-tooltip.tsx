'use client';

import * as React from 'react';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function OverviewMetricTooltip({
  label,
  fullValue,
  previousValue,
  delta,
  description,
  calculation: _calculation,
  triggerClassName,
  contentClassName,
  labelContent,
  children,
}: {
  label: string;
  fullValue: string;
  previousValue: string;
  delta: React.ReactNode;
  description: string;
  calculation: string;
  triggerClassName?: string;
  contentClassName?: string;
  labelContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [alignOffset, setAlignOffset] = React.useState(0);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const normalized = (event.clientX - rect.left) / rect.width - 0.5;
      setAlignOffset(clamp(normalized * 18, -9, 9));
    },
    [],
  );

  const resetOffset = React.useCallback(() => {
    setAlignOffset(0);
  }, []);

  return (
    <div className="flex flex-col items-start gap-2 text-left">
      {labelContent}
      <Tooltip>
        <TooltipTrigger
          className={triggerClassName}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetOffset}
          onBlur={resetOffset}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          alignOffset={alignOffset}
          arrowOffset={alignOffset}
          className={contentClassName}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,8.5rem)_auto_minmax(0,11rem)] sm:items-start">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-70">
                {label}
              </p>
              <div className="flex w-full items-center justify-between gap-4">
                <span className="opacity-70">Current</span>
                <span>{fullValue}</span>
              </div>
              <div className="flex w-full items-center justify-between gap-4">
                <span className="opacity-70">Previous</span>
                <span>{previousValue}</span>
              </div>
              <div className="flex w-full items-center justify-between gap-4">
                <span className="opacity-70">Change</span>
                {delta}
              </div>
            </div>
            <Separator
              orientation="vertical"
              className="hidden self-stretch bg-border/25 sm:block"
            />
            <div className="flex flex-col gap-1.5 text-left">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] opacity-70">
                  Description
                </p>
                <p className="leading-relaxed opacity-90">{description}</p>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
