# HITL Loop Guide (Structured Reproduction for Human-in-the-Loop Bugs)

> **Source**: `oss/mattpocock-skills/skills/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh`
> **Related**: `.claude/skills/bug-fix/references/hitl-loop.template.sh` (Script template),
> `.claude/skills/systematic-debugging/references/feedback-loop-catalog.md` Technique #10

## When to Use

This is a last-resort mechanism used only when all 9 automatable techniques in `systematic-debugging` Phase 0 (Securing a Feedback Loop) — failing test / curl / CLI diff / headless browser / trace replay / throwaway harness / fuzz / bisection / differential — are **completely inapplicable**. Typical scenarios include: UI click sequences unreproducible even in headless browsers, hardware device interactions, or subjective human evaluations (e.g., "Does the screen flicker?") as reproduction criteria.

**Always verify that automation was attempted first.** HITL scripts are justified only after documenting automation failures — this path is the only exception that temporarily relaxes the "agent-runnable" requirement of Phase 0.

## How to Use

1. Copy `hitl-loop.template.sh` per bug — use a project-local path under `.tmp/` (e.g. `.tmp/hitl-export-bug.sh`) or a path generated via `mktemp`. Never use predictable static names in world-writable `/tmp` due to symlink race risks.
2. Use `step "<directive>"` to sequentially describe actions the user must take. The script blocks until the user presses Enter.
3. Use `capture VAR "<question>"` to record observations (error occurrence, error message, screen state, etc.) into variables.
4. When the agent executes `bash .tmp/hitl-<name>.sh`, the user responds interactively in their terminal.
5. Upon script completion, captured values are emitted to stdout in `KEY=VALUE` format — the agent parses these to make subsequent decisions (re-ranking hypotheses, confirming reproduction).

## Why Structure Matters

Unlike asking users open-ended questions like "Please try reproducing and tell me what happens", `step`/`capture` helpers:
(a) Pair questions and answers 1:1 in machine-parsable formats, and
(b) Freeze the reproduction sequence into a reusable script — eliminating the need to re-explain steps if the bug must be retested.
This satisfies the "agent-runnable" intent of Phase 1 as closely as possible: while a human is in the loop, the interaction points are strictly structured, making the loop repeatable.

## Precautions for brief2dev

- Preserve `set -euo pipefail` — do not silently swallow capture failures.
- Do not modify the `step`/`capture` helper functions. Customize only in the designated user section.
- Treat captured responses as authoritative evidence for `systematic-debugging` Phase 2 (Reproduction & Minimization) and Phase 3 (Hypothesis Testing) — never rely on unstructured verbal handover.
- During Phase 6 (Cleanup), delete temporary copies (`.tmp/hitl-*.sh`).
