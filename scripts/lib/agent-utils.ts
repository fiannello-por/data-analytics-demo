import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PullRequestFile } from './github';

export async function readGuidanceIfExists(
  filePath: string,
  maxChars = 20000,
): Promise<string> {
  const workspaceRoot = process.cwd();
  const absolutePath = path.resolve(workspaceRoot, filePath);
  const allowedPrefix = `${workspaceRoot}${path.sep}`;

  if (
    !absolutePath.startsWith(allowedPrefix) &&
    absolutePath !== workspaceRoot
  ) {
    throw new Error(
      `Refusing to read guidance outside the workspace: ${filePath}`,
    );
  }

  try {
    const content = await readFile(absolutePath, 'utf8');
    return content.slice(0, maxChars);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }

    throw error;
  }
}

export function buildDiffSummary(
  files: PullRequestFile[],
  limit = 40,
  patchChars = 12000,
): string {
  return files
    .slice(0, limit)
    .map((file) => {
      const patch = file.patch
        ? file.patch.slice(0, patchChars)
        : 'Patch unavailable';
      return [
        `FILE: ${file.filename}`,
        `STATUS: ${file.status}`,
        `CHANGES: +${file.additions} -${file.deletions}`,
        'PATCH:',
        patch,
      ].join('\n');
    })
    .join('\n\n');
}

export function sanitizePlainText(value: string): string {
  return value.replace(/\0/g, '').trim();
}

export function sanitizeMarkdown(value: string): string {
  const safeHtmlTags = new Set(['details', 'summary', 'br']);

  return sanitizePlainText(value)
    .replace(/^\s*(import|export)\s+.*$/gim, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, '')
    .replace(/<\/?(script|style|iframe|object|embed)\b[^>]*>/gim, '')
    .replace(/<\/?([A-Za-z][A-Za-z0-9-]*)\b[^>]*>/g, (match, tagName) =>
      safeHtmlTags.has(tagName.toLowerCase()) ? match : '',
    );
}

export function yamlSingleQuoted(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
