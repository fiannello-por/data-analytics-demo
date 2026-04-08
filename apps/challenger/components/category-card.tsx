// apps/challenger/components/category-card.tsx

import type { CategoryResult } from '@/lib/types';

function formatCurrency(value: unknown): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return String(value ?? '—');
}

function formatPctChange(current: unknown, previous: unknown): string {
  const c = typeof current === 'number' ? current : 0;
  const p = typeof previous === 'number' ? previous : 0;
  if (p === 0) return '—';
  const pct = ((c - p) / Math.abs(p)) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function extractRawValue(result: CategoryResult['current']): unknown {
  if (!result.rows[0]) return null;
  const firstField = Object.values(result.rows[0])[0];
  return firstField?.value?.raw ?? null;
}

export function CategoryCard({ result }: { result: CategoryResult }) {
  const currentValue = extractRawValue(result.current);
  const previousValue = extractRawValue(result.previous);

  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        minWidth: '180px',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#666' }}>
        {result.category}
      </h3>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        {formatCurrency(currentValue)}
      </div>
      <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
        vs {formatCurrency(previousValue)} ({formatPctChange(currentValue, previousValue)})
      </div>
    </div>
  );
}