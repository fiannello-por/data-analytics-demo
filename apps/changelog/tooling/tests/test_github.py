"""Tests for changelog GitHub helpers."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from github import (
    GitHubUser,
    PullRequestFile,
    fetch_github_user,
    github_request,
    paginate_github,
    parse_pr_file,
    parse_repository,
    upsert_issue_comment,
)

# ---------------------------------------------------------------------------
# parse_repository
# ---------------------------------------------------------------------------


class TestParseRepository:
    def test_valid_input(self) -> None:
        owner, repo = parse_repository("octocat/hello-world")
        assert owner == "octocat"
        assert repo == "hello-world"

    def test_missing_repo(self) -> None:
        with pytest.raises(ValueError, match="Invalid GITHUB_REPOSITORY"):
            parse_repository("octocat/")

    def test_missing_owner(self) -> None:
        with pytest.raises(ValueError, match="Invalid GITHUB_REPOSITORY"):
            parse_repository("/hello-world")

    def test_no_slash(self) -> None:
        with pytest.raises(ValueError, match="Invalid GITHUB_REPOSITORY"):
            parse_repository("just-a-repo")

    def test_too_many_slashes(self) -> None:
        with pytest.raises(ValueError, match="Invalid GITHUB_REPOSITORY"):
            parse_repository("a/b/c")


# ---------------------------------------------------------------------------
# github_request
# ---------------------------------------------------------------------------


class TestGithubRequest:
    @patch("github.httpx.request")
    def test_success(self, mock_request: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"id": 1}
        mock_request.return_value = mock_response

        result = github_request("fake-token", "/repos/o/r")

        assert result == {"id": 1}
        mock_request.assert_called_once()
        args, kwargs = mock_request.call_args
        assert args[0] == "GET"
        assert "fake-token" in kwargs["headers"]["Authorization"]

    @patch("github.httpx.request")
    def test_error_raises_runtime_error(self, mock_request: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.is_success = False
        mock_response.status_code = 404
        mock_response.reason_phrase = "Not Found"
        mock_response.text = "not found"
        mock_request.return_value = mock_response

        with pytest.raises(RuntimeError, match="GitHub request failed"):
            github_request("fake-token", "/repos/o/r")

    @patch("github.httpx.request")
    def test_post_with_body(self, mock_request: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.is_success = True
        mock_response.json.return_value = {"ok": True}
        mock_request.return_value = mock_response

        result = github_request("t", "/endpoint", method="POST", body={"key": "val"})

        assert result == {"ok": True}
        _, kwargs = mock_request.call_args
        assert kwargs["json"] == {"key": "val"}


# ---------------------------------------------------------------------------
# paginate_github
# ---------------------------------------------------------------------------


class TestPaginateGithub:
    @patch("github.github_request")
    def test_single_page(self, mock_req: MagicMock) -> None:
        mock_req.return_value = [{"id": i} for i in range(50)]

        results = paginate_github("tok", "/repos/o/r/issues")

        assert len(results) == 50
        mock_req.assert_called_once()

    @patch("github.github_request")
    def test_multi_page(self, mock_req: MagicMock) -> None:
        page1 = [{"id": i} for i in range(100)]
        page2 = [{"id": i} for i in range(100, 130)]
        mock_req.side_effect = [page1, page2]

        results = paginate_github("tok", "/repos/o/r/issues")

        assert len(results) == 130
        assert mock_req.call_count == 2

    @patch("github.github_request")
    def test_stops_at_less_than_100(self, mock_req: MagicMock) -> None:
        page1 = [{"id": i} for i in range(100)]
        page2 = [{"id": i} for i in range(99)]
        mock_req.side_effect = [page1, page2]

        results = paginate_github("tok", "/repos/o/r/issues")

        assert len(results) == 199
        assert mock_req.call_count == 2

    @patch("github.github_request")
    def test_stops_at_10_pages_max(self, mock_req: MagicMock) -> None:
        full_page = [{"id": i} for i in range(100)]
        mock_req.return_value = full_page

        results = paginate_github("tok", "/repos/o/r/issues")

        assert mock_req.call_count == 10
        assert len(results) == 1000

    @patch("github.github_request")
    def test_uses_ampersand_when_query_string_present(self, mock_req: MagicMock) -> None:
        mock_req.return_value = []

        paginate_github("tok", "/repos/o/r/issues?state=open")

        call_args = mock_req.call_args[0]
        assert "&per_page=100&page=1" in call_args[1]


# ---------------------------------------------------------------------------
# fetch_github_user
# ---------------------------------------------------------------------------


class TestFetchGithubUser:
    @patch("github.github_request")
    def test_returns_github_user(self, mock_req: MagicMock) -> None:
        mock_req.return_value = {
            "login": "octocat",
            "name": "The Octocat",
            "avatar_url": "https://avatars.githubusercontent.com/u/1",
            "html_url": "https://github.com/octocat",
        }

        user = fetch_github_user("tok", "octocat")

        assert isinstance(user, GitHubUser)
        assert user.login == "octocat"
        assert user.name == "The Octocat"
        assert user.avatar_url == "https://avatars.githubusercontent.com/u/1"
        assert user.html_url == "https://github.com/octocat"
        mock_req.assert_called_once_with("tok", "/users/octocat")


# ---------------------------------------------------------------------------
# upsert_issue_comment
# ---------------------------------------------------------------------------


class TestUpsertIssueComment:
    @patch("github.github_request")
    @patch("github.paginate_github")
    def test_creates_new_comment_when_none_exists(
        self, mock_paginate: MagicMock, mock_req: MagicMock
    ) -> None:
        mock_paginate.return_value = []

        upsert_issue_comment(
            repository="owner/repo",
            token="tok",
            issue_number=42,
            marker="<!-- marker -->",
            body="hello",
        )

        mock_req.assert_called_once()
        args, kwargs = mock_req.call_args
        assert args[1] == "/repos/owner/repo/issues/42/comments"
        assert kwargs["method"] == "POST"
        assert kwargs["body"] == {"body": "hello"}

    @patch("github.github_request")
    @patch("github.paginate_github")
    def test_updates_existing_comment(self, mock_paginate: MagicMock, mock_req: MagicMock) -> None:
        mock_paginate.return_value = [
            {"id": 99, "body": "<!-- marker --> old content"},
        ]

        upsert_issue_comment(
            repository="owner/repo",
            token="tok",
            issue_number=42,
            marker="<!-- marker -->",
            body="updated",
        )

        mock_req.assert_called_once()
        args, kwargs = mock_req.call_args
        assert args[1] == "/repos/owner/repo/issues/comments/99"
        assert kwargs["method"] == "PATCH"
        assert kwargs["body"] == {"body": "updated"}


# ---------------------------------------------------------------------------
# parse_pr_file
# ---------------------------------------------------------------------------


class TestParsePrFile:
    def test_full_data(self) -> None:
        data = {
            "filename": "src/main.py",
            "status": "modified",
            "additions": 5,
            "deletions": 2,
            "changes": 7,
            "patch": "@@ -1,3 +1,6 @@",
        }
        result = parse_pr_file(data)
        assert isinstance(result, PullRequestFile)
        assert result.filename == "src/main.py"
        assert result.status == "modified"
        assert result.additions == 5
        assert result.deletions == 2
        assert result.changes == 7
        assert result.patch == "@@ -1,3 +1,6 @@"

    def test_missing_optional_fields(self) -> None:
        data = {
            "filename": "README.md",
            "status": "added",
        }
        result = parse_pr_file(data)
        assert result.additions == 0
        assert result.deletions == 0
        assert result.changes == 0
        assert result.patch is None

    def test_patch_none(self) -> None:
        data = {
            "filename": "binary.png",
            "status": "added",
            "additions": 0,
            "deletions": 0,
            "changes": 0,
            "patch": None,
        }
        result = parse_pr_file(data)
        assert result.patch is None
