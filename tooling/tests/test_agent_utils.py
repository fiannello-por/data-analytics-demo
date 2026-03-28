"""Tests for shared tooling helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
from lib.agent_utils import (
    build_diff_summary,
    read_guidance_if_exists,
    sanitize_markdown,
    sanitize_plain_text,
    yaml_single_quoted,
)


@dataclass
class PullRequestFile:
    filename: str
    status: str
    additions: int
    deletions: int
    changes: int
    patch: str | None = None


def test_build_diff_summary_truncates_file_list_and_patch_text() -> None:
    summary = build_diff_summary(
        [
            PullRequestFile(
                filename="semantic/lightdash/models/opportunity_view.yml",
                status="modified",
                additions=10,
                deletions=2,
                changes=12,
                patch="a" * 20,
            ),
            PullRequestFile(
                filename="README.md",
                status="modified",
                additions=1,
                deletions=1,
                changes=2,
                patch="b" * 20,
            ),
        ],
        limit=1,
        patch_chars=5,
    )
    assert "README.md" not in summary
    assert "aaaaa" in summary
    assert "aaaaaa" not in summary


def test_sanitize_markdown_strips_unsafe_mdx_while_preserving_safe_html_tags() -> None:
    output = sanitize_markdown(
        "\n".join(
            [
                "import Bad from './bad';",
                "<script>alert(1)</script>",
                "<Component />",
                "<details><summary>More</summary>Safe text</details>",
                "Safe text",
            ]
        )
    )
    assert "import Bad" not in output
    assert "<script>" not in output
    assert "<Component />" not in output
    assert "<details><summary>More</summary>Safe text</details>" in output
    assert "Safe text" in output


def test_yaml_single_quoted_escapes_single_quotes() -> None:
    assert yaml_single_quoted("Point of Rental's update") == "'Point of Rental''s update'"


def test_sanitize_plain_text_removes_null_bytes_and_trims() -> None:
    assert sanitize_plain_text("  hello \0 world  ") == "hello  world"


# ---------------------------------------------------------------------------
# read_guidance_if_exists
# ---------------------------------------------------------------------------


def test_read_guidance_if_exists_reads_file(tmp_path: Path) -> None:
    guide = tmp_path / "GUIDE.md"
    guide.write_text("hello world", encoding="utf-8")

    result = read_guidance_if_exists("GUIDE.md", workspace_root=tmp_path)
    assert result == "hello world"


def test_read_guidance_if_exists_missing_file_returns_empty(tmp_path: Path) -> None:
    result = read_guidance_if_exists("nonexistent.md", workspace_root=tmp_path)
    assert result == ""


def test_read_guidance_if_exists_path_traversal_raises(tmp_path: Path) -> None:
    import pytest

    with pytest.raises(ValueError, match="Refusing to read guidance outside"):
        read_guidance_if_exists("../../etc/passwd", workspace_root=tmp_path)


def test_read_guidance_if_exists_truncates_to_max_chars(tmp_path: Path) -> None:
    guide = tmp_path / "big.md"
    guide.write_text("A" * 500, encoding="utf-8")

    result = read_guidance_if_exists("big.md", max_chars=10, workspace_root=tmp_path)
    assert result == "A" * 10
    assert len(result) == 10
