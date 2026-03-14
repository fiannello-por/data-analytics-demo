"""PR template parsing utilities for validating pull request body sections."""

from __future__ import annotations

import re

REQUIRED_HEADINGS: tuple[str, ...] = (
    "What changed",
    "Why it matters",
    "Risks",
    "Validation",
    "Changelog note",
)


def parse_template_sections(body: str | None) -> dict[str, str]:
    """Split a PR body by ``## `` headings into a dict keyed by lowercased heading."""
    if not body:
        return {}

    sections = re.split(r"^##\s+", body, flags=re.MULTILINE)
    output: dict[str, str] = {}

    for section in sections:
        section = section.strip()
        if not section:
            continue

        lines = section.split("\n", 1)
        heading = lines[0].strip()
        if not heading:
            continue

        content = lines[1].strip() if len(lines) > 1 else ""
        output[heading.lower()] = content

    return output


def missing_required_sections(body: str | None) -> list[str]:
    """Return the list of required headings whose content is missing or only HTML comments."""
    sections = parse_template_sections(body)
    missing: list[str] = []

    for heading in REQUIRED_HEADINGS:
        content = sections.get(heading.lower())
        if not content:
            missing.append(heading)
            continue

        stripped = re.sub(r"<!--.*?-->", "", content, flags=re.DOTALL).strip()
        if not stripped:
            missing.append(heading)

    return missing


def changelog_note(body: str | None) -> str:
    """Extract the changelog note section from a PR body, or return empty string."""
    sections = parse_template_sections(body)
    return sections.get("changelog note", "")


def should_skip_changelog(body: str | None) -> bool:
    """Check whether the changelog note indicates the changelog should be skipped."""
    return changelog_note(body).strip().lower() == "skip"
