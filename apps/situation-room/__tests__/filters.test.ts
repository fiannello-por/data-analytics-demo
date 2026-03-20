import { describe, it, expect } from 'vitest';
import { FILTER_KEYS } from '@/lib/contracts';
import { FILTER_DEFINITIONS, parseFilterParams } from '@/lib/filters';

describe('FILTER_DEFINITIONS', () => {
  it('defines all 17 dashboard filters', () => {
    expect(FILTER_DEFINITIONS).toHaveLength(17);
  });

  it('each filter has a key, label, fieldId, and type', () => {
    for (const f of FILTER_DEFINITIONS) {
      expect(f.key).toBeTruthy();
      expect(f.label).toBeTruthy();
      expect(f.fieldId).toBeTruthy();
      expect(['string', 'boolean', 'date']).toContain(f.type);
    }
  });

  it('stays aligned with the canonical filter keys', () => {
    expect(FILTER_DEFINITIONS.map((filter) => filter.key)).toEqual(FILTER_KEYS);
  });
});

describe('parseFilterParams', () => {
  it('returns empty record for empty params', () => {
    expect(parseFilterParams({})).toEqual({});
  });

  it('splits comma-separated values', () => {
    const result = parseFilterParams({ Division: 'Enterprise,SMB' });
    expect(result.Division).toEqual(['Enterprise', 'SMB']);
  });

  it('ignores unknown filter keys', () => {
    const result = parseFilterParams({ Division: 'Enterprise', bogus: 'x' });
    expect(result).toHaveProperty('Division');
    expect(result).not.toHaveProperty('bogus');
  });
});
