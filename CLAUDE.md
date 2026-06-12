@AGENTS.md

## Claude Code

- Keep startup context small. Use `.claude/skills/*` for procedures and `.claude/rules/*` for path-specific guidance.
- Delegate broad exploration to project subagents instead of reading many files in the main conversation.
- Run `/memory` when debugging why project instructions are not being loaded.
- Do not trust or share local secrets; use ignored env files and SSH config names instead.
