import { readFile } from 'node:fs/promises';
import path from 'node:path';

import OpenAI from 'openai';

import {
  githubRequest,
  paginateGithub,
  PullRequestDetails,
  PullRequestFile,
  upsertIssueComment,
} from '../lib/github';
import { missingRequiredSections } from '../lib/pr-template';

const COMMENT_MARKER = '<!-- codex-pr-review -->';

type ReviewFinding = {
  severity: 'high' | 'medium' | 'low';
  title: string;
  rationale: string;
  file: string;
  recommendation: string;
};

type ReviewResult = {
  summary: string;
  documentationStatus: 'pass' | 'needs-work';
  requiredChanges: boolean;
  findings: ReviewFinding[];
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function readGuidance(filePath: string): Promise<string> {
  const absolutePath = path.join(process.cwd(), filePath);
  return readFile(absolutePath, 'utf8');
}

function buildDiffSummary(files: PullRequestFile[]): string {
  return files
    .slice(0, 40)
    .map((file) => {
      const patch = file.patch
        ? file.patch.slice(0, 12000)
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

function renderReviewComment(params: {
  review: ReviewResult;
  missingSections: string[];
  prUrl: string;
}): string {
  const lines = [
    COMMENT_MARKER,
    '## Codex review',
    '',
    params.review.summary,
    '',
    `Documentation status: **${params.review.documentationStatus}**`,
    `Required changes: **${params.review.requiredChanges ? 'yes' : 'no'}**`,
    `Pull request: ${params.prUrl}`,
  ];

  if (params.missingSections.length > 0) {
    lines.push('', 'Missing PR template sections:');
    for (const section of params.missingSections) {
      lines.push(`- ${section}`);
    }
  }

  if (params.review.findings.length === 0) {
    lines.push('', 'No concrete findings detected in the reviewed diff.');
    return lines.join('\n');
  }

  lines.push('', 'Findings:');

  params.review.findings.forEach((finding, index) => {
    lines.push(
      `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.file} - ${finding.title}`,
    );
    lines.push(`   ${finding.rationale}`);
    lines.push(`   Recommendation: ${finding.recommendation}`);
  });

  return lines.join('\n');
}

async function main(): Promise<void> {
  const repository = requireEnv('GITHUB_REPOSITORY');
  const token = requireEnv('GITHUB_TOKEN');
  const openAiApiKey = requireEnv('OPENAI_API_KEY');
  const prNumber = Number(requireEnv('PR_NUMBER'));
  const model = process.env.OPENAI_CODEX_MODEL ?? 'gpt-5.3-codex';

  const ownerRepo = repository.split('/');
  const owner = ownerRepo[0];
  const repo = ownerRepo[1];

  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  const pr = await githubRequest<PullRequestDetails>(
    token,
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
  );
  const files = await paginateGithub<PullRequestFile>(
    token,
    `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
  );
  const missingSections = missingRequiredSections(pr.body);

  const [agentsGuide, contributingGuide, semanticLayerGuide, agenticGuide] =
    await Promise.all([
      readGuidance('AGENTS.md'),
      readGuidance('CONTRIBUTING.md'),
      readGuidance('docs/semantic-layer-standards.md'),
      readGuidance('docs/agentic-bi-principles.md'),
    ]);

  const client = new OpenAI({ apiKey: openAiApiKey });
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You are a strict senior analytics engineer reviewing a pull request. Focus on bugs, reporting regressions, semantic-layer anti-patterns, and missing documentation. Prefer concrete findings over broad advice.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              `Repository guidance:\n${agentsGuide}`,
              `\n\nContribution guide:\n${contributingGuide}`,
              `\n\nSemantic layer standards:\n${semanticLayerGuide}`,
              `\n\nHuman and agentic BI principles:\n${agenticGuide}`,
              `\n\nPR title: ${pr.title}`,
              `\nPR body:\n${pr.body ?? '(empty)'}`,
              `\nChanged files:\n${buildDiffSummary(files)}`,
            ].join(''),
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'codex_pr_review',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: [
            'summary',
            'documentationStatus',
            'requiredChanges',
            'findings',
          ],
          properties: {
            summary: { type: 'string' },
            documentationStatus: {
              type: 'string',
              enum: ['pass', 'needs-work'],
            },
            requiredChanges: { type: 'boolean' },
            findings: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'severity',
                  'title',
                  'rationale',
                  'file',
                  'recommendation',
                ],
                properties: {
                  severity: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                  },
                  title: { type: 'string' },
                  rationale: { type: 'string' },
                  file: { type: 'string' },
                  recommendation: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  });

  const review = JSON.parse(response.output_text) as ReviewResult;
  const body = renderReviewComment({
    review,
    missingSections,
    prUrl: pr.html_url,
  });

  await upsertIssueComment({
    repository,
    token,
    issueNumber: prNumber,
    marker: COMMENT_MARKER,
    body,
  });

  const shouldFail =
    missingSections.length > 0 ||
    review.documentationStatus === 'needs-work' ||
    review.requiredChanges;

  if (shouldFail) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
