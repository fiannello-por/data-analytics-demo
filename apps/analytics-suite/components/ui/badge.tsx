import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[min(var(--radius-md),12px)] border px-2 py-0.5 text-[11px] font-medium tracking-[0.01em]',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        outline: 'border-border bg-transparent text-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success:
          'border-[color:color-mix(in_oklch,var(--primary)_28%,var(--border))] bg-[color:var(--primary-soft)] text-foreground',
        warning:
          'border-border bg-[color:color-mix(in_oklch,var(--secondary)_82%,var(--background))] text-secondary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
