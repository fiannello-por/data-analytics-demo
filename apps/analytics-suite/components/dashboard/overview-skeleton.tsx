'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function SkeletonCard({ wide = false }: { wide?: boolean }) {
  return (
    <Card className="border-border/70 bg-card/70 shadow-none">
      <CardHeader className="pb-4">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={wide ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'}>
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
        {!wide ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="grid gap-6" data-testid="overview-skeleton">
      <div className="grid gap-6 xl:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard wide />
    </div>
  );
}
