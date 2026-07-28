@AGENTS.md

## AI Agent Quickstart (Claude Code / Codex / DeepSeek)

- Read `AGENTS.md` first. It is the canonical model-agnostic brain.
- **Claude Code:** Load `.claude/skills/*` only when task matches skill name. Use `.claude/agents/*` subagents for broad exploration/review.
- **Codex / DeepSeek / Copilot:** Load `.copilot/skills/*` only when task matches skill name. Use `Explore` subagent (`runSubagent`) for broad codebase exploration. Use `grep_search`/`semantic_search` instead of `rg`. Prefer `replace_string_in_file` with 3+ context lines.
- Load `.claude/references/*` on demand. Never load all references by default.
- Keep outputs concise. Follow token budgets in `AGENTS.md`.
- Do not trust or share local secrets; use ignored env files and SSH config names instead.
