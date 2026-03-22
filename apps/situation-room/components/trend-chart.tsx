'use client';

import * as React from 'react';
import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TileTrendPayload } from '@/lib/dashboard/contracts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

export function TrendChart({ trend }: { trend: TileTrendPayload }) {
  const data = useMemo(
    () => ({
      labels: trend.points.map((point) => point.bucketLabel),
      datasets: [
        {
          label: 'Current period',
          data: trend.points.map((point) => point.currentValue),
          borderColor: '#111111',
          backgroundColor: 'rgba(17, 17, 17, 0.08)',
          tension: 0.25,
          fill: false,
        },
        {
          label: 'Previous year',
          data: trend.points.map((point) => point.previousValue),
          borderColor: '#9f9f9f',
          backgroundColor: 'rgba(159, 159, 159, 0.08)',
          tension: 0.25,
          fill: false,
        },
      ],
    }),
    [trend.points],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          align: 'start' as const,
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
        },
      },
    }),
    [],
  );

  return (
    <div className="h-72 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
