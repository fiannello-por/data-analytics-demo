'use client';

import * as React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type AnimatedUnderlineTabItem = {
  name: string;
  value: string;
  content: React.ReactNode;
};

export function AnimatedUnderlineTabs({
  tabs,
  value,
  onValueChange,
  className,
  listClassName,
  triggerClassName,
  contentClassName,
}: {
  tabs: AnimatedUnderlineTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  listClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
}) {
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.value === value);
    const activeTabElement = tabRefs.current[activeIndex];

    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement;
      setUnderlineStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [tabs, value]);

  return (
    <div className={cn('w-full', className)}>
      <Tabs value={value} onValueChange={onValueChange} className="gap-4">
        <TabsList
          className={cn(
            'bg-background relative h-auto w-full justify-start rounded-none border-b p-0',
            listClassName,
          )}
        >
          {tabs.map((tab, index) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              className={cn(
                'bg-background relative z-10 rounded-none border-0 px-4 py-2 text-sm text-muted-foreground data-active:text-foreground data-active:shadow-none! dark:data-active:bg-background',
                triggerClassName,
              )}
            >
              {tab.name}
            </TabsTrigger>
          ))}

          <motion.div
            className="bg-primary absolute bottom-0 z-20 h-0.5"
            layoutId="underline"
            style={{
              left: underlineStyle.left,
              width: underlineStyle.width,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 40,
            }}
          />
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={cn('mt-0 outline-none', contentClassName)}
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default AnimatedUnderlineTabs;
