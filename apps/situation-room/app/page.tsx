import { Suspense } from 'react';
import { ReportContent } from '@/components/report-content';

export default function ReportPage() {
  return (
    <Suspense>
      <ReportContent />
    </Suspense>
  );
}
