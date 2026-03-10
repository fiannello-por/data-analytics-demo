const REQUIRED_HEADINGS = [
  'What changed',
  'Why it matters',
  'Risks',
  'Validation',
  'Changelog note',
] as const;

export type RequiredHeading = (typeof REQUIRED_HEADINGS)[number];

export function parseTemplateSections(
  body: string | null,
): Record<string, string> {
  if (!body) {
    return {};
  }

  const sections = body
    .split(/^##\s+/m)
    .map((section) => section.trim())
    .filter(Boolean);

  const output: Record<string, string> = {};

  for (const section of sections) {
    const [heading, ...rest] = section.split('\n');
    if (!heading) {
      continue;
    }

    output[heading.trim().toLowerCase()] = rest.join('\n').trim();
  }

  return output;
}

export function missingRequiredSections(
  body: string | null,
): RequiredHeading[] {
  const sections = parseTemplateSections(body);

  return REQUIRED_HEADINGS.filter((heading) => {
    const content = sections[heading.toLowerCase()];
    if (!content) {
      return true;
    }

    return content.replace(/<!--.*?-->/gs, '').trim().length === 0;
  });
}

export function changelogNote(body: string | null): string {
  const sections = parseTemplateSections(body);
  return sections['changelog note'] ?? '';
}

export function shouldSkipChangelog(body: string | null): boolean {
  return changelogNote(body).trim().toLowerCase() === 'skip';
}
