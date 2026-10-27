---
name: using-skills
description: Use when starting a conversation - how to find the skill that fits a task and use it before acting on the task
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

## The Rule

**When a skill fits the task, or the user names one, invoke it before acting on the task** — before clarifying questions or exploring the codebase too, since the skill may say how to do those. If it turns out not to fit, set it aside.

**Before entering plan mode:** if you haven't already brainstormed, invoke the brainstorming skill first.

Then announce "Using [skill] to [purpose]" and follow the skill. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills carry it out. Brainstorming and root-cause debugging are the most common process skills, but the rule holds for any of them.

- "Let's build X" → brainstorming first, then implementation skills.
- "Fix this bug" → the debugging skill first (root cause before any fix), then domain skills.

## Common Misses

- A simple task still gets the skill that fits it.
- A familiar skill still gets read: skills change, so open the current version rather than recalling it.

## Platform Adaptation

If your harness appears here, read its reference file for special instructions:

- Claude Code: `references/claude-code-tools.md`
- Codex CLI: `references/codex-tools.md`
- Antigravity CLI: `references/antigravity-tools.md`

## Finding Skills in This Repository

- Every skill lives at `.agents/skills/<name>/SKILL.md` (`.agents` and `.claude` are the same directory), so Claude Code, Codex CLI and Antigravity CLI all discover the same set.
- When the root `AGENTS.md` has a `## Skill Triggers` section, it is the index of which skill handles which situation; check it before acting. Without one, match the task against each skill's `description`.
- Claude Code invokes a skill with the `Skill` tool. Codex CLI and Antigravity CLI list skills natively; when one is not listed, read its `SKILL.md` with the file-read tool and follow it.
- The repository's own entry points win over generic skill text: the worktree command, PLAN location, quality gates and ship command that `AGENTS.md` names (for example `make wt.new` and `.tmp/worktree-<safeBranch>/PLAN.md`). Guards that block a command are enforcing those rules, not malfunctioning.

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.
