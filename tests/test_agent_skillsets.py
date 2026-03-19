"""Tests for bundling third-party agent skillsets into the repository."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from por_analytics.lib.agent_skillsets import (
    REPO_LOCAL_SKILL_NAMES,
    SkillsetSpec,
    sync_repo_local_skills,
    sync_skillsets_from_checkouts,
)

if TYPE_CHECKING:
    from pathlib import Path


def _write_skill(root: Path, relative_path: str, body: str) -> None:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body)


class TestSyncSkillsetsFromCheckouts:
    def test_copies_all_skills_into_agents_and_claude_directories(self, tmp_path: Path) -> None:
        repo_root = tmp_path / "repo"
        checkouts_root = tmp_path / "checkouts"

        _write_skill(
            checkouts_root,
            "superpowers/skills/brainstorming/SKILL.md",
            "---\nname: brainstorming\ndescription: test\n---\n",
        )
        _write_skill(
            checkouts_root,
            "impeccable/source/skills/frontend-design/SKILL.md",
            "---\nname: frontend-design\ndescription: test\n---\n",
        )

        specs = (
            SkillsetSpec(
                name="superpowers",
                repo="https://github.com/obra/superpowers.git",
                ref="main",
                source_subdir="skills",
            ),
            SkillsetSpec(
                name="impeccable",
                repo="https://github.com/pbakaus/impeccable.git",
                ref="main",
                source_subdir="source/skills",
            ),
        )

        copied_paths = sync_skillsets_from_checkouts(
            repo_root=repo_root,
            checkouts={
                "superpowers": checkouts_root / "superpowers",
                "impeccable": checkouts_root / "impeccable",
            },
            specs=specs,
        )

        assert repo_root / ".agents/skills/brainstorming/SKILL.md" in copied_paths
        assert repo_root / ".claude/skills/brainstorming/SKILL.md" in copied_paths
        assert repo_root / ".agents/skills/frontend-design/SKILL.md" in copied_paths
        assert repo_root / ".claude/skills/frontend-design/SKILL.md" in copied_paths

        assert (
            (repo_root / ".agents/skills/brainstorming/SKILL.md")
            .read_text()
            .startswith("---\nname: brainstorming")
        )
        assert (
            (repo_root / ".claude/skills/frontend-design/SKILL.md")
            .read_text()
            .startswith("---\nname: frontend-design")
        )

    def test_replaces_stale_skill_directory(self, tmp_path: Path) -> None:
        repo_root = tmp_path / "repo"
        stale_dir = repo_root / ".agents/skills/brainstorming"
        stale_dir.mkdir(parents=True, exist_ok=True)
        (stale_dir / "STALE.md").write_text("old")

        checkouts_root = tmp_path / "checkouts"
        _write_skill(
            checkouts_root,
            "superpowers/skills/brainstorming/SKILL.md",
            "---\nname: brainstorming\ndescription: new\n---\n",
        )

        copied_paths = sync_skillsets_from_checkouts(
            repo_root=repo_root,
            checkouts={"superpowers": checkouts_root / "superpowers"},
            specs=(
                SkillsetSpec(
                    name="superpowers",
                    repo="https://github.com/obra/superpowers.git",
                    ref="main",
                    source_subdir="skills",
                ),
            ),
        )

        assert repo_root / ".agents/skills/brainstorming/SKILL.md" in copied_paths
        assert not (repo_root / ".agents/skills/brainstorming/STALE.md").exists()

    def test_raises_when_checkout_is_missing_required_source_directory(
        self, tmp_path: Path
    ) -> None:
        with pytest.raises(FileNotFoundError, match="source/skills"):
            sync_skillsets_from_checkouts(
                repo_root=tmp_path / "repo",
                checkouts={"impeccable": tmp_path / "missing-checkout"},
                specs=(
                    SkillsetSpec(
                        name="impeccable",
                        repo="https://github.com/pbakaus/impeccable.git",
                        ref="main",
                        source_subdir="source/skills",
                    ),
                ),
            )


class TestSyncRepoLocalSkills:
    def test_mirrors_repo_local_skills_into_claude_directory(self, tmp_path: Path) -> None:
        repo_root = tmp_path / "repo"
        _write_skill(
            repo_root,
            ".agents/skills/developing-in-lightdash/SKILL.md",
            "---\nname: developing-in-lightdash\ndescription: test\n---\n",
        )
        _write_skill(
            repo_root,
            ".agents/skills/thoughtspot-to-lightdash/SKILL.md",
            "---\nname: thoughtspot-to-lightdash\ndescription: test\n---\n",
        )

        copied_paths = sync_repo_local_skills(repo_root=repo_root)

        assert REPO_LOCAL_SKILL_NAMES == (
            "developing-in-lightdash",
            "thoughtspot-to-lightdash",
        )
        assert repo_root / ".claude/skills/developing-in-lightdash/SKILL.md" in copied_paths
        assert repo_root / ".claude/skills/thoughtspot-to-lightdash/SKILL.md" in copied_paths
        assert (
            (repo_root / ".claude/skills/developing-in-lightdash/SKILL.md")
            .read_text()
            .startswith("---\nname: developing-in-lightdash")
        )
