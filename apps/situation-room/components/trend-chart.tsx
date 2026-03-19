'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { CategoryData } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

function useCssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

interface TrendChartProps {
  data: CategoryData[];
  metricIndex: number;
}

export function TrendChart({ data, metricIndex }: TrendChartProps) {
  const accent = useCssVar('--accent-brand');
  const border = useCssVar('--border-subtle');
  const borderSubtle = useCssVar('--border-subtle');
  const textSecondary = useCssVar('--text-secondary');
  const textTertiary = useCssVar('--text-tertiary');
  const surfaceElevated = useCssVar('--surface-elevated');
  const textPrimary = useCssVar('--text-primary');

  const categories = data.filter((d) => d.category !== 'Total');

  const labels = categories.map((d) => d.category);
  const currentValues = categories.map((d) => {
    const row = d.rows[metricIndex];
    if (!row) return 0;
    const cleaned = row.currentPeriod.replace(/[$,K%]/g, '');
    return parseFloat(cleaned) || 0;
  });
  const previousValues = categories.map((d) => {
    const row = d.rows[metricIndex];
    if (!row) return 0;
    const cleaned = row.previousPeriod.replace(/[$,K%]/g, '');
    return parseFloat(cleaned) || 0;
  });

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Current YTD',
          data: currentValues,
          backgroundColor: accent || '#1e40af',
          borderRadius: 4,
          barPercentage: 0.35,
          categoryPercentage: 0.7,
        },
        {
          label: 'Prior YTD',
          data: previousValues,
          backgroundColor: border || '#e5e7eb',
          borderRadius: 4,
          barPercentage: 0.35,
          categoryPercentage: 0.7,
        },
      ],
    }),
    [labels, currentValues, previousValues, accent, border],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'rectRounded',
            padding: 16,
            font: { size: 11, family: 'Inter, sans-serif' },
            color: textSecondary || '#6b7280',
          },
        },
        tooltip: {
          backgroundColor: surfaceElevated || '#f8f9fa',
          titleColor: textPrimary || '#111827',
          bodyColor: textSecondary || '#6b7280',
          borderColor: border || '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            size: 12,
            weight: 'bold' as const,
            family: 'Inter, sans-serif',
          },
          bodyFont: { size: 11, family: 'Inter, sans-serif' },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, family: 'Inter, sans-serif' },
            color: textTertiary || '#9ca3af',
          },
          border: { display: false },
        },
        y: {
          grid: { color: borderSubtle || '#f0f0f0' },
          ticks: {
            font: { size: 11, family: 'Inter, sans-serif' },
            color: textTertiary || '#9ca3af',
          },
          border: { display: false },
        },
      },
    }),
    [
      textSecondary,
      textTertiary,
      textPrimary,
      surfaceElevated,
      border,
      borderSubtle,
    ],
  );

  return (
    <div className="h-[240px] w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
