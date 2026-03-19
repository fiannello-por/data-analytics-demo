'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        'group/tabs flex gap-2 data-horizontal:flex-col',
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col',
  {
    variants: {
      variant: {
        default:
          'rounded-lg tab-rail p-1 gap-0.5 group-data-horizontal/tabs:h-11',
        line: 'gap-1 bg-transparent rounded-none group-data-horizontal/tabs:h-8 p-[3px]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // Base layout + semantic tab styling (colors/states via .tab-pill in global.css)
        'tab-pill',
        'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
        'group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Disabled
        'disabled:pointer-events-none disabled:opacity-50',
        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
        // Focus
        'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
        // --- Default (pill) variant: structural only ---
        'group-data-[variant=default]/tabs-list:rounded-lg',
        'group-data-[variant=default]/tabs-list:px-4 group-data-[variant=default]/tabs-list:py-1.5',
        'group-data-[variant=default]/tabs-list:text-sm',
        'group-data-[variant=default]/tabs-list:select-none group-data-[variant=default]/tabs-list:cursor-pointer',
        // Pill transition — background, shadow, color animate smoothly
        'group-data-[variant=default]/tabs-list:transition-[background-color,box-shadow,color,transform]',
        'group-data-[variant=default]/tabs-list:duration-200 group-data-[variant=default]/tabs-list:ease-out',
        // Active press micro-interaction
        'group-data-[variant=default]/tabs-list:active:scale-[0.97]',
        // --- Line variant (unchanged) ---
        'group-data-[variant=line]/tabs-list:h-[calc(100%-1px)] group-data-[variant=line]/tabs-list:flex-1',
        'group-data-[variant=line]/tabs-list:rounded-md group-data-[variant=line]/tabs-list:border group-data-[variant=line]/tabs-list:border-transparent',
        'group-data-[variant=line]/tabs-list:px-1.5 group-data-[variant=line]/tabs-list:py-0.5',
        'group-data-[variant=line]/tabs-list:text-sm group-data-[variant=line]/tabs-list:font-medium',
        'group-data-[variant=line]/tabs-list:text-foreground/60 group-data-[variant=line]/tabs-list:hover:text-foreground',
        'group-data-[variant=line]/tabs-list:transition-all',
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent',
        'group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:after:transition-opacity',
        'group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:bottom-[-5px] group-data-horizontal/tabs:group-data-[variant=line]/tabs-list:after:h-0.5',
        'group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        'flex-1 text-sm outline-none',
        // Fade-in animation for content
        'animate-in fade-in-0 duration-200',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
