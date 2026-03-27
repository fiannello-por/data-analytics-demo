"""Tests for the skills manifest and local skill checker."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, cast

import pytest

from por_tooling.validators.skills_manifest import (
    _default_manifest_path,
    check_installed_skills,
    compute_skill_tree_sha256,
    load_manifest,
    validate_manifest,
)

if TYPE_CHECKING:
    from pathlib import Path


def _manifest_dict() -> dict[str, Any]:
    return {
        "version": 1,
        "skills": {
            "using-superpowers": {
                "source": {
                    "kind": "git",
                    "repo": "https://github.com/obra/superpowers.git",
                    "commit": "8ea39819eed74fe2a0338e71789f06b30e953041",
                    "path": "skills/using-superpowers",
                },
                "install": {"kind": "codex_superpowers", "path": "skills/using-superpowers"},
                "content_sha256": "sha-using-superpowers",
            },
            "verification-before-completion": {
                "source": {
                    "kind": "git",
                    "repo": "https://github.com/obra/superpowers.git",
                    "commit": "8ea39819eed74fe2a0338e71789f06b30e953041",
                    "path": "skills/verification-before-completion",
                },
                "install": {
                    "kind": "codex_superpowers",
                    "path": "skills/verification-before-completion",
                },
                "content_sha256": "sha-verification-before-completion",
            },
            "developing-in-lightdash": {
                "source": {
                    "kind": "managed",
                    "repository": "codex-skills",
                    "version": "managed",
                    "path": "developing-in-lightdash",
                },
                "install": {"kind": "codex_home", "path": "skills/developing-in-lightdash"},
                "content_sha256": "sha-developing-in-lightdash",
            },
        },
        "policy": {
            "global_required": ["using-superpowers", "verification-before-completion"],
            "task_rules": [
                {
                    "name": "lightdash",
                    "description": "All Lightdash tasks must use the Lightdash skill.",
                    "match": {
                        "paths": [
                            "semantic/lightdash/**",
                            "lightdash.config.yml",
                            "tooling/src/por_tooling/validators/**",
                        ],
                        "keywords": ["lightdash", "semantic layer", "dashboard as code"],
                    },
                    "required_skills": ["developing-in-lightdash"],
                }
            ],
        },
    }


def test_repo_manifest_is_valid() -> None:
    manifest = load_manifest(_default_manifest_path())
    validate_manifest(manifest)

    assert manifest.policy.global_required == [
        "using-superpowers",
        "verification-before-completion",
    ]
    assert manifest.policy.task_rules[0].required_skills == ["developing-in-lightdash"]


def test_validate_manifest_rejects_unknown_skill(tmp_path: Path) -> None:
    manifest_data = _manifest_dict()
    manifest_data["policy"] = {
        "global_required": ["using-superpowers", "missing-skill"],
        "task_rules": [],
    }
    manifest_path = tmp_path / "skills.manifest.json"
    manifest_path.write_text(json.dumps(manifest_data))

    manifest = load_manifest(manifest_path)

    with pytest.raises(ValueError, match="missing-skill"):
        validate_manifest(manifest)


def test_check_installed_skills_passes_when_hashes_match(tmp_path: Path) -> None:
    codex_home = tmp_path / ".codex"
    using_superpowers = codex_home / "superpowers" / "skills" / "using-superpowers"
    verification = codex_home / "superpowers" / "skills" / "verification-before-completion"
    lightdash = codex_home / "skills" / "developing-in-lightdash"

    using_superpowers.mkdir(parents=True)
    verification.mkdir(parents=True)
    lightdash.mkdir(parents=True)

    (using_superpowers / "SKILL.md").write_text("# using-superpowers\n")
    (verification / "SKILL.md").write_text("# verification\n")
    (lightdash / "SKILL.md").write_text("# developing-in-lightdash\n")
    (lightdash / "resources.md").write_text("references\n")

    manifest_data = _manifest_dict()
    skills = cast("dict[str, dict[str, Any]]", manifest_data["skills"])
    skills["using-superpowers"]["content_sha256"] = compute_skill_tree_sha256(using_superpowers)
    skills["verification-before-completion"]["content_sha256"] = compute_skill_tree_sha256(
        verification
    )
    skills["developing-in-lightdash"]["content_sha256"] = compute_skill_tree_sha256(lightdash)

    manifest_path = tmp_path / "skills.manifest.json"
    manifest_path.write_text(json.dumps(manifest_data))

    manifest = load_manifest(manifest_path)
    validate_manifest(manifest)

    errors = check_installed_skills(manifest, codex_home=codex_home)
    assert errors == []


def test_check_installed_skills_reports_missing_and_outdated(tmp_path: Path) -> None:
    codex_home = tmp_path / ".codex"
    using_superpowers = codex_home / "superpowers" / "skills" / "using-superpowers"
    verification = codex_home / "superpowers" / "skills" / "verification-before-completion"

    using_superpowers.mkdir(parents=True)
    verification.mkdir(parents=True)

    (using_superpowers / "SKILL.md").write_text("# using-superpowers\n")
    (verification / "SKILL.md").write_text("# verification\n")

    manifest_data = _manifest_dict()
    skills = cast("dict[str, dict[str, Any]]", manifest_data["skills"])
    skills["using-superpowers"]["content_sha256"] = compute_skill_tree_sha256(using_superpowers)
    skills["verification-before-completion"]["content_sha256"] = "wrong-hash"

    manifest_path = tmp_path / "skills.manifest.json"
    manifest_path.write_text(json.dumps(manifest_data))

    manifest = load_manifest(manifest_path)
    validate_manifest(manifest)

    errors = check_installed_skills(manifest, codex_home=codex_home)
    assert any("verification-before-completion" in error for error in errors)
    assert any("developing-in-lightdash" in error for error in errors)
