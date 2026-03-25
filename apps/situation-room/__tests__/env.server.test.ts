import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('server-only', () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('getSituationRoomEnv', () => {
  it('uses inline service account JSON when provided', async () => {
    vi.stubEnv('BIGQUERY_PROJECT_ID', 'demo-project');
    vi.stubEnv('BIGQUERY_DATASET', 'demo_dataset');
    vi.stubEnv('BIGQUERY_SERVICE_ACCOUNT_JSON', '{"client_email":"inline"}');

    const { getSituationRoomEnv } = await import('@/lib/env.server');

    expect(getSituationRoomEnv()).toEqual({
      backend: 'bigquery',
      projectId: 'demo-project',
      dataset: 'demo_dataset',
      location: 'US',
      serviceAccountJson: '{"client_email":"inline"}',
    });
  });

  it('reads service account JSON from a file path when inline JSON is absent', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'situation-room-env-'));
    const serviceAccountPath = join(directory, 'service-account.json');
    writeFileSync(serviceAccountPath, '{"client_email":"from-file"}\n');

    vi.stubEnv('BIGQUERY_PROJECT_ID', 'demo-project');
    vi.stubEnv('BIGQUERY_DATASET', 'demo_dataset');
    vi.stubEnv('BIGQUERY_SERVICE_ACCOUNT_PATH', serviceAccountPath);

    const { getSituationRoomEnv } = await import('@/lib/env.server');

    expect(getSituationRoomEnv().serviceAccountJson).toBe(
      '{"client_email":"from-file"}',
    );
  });

  it('defaults the dataset to scorecard_test when not explicitly provided', async () => {
    vi.stubEnv('BIGQUERY_PROJECT_ID', 'demo-project');
    vi.stubEnv('BIGQUERY_SERVICE_ACCOUNT_JSON', '{"client_email":"inline"}');

    const { getSituationRoomEnv } = await import('@/lib/env.server');

    expect(getSituationRoomEnv().dataset).toBe('scorecard_test');
  });

  it('prefers inline JSON over a file path when both are present', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'situation-room-env-'));
    const serviceAccountPath = join(directory, 'service-account.json');
    writeFileSync(serviceAccountPath, '{"client_email":"from-file"}\n');

    vi.stubEnv('BIGQUERY_PROJECT_ID', 'demo-project');
    vi.stubEnv('BIGQUERY_DATASET', 'demo_dataset');
    vi.stubEnv('BIGQUERY_SERVICE_ACCOUNT_PATH', serviceAccountPath);
    vi.stubEnv('BIGQUERY_SERVICE_ACCOUNT_JSON', '{"client_email":"inline"}');

    const { getSituationRoomEnv } = await import('@/lib/env.server');

    expect(getSituationRoomEnv().serviceAccountJson).toBe(
      '{"client_email":"inline"}',
    );
  });
});
