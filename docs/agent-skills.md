# Bundled Agent Skills

This repository now vendors two third-party skill libraries so they are
available from the repo itself:

- **Superpowers** from `obra/superpowers`
- **Impeccable** from `pbakaus/impeccable`

They are mirrored into two project-local discovery roots:

- [`.agents/skills`](/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/.agents/skills) for Codex and other Agent Skills-compatible tooling
- [`.claude/skills`](/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/.claude/skills) for Claude Code

## Pinned Sources

- `obra/superpowers@7e516434f2a30114300efc9247db32fb37daa5f9`
- `pbakaus/impeccable@d6b1a56bc5b79e9375be0f8508b4daa1678fb058`

These copies are intentionally checked into git so contributors using this repo
do not need to install the skillsets globally before they are discoverable.

In addition, this repo tracks two repo-native analytics skills directly under
`.agents/skills/` and mirrors them into `.claude/skills/` during sync:

- `developing-in-lightdash`
- `thoughtspot-to-lightdash`

## Refreshing The Vendor Copy

Run:

```bash
uv run sync-agent-skillsets
```

That command clones the pinned upstream commits and mirrors their skill folders
into the repo-local `.agents/skills/` and `.claude/skills/` directories, then
copies the repo-native Lightdash skills from `.agents/skills/` into
`.claude/skills/`.

## Notes

- This repo vendors the **skill files**. It does not currently vendor Codex
  prompt wrappers or Claude slash-command wrappers from those upstream projects.
- When updating the pinned commits, update both
  [agent_skillsets.py](/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/src/por_analytics/lib/agent_skillsets.py)
  and this document in the same PR.
