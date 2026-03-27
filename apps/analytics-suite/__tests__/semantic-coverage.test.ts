import { describe, expect, it } from 'vitest';

import { validateSuiteSemanticCoverage } from '@/lib/suite/semantic-coverage';

describe('suite semantic coverage', () => {
  it('validates that every dashboard registry references existing semantic entities', () => {
    const report = validateSuiteSemanticCoverage();

    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.modules.length).toBeGreaterThanOrEqual(2);
  });
});
