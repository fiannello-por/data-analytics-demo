import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { LineComparisonRendererComponent } from '../types';

const LINE_COLORS = ['#0f766e', '#94a3b8'] as const;

export const LineComparisonRenderer: LineComparisonRendererComponent = ({
  spec,
  rows,
}) => (
  <div
    data-line-comparison-root="true"
    style={{
      height: '100%',
      minHeight: '16rem',
      width: '100%',
    }}
  >
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={spec.visualization.xField} />
        <YAxis />
        <Tooltip />
        <Legend />
        {spec.visualization.series.map((series, index) => (
          <Line
            key={series.field}
            type="monotone"
            dataKey={series.field}
            name={series.label}
            stroke={LINE_COLORS[index % LINE_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);
