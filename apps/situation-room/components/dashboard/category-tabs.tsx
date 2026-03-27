'use client';

import * as React from 'react';
import { LayoutGridIcon } from 'lucide-react';
import {
  DASHBOARD_TAB_ORDER,
  isOverviewTab,
  type DashboardTab,
} from '@/lib/dashboard/catalog';
import {
  AnimatedUnderlineTabs,
  type AnimatedUnderlineTabItem,
} from '@/components/shadcn-studio/tabs/tabs-29';

export function CategoryTabs({
  activeCategory,
  onValueChange,
  children,
}: {
  activeCategory: DashboardTab;
  onValueChange?: (category: DashboardTab) => void;
  children: React.ReactNode;
}) {
  const tabs = React.useMemo<AnimatedUnderlineTabItem[]>(
    () =>
      DASHBOARD_TAB_ORDER.map((tab) => ({
        name: isOverviewTab(tab) ? (
          <LayoutGridIcon className="size-4" aria-hidden="true" />
        ) : (
          tab
        ),
        ariaLabel: isOverviewTab(tab) ? 'Overview' : undefined,
        value: tab,
        content: children,
      })),
    [children],
  );

  return (
    <AnimatedUnderlineTabs
      tabs={tabs}
      value={activeCategory}
      onValueChange={(value) => onValueChange?.(value as DashboardTab)}
      className="w-full"
      listClassName="overflow-x-auto overflow-y-hidden"
      contentClassName="pt-2"
    />
  );
}
