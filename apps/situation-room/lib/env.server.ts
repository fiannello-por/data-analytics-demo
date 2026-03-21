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
    dataset: must('BIGQUERY_DATASET'),
    location: process.env.BIGQUERY_LOCATION ?? 'US',
    serviceAccountJson: must('BIGQUERY_SERVICE_ACCOUNT_JSON'),
  };

  return cachedEnv;
}
