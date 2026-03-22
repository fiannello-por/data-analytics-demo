'use client';

import * as React from 'react';
import { CATEGORY_ORDER, type Category } from '@/lib/dashboard/catalog';
import {
  AnimatedUnderlineTabs,
  type AnimatedUnderlineTabItem,
} from '@/components/shadcn-studio/tabs/tabs-29';

export function CategoryTabs({
  activeCategory,
  onValueChange,
  children,
}: {
  activeCategory: Category;
  onValueChange?: (category: Category) => void;
  children: React.ReactNode;
}) {
  const tabs = React.useMemo<AnimatedUnderlineTabItem[]>(
    () =>
      CATEGORY_ORDER.map((category) => ({
        name: category,
        value: category,
        content: children,
      })),
    [children],
  );

  return (
    <AnimatedUnderlineTabs
      tabs={tabs}
      value={activeCategory}
      onValueChange={(value) => onValueChange?.(value as Category)}
      className="w-full"
      listClassName="overflow-x-auto"
      contentClassName="pt-2"
    />
  );
}
