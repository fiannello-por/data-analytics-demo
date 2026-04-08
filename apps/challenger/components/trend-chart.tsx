'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type DataPoint = {
  week: string;
  current: number | null;
  previous: number | null;
};

type Props = {
  data: DataPoint[];
  currentLabel: string;
  previousLabel: string;
};

export function TrendChart({ data, currentLabel, previousLabel }: Props) {
  if (data.length === 0) {
    return <p style={{ color: '#9ca3af' }}>No trend data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="week" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="current" name={currentLabel} stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="previous" name={previousLabel} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
