type GitHubRequestOptions = {
  method?: string;
  body?: unknown;
};

export type PullRequestLabel = {
  name: string;
};

export type PullRequestFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export type PullRequestDetails = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  labels: PullRequestLabel[];
  merged: boolean;
};

export type GitHubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

type IssueComment = {
  id: number;
  body: string;
};

const GITHUB_API_URL = 'https://api.github.com';

export function parseRepository(repository: string): {
  owner: string;
  repo: string;
} {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  return { owner, repo };
}

export async function githubRequest<T>(
  token: string,
  endpoint: string,
  options: GitHubRequestOptions = {},
): Promise<T> {
  const requestInit: RequestInit = {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${GITHUB_API_URL}${endpoint}`, requestInit);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GitHub request failed (${response.status} ${response.statusText}): ${text}`,
    );
  }

  return (await response.json()) as T;
}

export async function paginateGithub<T>(
  token: string,
  endpoint: string,
): Promise<T[]> {
  const results: T[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const pageResults = await githubRequest<T[]>(
      token,
      `${endpoint}${separator}per_page=100&page=${page}`,
    );

    results.push(...pageResults);

    if (pageResults.length < 100) {
      break;
    }
  }

  return results;
}

export async function fetchGitHubUser(
  token: string,
  login: string,
): Promise<GitHubUser> {
  return githubRequest<GitHubUser>(token, `/users/${login}`);
}

export async function upsertIssueComment(params: {
  repository: string;
  token: string;
  issueNumber: number;
  marker: string;
  body: string;
}): Promise<void> {
  const { owner, repo } = parseRepository(params.repository);
  const comments = await paginateGithub<IssueComment>(
    params.token,
    `/repos/${owner}/${repo}/issues/${params.issueNumber}/comments`,
  );
  const existing = comments.find((comment) =>
    comment.body.includes(params.marker),
  );

  if (existing) {
    await githubRequest(
      params.token,
      `/repos/${owner}/${repo}/issues/comments/${existing.id}`,
      {
        method: 'PATCH',
        body: { body: params.body },
      },
    );
    return;
  }

  await githubRequest(
    params.token,
    `/repos/${owner}/${repo}/issues/${params.issueNumber}/comments`,
    {
      method: 'POST',
      body: { body: params.body },
    },
  );
}
