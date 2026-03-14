"""Tests for por_analytics.lib.agent_utils."""

from __future__ import annotations

from typing import TYPE_CHECKING

from por_analytics.agents.generate_changelog import sanitize_sections, sanitize_slug

if TYPE_CHECKING:
    from pathlib import Path
from por_analytics.agents.review_pr import (
    COMMENT_MARKER,
    ReviewFinding,
    ReviewResult,
    _render_review_comment,
    _select_lightdash_guidance,
)
from por_analytics.lib.agent_utils import (
    build_diff_summary,
    read_guidance_if_exists,
    sanitize_markdown,
    sanitize_plain_text,
    yaml_single_quoted,
)
from por_analytics.lib.github import PullRequestFile


def test_build_diff_summary_truncates_file_list_and_patch_text() -> None:
    summary = build_diff_summary(
        [
            PullRequestFile(
                filename="lightdash/models/opportunity_view.yml",
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


# ---------------------------------------------------------------------------
# sanitize_slug / sanitize_sections (generate_changelog)
# ---------------------------------------------------------------------------


def test_sanitize_slug_converts_to_url_safe() -> None:
    assert sanitize_slug("Hello World!") == "hello-world"
    assert sanitize_slug("feat: add New Feature #123") == "feat-add-new-feature-123"


def test_sanitize_slug_truncates_to_60_chars() -> None:
    long_title = "a" * 100
    assert len(sanitize_slug(long_title)) == 60


def test_sanitize_sections_cleans_keys_and_values() -> None:
    result = sanitize_sections({"  Key \0": "  Value \0 "})
    assert result == {"Key": "Value"}


# ---------------------------------------------------------------------------
# _render_review_comment / _select_lightdash_guidance (review_pr)
# ---------------------------------------------------------------------------


def test_render_review_comment_includes_marker_and_findings() -> None:
    review = ReviewResult(
        summary="Looks good overall.",
        documentation_status="pass",
        required_changes=False,
        findings=[
            ReviewFinding(
                severity="medium",
                title="Missing label",
                rationale="Field has no label",
                file="lightdash/models/foo.yml",
                recommendation="Add a label",
            )
        ],
    )
    body = _render_review_comment(review=review, missing_sections=[], pr_url="https://example.com")
    assert COMMENT_MARKER in body
    assert "[MEDIUM]" in body
    assert "Missing label" in body
    assert "https://example.com" in body


def test_render_review_comment_with_missing_sections() -> None:
    review = ReviewResult(
        summary="Needs work.",
        documentation_status="needs-work",
        required_changes=True,
        findings=[],
    )
    body = _render_review_comment(
        review=review,
        missing_sections=["Risks", "Validation"],
        pr_url="https://example.com",
    )
    assert "Missing PR template sections:" in body
    assert "- Risks" in body
    assert "- Validation" in body


def test_render_review_comment_no_findings() -> None:
    review = ReviewResult(
        summary="All clear.",
        documentation_status="pass",
        required_changes=False,
        findings=[],
    )
    body = _render_review_comment(review=review, missing_sections=[], pr_url="https://example.com")
    assert "No concrete findings" in body


def test_select_lightdash_guidance_includes_skill_md() -> None:
    files = [
        PullRequestFile(
            filename="README.md", status="modified", additions=1, deletions=0, changes=1
        )
    ]
    guidance = _select_lightdash_guidance(files)
    # SKILL.md is always included
    assert any("SKILL.md" in g for g in guidance)


def test_select_lightdash_guidance_adds_model_docs() -> None:
    files = [
        PullRequestFile(
            filename="lightdash/models/foo.yml",
            status="modified",
            additions=1,
            deletions=0,
            changes=1,
        )
    ]
    guidance = _select_lightdash_guidance(files)
    assert any("metrics-reference" in g for g in guidance)
    assert any("dimensions-reference" in g for g in guidance)
