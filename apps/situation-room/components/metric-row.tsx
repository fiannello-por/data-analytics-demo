import type { ScorecardRow } from '@/lib/types';
import { ChangeIndicator } from './change-indicator';
import { TableCell, TableRow } from '@/components/ui/table';

interface MetricRowProps {
  row: ScorecardRow;
  isAlt?: boolean;
}

export function MetricRow({ row, isAlt = false }: MetricRowProps) {
  return (
    <TableRow
      className={`border-table-row-border hover:bg-table-row-hover-bg transition-colors ${
        isAlt ? 'bg-table-row-alt-bg' : 'bg-table-row-bg'
      }`}
    >
      <TableCell className="pl-4 table-data-cell">
        {row.metricName}
      </TableCell>
      <TableCell className="table-data-cell-numeric text-right">
        {row.currentPeriod}
      </TableCell>
      <TableCell className="hidden sm:table-cell table-data-cell-secondary text-right">
        {row.previousPeriod}
      </TableCell>
      <TableCell className="pr-4 text-right">
        <ChangeIndicator value={row.pctChange} />
      </TableCell>
    </TableRow>
  );
}
