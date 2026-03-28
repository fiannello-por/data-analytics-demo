"""Tests for changelog generation helpers."""

from generate_changelog import sanitize_sections, sanitize_slug


def test_sanitize_slug_converts_to_url_safe() -> None:
    assert sanitize_slug("Hello World!") == "hello-world"
    assert sanitize_slug("feat: add New Feature #123") == "feat-add-new-feature-123"


def test_sanitize_slug_truncates_to_60_chars() -> None:
    long_title = "a" * 100
    assert len(sanitize_slug(long_title)) == 60


def test_sanitize_sections_cleans_keys_and_values() -> None:
    result = sanitize_sections({"  Key \0": "  Value \0 "})
    assert result == {"Key": "Value"}
