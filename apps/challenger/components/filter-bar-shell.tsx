// apps/challenger/components/filter-bar-shell.tsx
// Synchronous server component — renders immediately as part of the HTML stream.

import { GLOBAL_FILTER_KEYS } from '@por/dashboard-constants';
import type { ReactNode } from 'react';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

/**
 * Disabled placeholder buttons shown while filter options are still loading.
 * Rendered as the Suspense fallback inside FilterBarShell.
 */
export function FilterBarSkeleton() {
  return (
    <div
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
      aria-label="Filters loading"
    >
      {GLOBAL_FILTER_KEYS.map((key) => (
        <FilterButtonSkeleton key={key} label={key} />
      ))}
    </div>
  );
}

/**
 * Single disabled placeholder button for one filter key.
 * Used as Suspense fallback for individual per-filter Suspense boundaries.
 */
export function FilterButtonSkeleton({ label }: { label: string }) {
  return (
    <button
      disabled
      aria-disabled="true"
      style={{
        padding: '0.25rem 0.75rem',
        background: '#e0e0e0',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '0.8rem',
        cursor: 'not-allowed',
        opacity: 0.6,
      }}
    >
      {label}
    </button>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

/**
 * Outer container for the filter bar. Renders synchronously (no data
 * dependencies). Accepts a `children` slot where FilterBarOptions streams in
 * via a Suspense boundary.
 */
export function FilterBarShell({ children }: { children: ReactNode }) {
  return (
    <div data-testid="filter-bar" style={{ marginBottom: '1rem' }}>
      <span
        style={{
          fontWeight: 600,
          fontSize: '0.85rem',
          marginRight: '0.75rem',
          verticalAlign: 'middle',
        }}
      >
        Filters
      </span>
      {children}
    </div>
  );
}
