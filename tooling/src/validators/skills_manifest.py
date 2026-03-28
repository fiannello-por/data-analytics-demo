"""Local validation for the repository skills manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from lib.agent_utils import find_repo_root


@dataclass(frozen=True)
class SkillSource:
    kind: str
    path: str
    repo: str | None = None
    commit: str | None = None
    repository: str | None = None
    version: str | None = None


@dataclass(frozen=True)
class SkillInstall:
    kind: str
    path: str


@dataclass(frozen=True)
class SkillDefinition:
    name: str
    source: SkillSource
    install: SkillInstall
    content_sha256: str


@dataclass(frozen=True)
class TaskRule:
    name: str
    description: str
    match: dict[str, list[str]]
    required_skills: list[str]


@dataclass(frozen=True)
class ManifestPolicy:
    global_required: list[str]
    task_rules: list[TaskRule]


@dataclass(frozen=True)
class SkillsManifest:
    version: int
    skills: dict[str, SkillDefinition]
    policy: ManifestPolicy


def _expect_object(value: object, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{context} must be an object")
    return value


def _expect_string(value: object, context: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{context} must be a non-empty string")
    return value


def _expect_string_list(value: object, context: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{context} must be a non-empty list of strings")

    strings = [_expect_string(item, context) for item in value]
    return strings


def load_manifest(path: Path) -> SkillsManifest:
    raw = json.loads(path.read_text())
    root = _expect_object(raw, "manifest")

    version = root.get("version")
    if not isinstance(version, int):
        raise ValueError("manifest.version must be an integer")

    skills_root = _expect_object(root.get("skills"), "manifest.skills")
    if not skills_root:
        raise ValueError("manifest.skills must define at least one skill")

    skills: dict[str, SkillDefinition] = {}
    for name, raw_skill in skills_root.items():
        skill = _expect_object(raw_skill, f"manifest.skills[{name}]")
        source_raw = _expect_object(skill.get("source"), f"manifest.skills[{name}].source")
        install_raw = _expect_object(skill.get("install"), f"manifest.skills[{name}].install")

        source = SkillSource(
            kind=_expect_string(source_raw.get("kind"), f"{name}.source.kind"),
            path=_expect_string(source_raw.get("path"), f"{name}.source.path"),
            repo=source_raw.get("repo") if isinstance(source_raw.get("repo"), str) else None,
            commit=(
                source_raw.get("commit") if isinstance(source_raw.get("commit"), str) else None
            ),
            repository=(
                source_raw.get("repository")
                if isinstance(source_raw.get("repository"), str)
                else None
            ),
            version=(
                source_raw.get("version") if isinstance(source_raw.get("version"), str) else None
            ),
        )
        install = SkillInstall(
            kind=_expect_string(install_raw.get("kind"), f"{name}.install.kind"),
            path=_expect_string(install_raw.get("path"), f"{name}.install.path"),
        )
        skills[name] = SkillDefinition(
            name=name,
            source=source,
            install=install,
            content_sha256=_expect_string(skill.get("content_sha256"), f"{name}.content_sha256"),
        )

    policy_raw = _expect_object(root.get("policy"), "manifest.policy")
    global_required = _expect_string_list(
        policy_raw.get("global_required"), "manifest.policy.global_required"
    )

    task_rules_raw = policy_raw.get("task_rules")
    if not isinstance(task_rules_raw, list):
        raise ValueError("manifest.policy.task_rules must be a list")

    task_rules: list[TaskRule] = []
    for index, raw_rule in enumerate(task_rules_raw):
        rule = _expect_object(raw_rule, f"manifest.policy.task_rules[{index}]")
        match = _expect_object(rule.get("match"), f"task_rules[{index}].match")
        normalized_match: dict[str, list[str]] = {}
        for key, value in match.items():
            normalized_match[key] = _expect_string_list(value, f"task_rules[{index}].match.{key}")

        task_rules.append(
            TaskRule(
                name=_expect_string(rule.get("name"), f"task_rules[{index}].name"),
                description=_expect_string(
                    rule.get("description"), f"task_rules[{index}].description"
                ),
                match=normalized_match,
                required_skills=_expect_string_list(
                    rule.get("required_skills"),
                    f"task_rules[{index}].required_skills",
                ),
            )
        )

    return SkillsManifest(
        version=version,
        skills=skills,
        policy=ManifestPolicy(
            global_required=global_required,
            task_rules=task_rules,
        ),
    )


def validate_manifest(manifest: SkillsManifest) -> None:
    if manifest.version != 1:
        raise ValueError(f"Unsupported manifest version: {manifest.version}")

    known_skills = set(manifest.skills)

    for skill_name in manifest.policy.global_required:
        if skill_name not in known_skills:
            raise ValueError(
                f"manifest.policy.global_required references unknown skill: {skill_name}"
            )

    for rule in manifest.policy.task_rules:
        for skill_name in rule.required_skills:
            if skill_name not in known_skills:
                raise ValueError(f"task rule {rule.name!r} references unknown skill: {skill_name}")

    for skill in manifest.skills.values():
        if skill.source.kind == "git" and (not skill.source.repo or not skill.source.commit):
            raise ValueError(f"skill {skill.name!r} must declare repo and commit for git sources")
        if skill.source.kind == "managed" and (
            not skill.source.repository or not skill.source.version
        ):
            raise ValueError(
                f"skill {skill.name!r} must declare repository and version for managed sources"
            )


def compute_skill_tree_sha256(skill_dir: Path) -> str:
    if not skill_dir.is_dir():
        raise ValueError(f"Skill directory does not exist: {skill_dir}")

    digest = hashlib.sha256()
    files = sorted(path for path in skill_dir.rglob("*") if path.is_file())
    for file_path in files:
        relative_path = file_path.relative_to(skill_dir).as_posix()
        digest.update(relative_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def _default_codex_home() -> Path:
    codex_home = os.environ.get("CODEX_HOME")
    if codex_home:
        return Path(codex_home)
    return Path.home() / ".codex"


def _default_manifest_path() -> Path:
    return find_repo_root() / "skills.manifest.json"


def _resolve_install_path(skill: SkillDefinition, codex_home: Path) -> Path:
    if skill.install.kind == "codex_superpowers":
        return codex_home / "superpowers" / skill.install.path
    if skill.install.kind == "codex_home":
        return codex_home / skill.install.path
    raise ValueError(f"Unsupported install kind for {skill.name!r}: {skill.install.kind}")


def check_installed_skills(
    manifest: SkillsManifest, *, codex_home: Path | None = None
) -> list[str]:
    errors: list[str] = []
    base_dir = codex_home or _default_codex_home()

    for skill_name in set(manifest.policy.global_required).union(
        *(rule.required_skills for rule in manifest.policy.task_rules)
    ):
        skill = manifest.skills[skill_name]
        installed_path = _resolve_install_path(skill, base_dir)

        if not installed_path.is_dir():
            errors.append(f"Required skill {skill_name!r} is not installed at {installed_path}")
            continue

        actual_hash = compute_skill_tree_sha256(installed_path)
        if actual_hash != skill.content_sha256:
            errors.append(
                f"Required skill {skill_name!r} is outdated or modified "
                f"(expected {skill.content_sha256}, found {actual_hash})"
            )

    return sorted(errors)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate the repository skills manifest and local skill installs."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=_default_manifest_path(),
        help="Path to the skills manifest file.",
    )
    parser.add_argument(
        "--policy-only",
        action="store_true",
        help="Validate manifest policy only, without checking installed skill contents.",
    )
    args = parser.parse_args()

    manifest = load_manifest(args.manifest)
    validate_manifest(manifest)

    if args.policy_only:
        print(f"OK: skills manifest policy valid ({args.manifest})")
        return 0

    errors = check_installed_skills(manifest)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print(f"OK: skills manifest and installed skill pins valid ({args.manifest})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
