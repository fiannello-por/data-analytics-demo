"""Tests for changelog PR-template parsing helpers."""

from __future__ import annotations

from pr_template import (
    changelog_note,
    missing_required_sections,
    parse_template_sections,
    should_skip_changelog,
)


def test_parse_template_sections_captures_markdown_sections_by_heading() -> None:
    body = "\n".join(
        [
            "## What changed",
            "Updated charts.",
            "",
            "## Why it matters",
            "Improves reporting.",
            "",
            "## Changelog note",
            "Better dashboard clarity.",
        ]
    )
    assert parse_template_sections(body) == {
        "what changed": "Updated charts.",
        "why it matters": "Improves reporting.",
        "changelog note": "Better dashboard clarity.",
    }


def test_missing_required_sections_flags_empty_or_missing_required_sections() -> None:
    body = "\n".join(
        [
            "## What changed",
            "Updated charts.",
            "",
            "## Why it matters",
            "<!-- fill me -->",
            "",
            "## Risks",
            "Low risk.",
        ]
    )
    assert missing_required_sections(body) == [
        "Why it matters",
        "Validation",
        "Changelog note",
    ]


def test_should_skip_changelog_only_accepts_explicit_skip_note() -> None:
    assert changelog_note("## Changelog note\nskip") == "skip"
    assert should_skip_changelog("## Changelog note\nskip") is True
    assert should_skip_changelog("## Changelog note\nPublic update") is False
