'use client';

// apps/challenger/components/section-error.tsx

import type { ReactNode } from 'react';

type SectionErrorProps = {
  message: string;
  onRetry: () => void;
  staleContent?: ReactNode;
};

export function SectionError({
  message,
  onRetry,
  staleContent,
}: SectionErrorProps) {
  return (
    <div>
      {staleContent && <div className="mb-2 opacity-60">{staleContent}</div>}
      <div
        data-testid="section-error"
        className="flex items-center justify-between gap-4 rounded-md bg-red-50 border border-red-200 px-4 py-3"
      >
        <span className="text-sm text-red-700">{message}</span>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
