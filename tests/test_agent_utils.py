"""Tests for por_analytics.lib.agent_utils."""

from __future__ import annotations

from por_analytics.lib.agent_utils import (
    build_diff_summary,
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
