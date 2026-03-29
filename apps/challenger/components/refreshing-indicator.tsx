'use client';

// apps/challenger/components/refreshing-indicator.tsx

import type { ReactNode } from 'react';

type RefreshingIndicatorProps = {
  isRefreshing: boolean;
  children: ReactNode;
};

export function RefreshingIndicator({
  isRefreshing,
  children,
}: RefreshingIndicatorProps) {
  return (
    <div className="relative">
      {isRefreshing && (
        <div
          data-testid="refreshing-indicator"
          className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-full bg-blue-200"
        >
          <div className="h-full w-1/3 animate-[slide_1.2s_ease-in-out_infinite] bg-blue-500" />
        </div>
      )}
      {children}
    </div>
  );
}
