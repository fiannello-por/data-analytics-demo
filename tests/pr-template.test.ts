import test from 'node:test';
import assert from 'node:assert/strict';

import {
  changelogNote,
  missingRequiredSections,
  parseTemplateSections,
  shouldSkipChangelog,
} from '../scripts/lib/pr-template';

test('parseTemplateSections captures markdown sections by heading', () => {
  const body = [
    '## What changed',
    'Updated charts.',
    '',
    '## Why it matters',
    'Improves reporting.',
    '',
    '## Changelog note',
    'Better dashboard clarity.',
  ].join('\n');

  assert.deepEqual(parseTemplateSections(body), {
    'what changed': 'Updated charts.',
    'why it matters': 'Improves reporting.',
    'changelog note': 'Better dashboard clarity.',
  });
});

test('missingRequiredSections flags empty or missing required sections', () => {
  const body = [
    '## What changed',
    'Updated charts.',
    '',
    '## Why it matters',
    '<!-- fill me -->',
    '',
    '## Risks',
    'Low risk.',
  ].join('\n');

  assert.deepEqual(missingRequiredSections(body), [
    'Why it matters',
    'Validation',
    'Changelog note',
  ]);
});

test('shouldSkipChangelog only accepts explicit skip note', () => {
  assert.equal(changelogNote('## Changelog note\nskip'), 'skip');
  assert.equal(shouldSkipChangelog('## Changelog note\nskip'), true);
  assert.equal(shouldSkipChangelog('## Changelog note\nPublic update'), false);
});
