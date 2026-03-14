"""GitHub API client utilities for interacting with the GitHub REST API."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx

GITHUB_API_URL = "https://api.github.com"


@dataclass
class PullRequestLabel:
    name: str


@dataclass
class PullRequestFile:
    filename: str
    status: str
    additions: int
    deletions: int
    changes: int
    patch: str | None = None


@dataclass
class PullRequestUser:
    login: str
    avatar_url: str
    html_url: str


@dataclass
class PullRequestDetails:
    number: int
    title: str
    body: str | None
    html_url: str
    user: PullRequestUser
    labels: list[PullRequestLabel] = field(default_factory=list)
    merged: bool = False


@dataclass
class GitHubUser:
    login: str
    name: str | None
    avatar_url: str
    html_url: str


@dataclass
class _IssueComment:
    id: int
    body: str


def parse_repository(repository: str) -> tuple[str, str]:
    """Split an 'owner/repo' string and validate both parts exist."""
    parts = repository.split("/")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(f"Invalid GITHUB_REPOSITORY value: {repository}")
    return parts[0], parts[1]


def github_request(
    token: str,
    endpoint: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
) -> Any:
    """Make an authenticated request to the GitHub API.

    Returns the parsed JSON response (dict or list).

    Raises:
        RuntimeError: If the response status code indicates failure.
    """
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    response = httpx.request(
        method,
        f"{GITHUB_API_URL}{endpoint}",
        headers=headers,
        json=body,
        timeout=30.0,
    )

    if not response.is_success:
        raise RuntimeError(
            f"GitHub request failed ({response.status_code} {response.reason_phrase}): "
            f"{response.text}"
        )

    return response.json()


def paginate_github(token: str, endpoint: str) -> list[dict[str, Any]]:
    """Paginate through a GitHub API list endpoint (up to 10 pages of 100)."""
    results: list[dict[str, Any]] = []

    for page in range(1, 11):
        separator = "&" if "?" in endpoint else "?"
        page_results: list[dict[str, Any]] = github_request(
            token,
            f"{endpoint}{separator}per_page=100&page={page}",
        )

        results.extend(page_results)

        if len(page_results) < 100:
            break

    return results


def fetch_github_user(token: str, login: str) -> GitHubUser:
    """Fetch a GitHub user profile by login."""
    data: dict[str, Any] = github_request(token, f"/users/{login}")
    return GitHubUser(
        login=data["login"],
        name=data.get("name"),
        avatar_url=data["avatar_url"],
        html_url=data["html_url"],
    )


def upsert_issue_comment(
    *,
    repository: str,
    token: str,
    issue_number: int,
    marker: str,
    body: str,
) -> None:
    """Create or update an issue comment identified by a marker string.

    Searches existing comments for one containing the marker. If found, updates
    it via PATCH; otherwise creates a new comment via POST.
    """
    owner, repo = parse_repository(repository)
    comments = paginate_github(
        token,
        f"/repos/{owner}/{repo}/issues/{issue_number}/comments",
    )

    existing: _IssueComment | None = None
    for comment_data in comments:
        if marker in comment_data.get("body", ""):
            existing = _IssueComment(id=comment_data["id"], body=comment_data["body"])
            break

    if existing:
        github_request(
            token,
            f"/repos/{owner}/{repo}/issues/comments/{existing.id}",
            method="PATCH",
            body={"body": body},
        )
        return

    github_request(
        token,
        f"/repos/{owner}/{repo}/issues/{issue_number}/comments",
        method="POST",
        body={"body": body},
    )
