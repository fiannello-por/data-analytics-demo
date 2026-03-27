import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(__dirname, '..');

describe('closed won opportunities table sorting', () => {
  it('uses explicit text sorting for the opportunity column', () => {
    const source = fs.readFileSync(
      path.join(
        appRoot,
        'components/dashboard/closed-won-opportunities-table.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /accessorKey:\s*'opportunityName'[\s\S]*?sortingFn:\s*'text'/,
    );
  });
});
