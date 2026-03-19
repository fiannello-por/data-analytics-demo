import type { CategoryData } from '@/lib/types';
import { MetricRow } from './metric-row';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'New Logo':
    'First-time customer acquisition — tracking pipeline generation through close.',
  Expansion:
    'Growth within existing accounts — upsells, cross-sells, and seat expansion.',
  Migration: 'Platform transitions — customers moving between product lines.',
  Renewal:
    'Contract renewals and retention performance across the book of business.',
  Total: 'Aggregate performance across all booking categories.',
};

interface CategorySectionProps {
  data: CategoryData;
}

export function CategorySection({ data }: CategorySectionProps) {
  const description = CATEGORY_DESCRIPTIONS[data.category] ?? '';

  return (
    <Card className="bg-surface-elevated overflow-hidden">
      <CardHeader>
        <CardTitle className="heading-primary">{data.category}</CardTitle>
        <CardDescription className="heading-section">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-table-header-bg border-table-header-border hover:bg-table-header-bg">
              <TableHead className="pl-4 table-header-cell">Metric</TableHead>
              <TableHead className="table-header-cell text-right">
                Current
              </TableHead>
              <TableHead className="hidden sm:table-cell table-header-cell text-right">
                Prior YTD
              </TableHead>
              <TableHead className="pr-4 table-header-cell text-right">
                Change
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row, i) => (
              <MetricRow key={row.sortOrder} row={row} isAlt={i % 2 === 1} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
