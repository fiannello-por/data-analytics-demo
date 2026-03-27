"""Utility functions for agent workflows: file reading, diff formatting, and text sanitization."""

from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .github import PullRequestFile

_SAFE_HTML_TAGS = frozenset({"details", "summary", "br"})


def find_repo_root() -> Path:
    """Locate the monorepo root from the installed tooling package location."""
    current = Path(__file__).resolve()
    for candidate in current.parents:
        if (candidate / "pnpm-workspace.yaml").is_file():
            return candidate

    raise ValueError(f"Unable to locate repository root from {current}")


def read_guidance_if_exists(
    file_path: str,
    max_chars: int = 20000,
    workspace_root: Path | None = None,
) -> str:
    """Read a guidance file relative to the workspace root.

    Returns an empty string if the file does not exist.

    Raises:
        ValueError: If the resolved path escapes the workspace root.
    """
    if workspace_root is None:
        workspace_root = find_repo_root()

    resolved = (workspace_root / file_path).resolve()

    if not resolved.is_relative_to(workspace_root.resolve()):
        raise ValueError(f"Refusing to read guidance outside the workspace: {file_path}")

    try:
        content = resolved.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""

    return content[:max_chars]


def build_diff_summary(
    files: list[PullRequestFile],
    limit: int = 40,
    patch_chars: int = 12000,
) -> str:
    """Format a list of PR files into a human-readable diff summary string."""
    parts: list[str] = []

    for file in files[:limit]:
        patch = file.patch[:patch_chars] if file.patch else "Patch unavailable"
        parts.append(
            "\n".join(
                [
                    f"FILE: {file.filename}",
                    f"STATUS: {file.status}",
                    f"CHANGES: +{file.additions} -{file.deletions}",
                    "PATCH:",
                    patch,
                ]
            )
        )

    return "\n\n".join(parts)


def sanitize_plain_text(value: str) -> str:
    """Remove null bytes and trim whitespace."""
    return value.replace("\0", "").strip()


def sanitize_markdown(value: str) -> str:
    """Strip unsafe HTML/MDX constructs from markdown, keeping safe tags."""
    result = sanitize_plain_text(value)

    # Remove import/export lines
    result = re.sub(r"^\s*(import|export)\s+.*$", "", result, flags=re.IGNORECASE | re.MULTILINE)

    # Remove <script>...</script> blocks
    result = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", "", result, flags=re.IGNORECASE)

    # Remove unsafe self-closing or opening/closing tags
    result = re.sub(
        r"</?(script|style|iframe|object|embed)\b[^>]*>", "", result, flags=re.IGNORECASE
    )

    # Remove all remaining HTML tags except safe ones
    def _filter_tag(match: re.Match[str]) -> str:
        tag_name = match.group(1)
        if tag_name.lower() in _SAFE_HTML_TAGS:
            return match.group(0)
        return ""

    result = re.sub(r"</?([A-Za-z][A-Za-z0-9-]*)\b[^>]*>", _filter_tag, result)

    return result


def yaml_single_quoted(value: str) -> str:
    """Escape a string for use as a YAML single-quoted scalar."""
    return "'" + value.replace("'", "''") + "'"
