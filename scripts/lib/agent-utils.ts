import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { PullRequestFile } from './github';

export async function readGuidanceIfExists(
  filePath: string,
  maxChars = 20000,
): Promise<string> {
  const absolutePath = path.join(process.cwd(), filePath);

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
  return sanitizePlainText(value)
    .replace(/^\s*(import|export)\s+.*$/gim, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, '')
    .replace(/<\/?(script|style|iframe|object|embed)\b[^>]*>/gim, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function yamlSingleQuoted(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
