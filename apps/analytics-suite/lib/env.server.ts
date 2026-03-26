import 'server-only';
import { readFileSync } from 'node:fs';

type SituationRoomBackend = 'bigquery' | 'lightdash';

export type SituationRoomEnv = {
  backend: SituationRoomBackend;
  projectId: string;
  dataset: string;
  location: string;
  serviceAccountJson: string;
};

let cachedEnv: SituationRoomEnv | null = null;

function must(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.local.example.`,
    );
  }
  return value;
}

function readServiceAccountJson(): string {
  const inlineJson = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    return inlineJson;
  }

  const serviceAccountPath = process.env.BIGQUERY_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error(
      'Missing required environment variable: BIGQUERY_SERVICE_ACCOUNT_JSON or BIGQUERY_SERVICE_ACCOUNT_PATH. See .env.local.example.',
    );
  }

  try {
    return readFileSync(serviceAccountPath, 'utf8').trim();
  } catch (error) {
    throw new Error(
      `Unable to read BIGQUERY_SERVICE_ACCOUNT_PATH "${serviceAccountPath}": ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

export function getSituationRoomEnv(): SituationRoomEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    backend:
      process.env.SITUATION_ROOM_BACKEND === 'lightdash'
        ? 'lightdash'
        : 'bigquery',
    projectId: must('BIGQUERY_PROJECT_ID'),
    dataset: process.env.BIGQUERY_DATASET ?? 'scorecard_test',
    location: process.env.BIGQUERY_LOCATION ?? 'US',
    serviceAccountJson: readServiceAccountJson(),
  };

  return cachedEnv;
}
