---
name: pre-ship-quality-advisor
description: |
  Advisor skill that recommends code quality tools (`/code-review` / `code-standards-aligner` / `final-review`) based on change size immediately prior to PR creation.
  Advisory only — non-blocking. Triggered automatically or manually prior to invoking `/create-pr ship-worktree` or `ship-feature`.
  Guides portable equivalent skills (`code-standards-aligner`) in non-Claude-Code CLIs (Codex, etc.).
  Triggered by requests like "pre-PR check", "pre-ship check", "quality advisor", "pre-ship review", "quality check".
---

# `/pre-ship-quality-advisor` — Pre-Ship Quality Advisor

Measures the scale of current changes immediately prior to calling `/create-pr` and recommends the appropriate code quality toolchain.

**Core Principle**: Advisory only — not an enforcement blocker. Respects User Sovereignty (aligned with R-CM-016 Rule 10).

## Triggers

Activates at the following points:

- Immediately prior to calling `/create-pr ship-worktree` / `ship-feature`
- Natural language requests like "pre-PR check", "pre-ship check", "quality advisor"
- When commits in a worktree are complete and the user expresses intent to push or create a PR

After `worktree-shipping-guard` (R-CM-030 Stop hook) blocks execution, running this advisor once prior to filling out the R-CM-030 Pre-Ship Human Review Panel is strongly recommended.

## Not For / Boundaries

| Scenario | Handling |
|---|---|
| Automatic Tool Execution | ❌ — This advisor only makes recommendations; actual execution is handled by the user or subsequent skills |
| Direct Code Modification | ❌ — Read-only advisor. Fixes are executed by `/code-review --fix` (Claude Code) or `code-standards-aligner` (portable) |
| Hard Gate Enforcement | ❌ — Passes immediately if the user chooses to "skip" |
| Test Execution | ❌ — Handled by `final-review` or `pre-quality-gate` |
| Automated Tool Invocations in Non-Claude-Code CLIs | ❌ — Falls back to portable equivalent skill instructions (`code-standards-aligner`) |

## Decision Logic (Size-Based Hybrid)

Measures change volume and outputs tier-based recommendations. **Claude Code Recommendations** optimize for Anthropic environments; **Portable Equivalents** operate across any CLI.

| Tier | Change Size | Claude Code Recommendation | Portable Equivalent (All CLIs) | Intensity |
|---|---|---|---|---|
| **T-S (Small)** | ≤3 files AND ≤100 LOC | `/code-review --fix` | `code-standards-aligner` (autonomous standards alignment) | Passive (Output only) |
| **T-M (Medium)** | 4–10 files OR 100–500 LOC | `/code-review --fix` → `final-review` | `code-standards-aligner` → `final-review` | Active (AskUserQuestion confirm) |
| **T-L (Large)** | >10 files OR >500 LOC | `/code-review high --fix` → `final-review` | `code-standards-aligner` → `final-review` | Active (AskUserQuestion confirm) |
| **All Tiers** | (Common) | `final-review` as pre-PR GO/NO-GO gate | (Identical) | Passive notice |
| **Enhanced Verdict (Optional)** | Substantial changes | `/code-review high` (broad correctness review-only) | (Claude Code only) | Passive additional recommendation |

**Trivial Exception (R-CM-030 aligned)**: This advisor can be skipped if all conditions are met: changed files ≤3 + LOC ≤50 + zero executable code impact (pure documentation, comments, or whitespace changes). When in doubt, running the advisor is the default.

## Phase 1: Detect Change Size

```bash
# Measure change size in worktree or staged changes
git diff --stat HEAD                  # uncommitted changes
git diff --stat origin/main..HEAD     # unmerged commits
```

Extracted parameters:
- `files_changed`: Number of modified files
- `loc_changed`: Sum of insertions + deletions
- `code_only`: Presence of executable code changes (.mjs, .ts, .tsx, .py, scripts, tests)

## Phase 2: Tool Recommendation

Outputs recommendations in the following format (Claude Code environment):

```
## Pre-Ship Quality Advisor

**Change Metrics**: <files_changed> files, <loc_changed> LOC, code_only=<true|false>
**Tier**: <T-S | T-M | T-L>

### Recommended Order

1. **`/code-review --fix`** — Claude Code built-in simplification + correctness integration (default effort medium).
   - T-L: `/code-review high --fix` (broader coverage).
   - Invocable via: `/code-review --fix` or `/code-review high --fix`
2. **`final-review`** — Read-only quality gate + test execution + GO/NO-GO JSON verdict
   - Invocable via: `/final-review`
3. (Optional) **`/code-review high`** — Additional correctness verdict without direct edits (review-only)
   - Invocable via: `/code-review high`, `/code-review medium`, with `--comment` for PR inline annotations

### Next Steps

→ Execute tools and proceed with `/create-pr ship-worktree`
→ Or skip recommendations and proceed directly
```

**Active Confirmation for T-M / T-L**: Uses `AskUserQuestion` to present a 3-way choice: "Run Advisor / Skip / View Manual Checklist Only".

## Phase 3: Portable Skill Routing (Non-Claude-Code CLIs)

In non-Claude-Code environments (Codex, OpenAI CLI, etc.), the built-in `/code-review` tool is unavailable. The advisor routes to portable equivalents:

| Claude Code Specific Tool | Portable Equivalent Skill | Invocation Guidance |
|---|---|---|
| `/code-review --fix` (Unified simplification + correctness) | **`code-standards-aligner`** (Project standards alignment) | `/code-standards-aligner` or `<CLI> "@.claude/skills/code-standards-aligner/SKILL.md read and execute"` |
| `/code-review high` (Review-only correctness verdict) | (Use platform's native reviewer or `pre-quality-gate` Makefile q.check) | (Claude Code exclusive) |
| `final-review` | `final-review` | `/final-review` |

Portable skills follow standard markdown `SKILL.md` conventions and execute cleanly across any CLI runtime.

## CLI Environment Detection

```bash
# Detect Claude Code (CLAUDECODE environment variable)
[ -n "$CLAUDECODE" ] && echo "claude-code" || echo "other-cli"
```

## Pre-flight Checklist

| ID | Item | Required | Owner |
|---|---|:---:|---|
| PF-001 | Change size measured (`git diff --stat`) | ✅ | advisor |
| PF-002 | `code_only` status determined | ✅ | advisor |
| PF-003 | CLI environment detected (`CLAUDECODE` env var) | ✅ | advisor |
| PF-004 | Tier determined (T-S / T-M / T-L) | ✅ | advisor |

## Post-flight Checklist

| ID | Item | Required |
|---|---|:---:|
| POF-001 | Recommendation output presented (Tier + Tool priority + commands) | ✅ |
| POF-002 | AskUserQuestion confirmation obtained for T-M / T-L | ✅ |
| POF-003 | Portable skill routing guided for non-Claude-Code CLIs | ✅ |
| POF-004 | User decision recorded explicitly (executed vs skipped) | ✅ |

## Maintenance

- **Boundary (R-CM-028)**: Boundary-uniform — applies identically across Perspective 1 (brief2dev internal governance/rules/skills) and Perspective 2 (scaffolded features/fixes).
- **Sources**:
  - `/code-review --fix` is the single fix entry point for this advisor (Claude Code `/simplify` is not used).
  - `final-review`: `.claude/skills/final-review/SKILL.md`
  - Rules: R-CM-018, R-CM-019, R-CM-028, R-CM-030, R-CM-009, R-CM-016 Rule 10
- **Last updated**: 2026-05-27
- **Known limits**:
  - `/code-review` is exclusive to Claude Code; other CLIs use portable skills (`code-standards-aligner`) and verdict fallbacks (`pre-quality-gate`).
  - Advisor does not run tools directly; execution responsibility remains with the user or subsequent skill calls.
  - Tier thresholds (3 files / 100 LOC / 500 LOC) are heuristics.
