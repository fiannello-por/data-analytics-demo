import React from 'react';

import type { MetricHeadlineRendererComponent } from '../types';

export const MetricHeadlineRenderer: MetricHeadlineRendererComponent = ({
  spec,
  rows,
}) => {
  const row = rows[0] ?? {};
  const value = row[spec.visualization.valueField] ?? '—';
  const comparisonField = spec.visualization.comparisonField;
  const comparison = comparisonField ? row[comparisonField] : undefined;

  return (
    <div
      data-metric-headline-root="true"
      style={{
        display: 'grid',
        gap: '0.5rem',
      }}
    >
      <span
        style={{
          color: '#4b5563',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        {spec.title}
      </span>
      <strong
        style={{
          fontSize: '2rem',
          lineHeight: 1.1,
        }}
      >
        {String(value)}
      </strong>
      {comparison !== undefined ? (
        <span
          style={{
            color: '#047857',
            fontSize: '0.875rem',
          }}
        >
          {String(comparison)}
        </span>
      ) : null}
    </div>
  );
};
