---
name: code-standards-aligner
model: sonnet
effort: low
description: |
  Portable skill that autonomously refactors recently modified code to align with project-specific coding standards (CLAUDE.md / lint config / .editorconfig / neighboring code patterns).
  Operates equivalently to Anthropic's official `code-simplifier` subagent from claude-plugins-official — formatted as a markdown SKILL.md so it is portable across Claude Code, Codex, and other CLI environments.
  **Strictly preserves functionality** (zero behavioral alterations). Improves only clarity, consistency, and maintainability.
  Triggered by requests such as "align standards", "autonomous refactoring", "code standards", "auto refactor", "cleanup code style", etc.
---

## `/code-standards-aligner` — Project Standards Alignment Refactor

Autonomously refactors recently modified code to align with project-specific coding standards. CLI-agnostic (equivalent to Anthropic's `code-simplifier` subagent).

**Iron Law**: **Never alter functionality.** All inputs, outputs, side effects, and public APIs must remain strictly identical.

## Triggers

- Following large-scale modifications requiring autonomous refactoring (T-L tier — 10+ files or 500+ LOC).
- When the pre-ship quality advisor (`pre-ship-quality-advisor`) recommends standards alignment prior to invoking `create-pr`.
- User natural language requests such as "align standards", "clean up style", "auto refactor", etc.
- Aligning code written by new contributors or AI models with established project conventions.

## Not For / Boundaries

| Scenario | Handling Protocol |
|----------|-------------------|
| Functional changes / Behavioral modifications | ❌ Iron Law violation — Halt immediately |
| Untouched legacy code | ❌ — This skill operates strictly on "recently modified code" |
| Minor inline cleanups (≤ 3 files) | ⚠️ Preference, not a bar — inline review tools are lighter *where they exist* (Claude `/code-review --fix` / Codex `codex review`). When they do not, run this skill: it is the only `skill_review_pass` path this repo ships (`quality-gate-labels.mjs#REPO_REVIEW_ASSETS`), and `pre-quality-gate` is a static gate that does not earn that label. Small change size alone is not a reason to skip this skill. |
| Test suite execution / Build runs | ❌ — Handled by `final-review` |
| Introducing new abstractions | ❌ — This skill only aligns existing patterns, does not architect new systems |

## Phase 1: Standards Detection (Autonomous Extraction)

Automatically extracts project-specific coding standards using this priority hierarchy:

| Priority | Source | Extracted Standards |
|:--------:|--------|---------------------|
| 1 | `CLAUDE.md` (Project root) | Explicitly declared coding conventions (e.g., "prefer function keyword", "explicit return types") |
| 2 | Lint configs (`.eslintrc*`, `.ruff.toml`, `clippy.toml`, etc.) | Automatically enforced rule sets |
| 3 | Formatting configs (`.editorconfig`, `.prettierrc`, `pyproject.toml#tool.black`) | Indentation, quote style, line widths |
| 4 | Neighboring Code Patterns | Existing patterns within the same module or directory |
| 5 | Idiomatic Language / Framework Best Practices | General best practices (used only when explicit configs are absent) |

**Handling Undetected Standards**: When project-specific standards are absent, never impose arbitrary external standards. Report to the user: "Project standards not found. Following neighboring code patterns only." (R-CM-029 Rule 6 compliance).

## Phase 2: Recently Modified Code Identification

```bash
git diff --name-only HEAD                    # Uncommitted working changes
git diff --name-only origin/main..HEAD       # Unmerged branch commits
```

Or files explicitly designated by the user / edited within the active session.

## Phase 3: Refinement (5 Dimensions)

Audit and align each modified file across these 5 dimensions:

### 3.1 Function Preservation — Mandatory Precondition

- ❌ Changing inputs / changing outputs / modifying side effects / altering public API signatures → Halt immediately.
- ✅ Internal restructuring / renaming local variables / reordering statements / improving comments → Permitted.

### 3.2 Applying Project Standards (CLAUDE.md / Lint Configs)

Apply standards extracted in Phase 1:
- Import sorting / preferred keywords (`function` vs. arrow syntax) / explicit return type annotations.
- Identifier naming conventions (`camelCase` / `snake_case` / `PascalCase`).
- Error handling patterns (Result types vs. throwing exceptions / avoidance of empty catch blocks).

### 3.3 Clarity & Readability

- Reduce unnecessary nesting and cognitive complexity.
- Remove redundant abstractions and dead intermediate variables.
- Ensure clear, self-explanatory variable and function names.
- Consolidate tightly coupled logic.
- Delete comments that merely restate WHAT the code does (well-named identifiers explain themselves).
- ❌ Avoid nested ternaries — prefer clean `switch` or `if-else` chains for multi-condition branching.
- ✅ Clarity over cleverness (explicit code is superior to dense one-liners).

### 3.4 Avoiding Over-Simplification

- ❌ Simplifications that compromise readability or maintainability.
- ❌ "Clever" or obscure one-liners that complicate debugging.
- ❌ Bundling too many responsibilities into a single function or component.
- ❌ Eliminating helpful domain abstractions.
- ❌ Sacrificing clarity purely to reduce line count (e.g., nested ternaries).
- ❌ Alterations that impede future extensibility or testability.

### 3.5 Surgical Scope Focus

- ✅ Align only code modified within the active session.
- ❌ Refactoring unrelated legacy dead code (R-CM-029 Rule 4 — Surgical focus).
- Expand scope only when explicitly requested by the user.

## Phase 4: Verification

Verify functional preservation post-refactor:

1. **Diff Review** — Re-read every modified line to verify zero behavioral divergence.
2. **Lint & Format Check** — Execute `project-config.json#commands.lint` / `commands.format_check` (skip if null).
3. **Test Execution (Recommended)** — Execute `project-config.json#commands.test` as the strongest proof of behavior preservation.
4. **Manual Audit** — If ambiguous, present a summarized diff to the user for explicit confirmation.

## Invocation Examples across CLIs

### Claude Code

```
User: /code-standards-aligner
AI: Phase 1 (Automatically reads CLAUDE.md / lint configs)
    → Phase 2 (Identifies modified files via git diff)
    → Phase 3 (Applies 5-dimension alignment edits)
    → Phase 4 (Validates via lint / format / test runs)
```

### Codex / Other CLIs

```
User provides Phase 1-3 prompt directly (or runs CLI autonomous mode)
→ User explicitly invokes Phase 4 verification commands
```

## Pre-flight Checklist

| ID | Item | Required | Owner |
|----|------|:--------:|-------|
| PF-001 | Discovered project standards source (CLAUDE.md / lint config / neighboring code) | ✅ | aligner |
| PF-002 | Identified modified files (via git diff or explicit user specification) | ✅ | aligner |
| PF-003 | Reported to user if standards are absent (arbitrary standards prohibited) | ✅ | aligner |

## Post-flight Checklist

| ID | Item | Required |
|----|------|:--------:|
| POF-001 | Functional preservation — Inputs, outputs, side effects, and public APIs identical | ✅ |
| POF-002 | Lint / format checks passing (per `project-config.json#commands`, skip if null) | ✅ |
| POF-003 | Documented applied standards (source and specific rules applied) | ✅ |
| POF-004 | Outputted modification summary (changes per dimension; user confirmation if ambiguous) | ✅ |

## Maintenance

- **Boundary (R-CM-028)**: Boundary-uniform — applies identically across Perspective 1 (brief2dev internal governance/skills/hooks) and Perspective 2 (target scaffold features/bug-fixes). No branching mechanism required.
- **Sources**:
  - Anthropic official `code-simplifier` subagent definition (`claude-plugins-official`).
  - Extracted from: `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/code-simplifier/agents/code-simplifier.md`.
  - Rules: R-CM-018 (Skill Authoring), R-CM-028 (Boundary), R-CM-019 (Doc Hygiene), R-CM-009 (Command Portability), R-CM-029 Rule 4 (Surgical Scope).
- **Related Skills**:
  - `pre-ship-quality-advisor` — Recommends this skill for T-L tier changes.
  - Inline Code Review Tools (Claude `code-review --fix` / Codex `codex review` / shared `pre-quality-gate`) — Handles smaller changes (T-S/T-M). This skill serves as a portable simplification fallback across different CLI environments.
  - `final-review` — Pre-PR GO/NO-GO gate (always recommended after running this skill).
- **Last updated**: 2026-05-10
- **Known limits**:
  - Operates strictly on recently modified code; broader scope requires explicit user designation.
  - Zero functional alterations — halts immediately upon Iron Law violation.
  - When project standards are absent, refrains from imposing arbitrary external rules.
  - Proactive autonomous activation from the original Anthropic plugin is omitted; requires explicit invocation.
