@AGENTS.md

## Claude Code

- Read `AGENTS.md` first. It is the canonical model-agnostic brain.
- Load `.claude/skills/*` only when the task matches the skill name.
- Use `.claude/agents/*` only for broad exploration or review. Do not spawn subagents for narrow edits.
- Load `.claude/references/*` on demand. Never load all references by default.
- Keep outputs concise. Follow token budgets in `AGENTS.md`.
- Do not trust or share local secrets; use ignored env files and SSH config names instead.
