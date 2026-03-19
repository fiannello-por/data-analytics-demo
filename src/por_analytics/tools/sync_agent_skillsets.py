"""Sync selected third-party agent skillsets into the repository."""

from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

from por_analytics.lib.agent_skillsets import (
    DEFAULT_SKILLSET_SPECS,
    SkillsetSpec,
    sync_repo_local_skills,
    sync_skillsets_from_checkouts,
)


def clone_skillset_checkout(workdir: Path, spec: SkillsetSpec) -> Path:
    """Clone a pinned upstream skillset into a temporary checkout."""

    destination = workdir / spec.name
    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--branch",
            "main",
            spec.repo,
            str(destination),
        ],
        check=True,
    )
    subprocess.run(["git", "-C", str(destination), "checkout", spec.ref], check=True)
    return destination


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync vendored agent skills from pinned upstream repositories."
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[3],
        help="Repository root to update. Defaults to the current project root.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = args.repo_root.resolve()

    with tempfile.TemporaryDirectory(prefix="agent-skillsets-") as tmpdir:
        tmp_path = Path(tmpdir)
        checkouts = {
            spec.name: clone_skillset_checkout(tmp_path, spec) for spec in DEFAULT_SKILLSET_SPECS
        }
        copied_files = sync_skillsets_from_checkouts(
            repo_root=repo_root,
            checkouts=checkouts,
        )
        copied_files.extend(sync_repo_local_skills(repo_root))

    print(f"Synced {len(copied_files)} files into repo-local agent skill directories.")


if __name__ == "__main__":
    main()
