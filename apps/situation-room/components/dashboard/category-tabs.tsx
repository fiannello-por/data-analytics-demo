'use client';

import * as React from 'react';
import { CATEGORY_ORDER, type Category } from '@/lib/dashboard/catalog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function CategoryTabs({
  activeCategory,
  onValueChange,
  children,
}: {
  activeCategory: Category;
  onValueChange?: (category: Category) => void;
  children: React.ReactNode;
}) {
  return (
    <Tabs value={activeCategory} onValueChange={onValueChange}>
      <TabsList className="w-full justify-start">
        {CATEGORY_ORDER.map((category) => (
          <TabsTrigger key={category} value={category}>
            {category}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={activeCategory}>{children}</TabsContent>
    </Tabs>
  );
}
