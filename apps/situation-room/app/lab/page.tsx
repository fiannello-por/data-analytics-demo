import * as React from 'react';
import type { Metadata } from 'next';
import { ArchitectureLab } from '@/components/architecture-lab';

export const metadata: Metadata = {
  title: 'Situation Room — Analytics Lab',
  description: 'Internal benchmarking surface for the Situation Room stack',
};

export default function LabPage() {
  const sourceLabel = `${
    process.env.BIGQUERY_DATASET ?? 'scorecard_test'
  }.scorecard_daily`;

  return <ArchitectureLab sourceLabel={sourceLabel} />;
}
