"""Utilities for bundling third-party agent skills into the repository."""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Iterable


TARGET_SKILL_ROOTS = (Path(".agents/skills"), Path(".claude/skills"))


@dataclass(frozen=True)
class SkillsetSpec:
    """A third-party skillset source that can be mirrored into this repo."""

    name: str
    repo: str
    ref: str
    source_subdir: str


DEFAULT_SKILLSET_SPECS = (
    SkillsetSpec(
        name="superpowers",
        repo="https://github.com/obra/superpowers.git",
        ref="7e516434f2a30114300efc9247db32fb37daa5f9",
        source_subdir="skills",
    ),
    SkillsetSpec(
        name="impeccable",
        repo="https://github.com/pbakaus/impeccable.git",
        ref="d6b1a56bc5b79e9375be0f8508b4daa1678fb058",
        source_subdir="source/skills",
    ),
)


def sync_skillsets_from_checkouts(
    *,
    repo_root: Path,
    checkouts: dict[str, Path],
    specs: Iterable[SkillsetSpec] = DEFAULT_SKILLSET_SPECS,
) -> list[Path]:
    """Copy skill directories from local checkouts into repo-local skill roots."""

    copied_files: list[Path] = []

    for spec in specs:
        checkout_root = checkouts.get(spec.name)
        if checkout_root is None:
            raise FileNotFoundError(f"Missing checkout for skillset: {spec.name}")

        source_root = checkout_root / spec.source_subdir
        if not source_root.is_dir():
            raise FileNotFoundError(
                f"Expected source directory for {spec.name}: {source_root}"
            )

        for skill_dir in sorted(path for path in source_root.iterdir() if path.is_dir()):
            for target_root in TARGET_SKILL_ROOTS:
                destination = repo_root / target_root / skill_dir.name
                if destination.exists():
                    shutil.rmtree(destination)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copytree(skill_dir, destination)
                copied_files.extend(
                    path for path in destination.rglob("*") if path.is_file()
                )

    return copied_files
