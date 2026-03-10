import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDiffSummary,
  sanitizeMarkdown,
  sanitizePlainText,
  yamlSingleQuoted,
} from '../scripts/lib/agent-utils';

test('buildDiffSummary truncates file list and patch text', () => {
  const summary = buildDiffSummary(
    [
      {
        filename: 'lightdash/models/opportunity_view.yml',
        status: 'modified',
        additions: 10,
        deletions: 2,
        changes: 12,
        patch: 'a'.repeat(20),
      },
      {
        filename: 'README.md',
        status: 'modified',
        additions: 1,
        deletions: 1,
        changes: 2,
        patch: 'b'.repeat(20),
      },
    ],
    1,
    5,
  );

  assert.equal(summary.includes('README.md'), false);
  assert.equal(summary.includes('aaaaa'), true);
  assert.equal(summary.includes('aaaaaa'), false);
});

test('sanitizeMarkdown strips unsafe MDX and escapes angle brackets', () => {
  const output = sanitizeMarkdown(
    [
      "import Bad from './bad';",
      '<script>alert(1)</script>',
      '<Component />',
      'Safe text',
    ].join('\n'),
  );

  assert.equal(output.includes('import Bad'), false);
  assert.equal(output.includes('<script>'), false);
  assert.equal(output.includes('&lt;Component /&gt;'), true);
  assert.equal(output.includes('Safe text'), true);
});

test('yamlSingleQuoted escapes single quotes', () => {
  assert.equal(
    yamlSingleQuoted("Point of Rental's update"),
    "'Point of Rental''s update'",
  );
  assert.equal(sanitizePlainText('  hello \0 world  '), 'hello  world');
});
