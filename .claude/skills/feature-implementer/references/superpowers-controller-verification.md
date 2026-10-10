# Superpowers Controller Verification For SDD

> Source: `oss/superpowers/skills/subagent-driven-development/SKILL.md`, `oss/superpowers/skills/verification-before-completion/SKILL.md`
> Adaptation: Integrates controller-side verification into brief2dev `feature-implementer` SDD mode. Subagent execution engines are not newly deployed.

## Core Principle

A subagent's `DONE` report is a claim to be verified, not proof. The Controller directly inspects change scope, spec compliance, quality review, and command output before proceeding to the next task.

## Required Controller Checks

| Step | Check |
| --- | --- |
| 1. Report parse | Verify status is one of `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, `NEEDS_CONTEXT` |
| 2. Diff check | Confirm reported changed files match actual `git diff --name-only` |
| 3. Spec review | Cross-check task requirements from SPEC/PLAN against implementation diff |
| 4. Quality review | Confirm code quality reviewer approved with zero Critical/Important issues |
| 5. Fresh verification | Controller re-verifies subagent's executed commands within necessary scope |
| 6. Handoff update | Update PLAN or CONTEXT state to latest |

## Status Handling

| Status | Controller action |
| --- | --- |
| `DONE` | Proceed to review phase after verifying diff and verification |
| `DONE_WITH_CONCERNS` | Resolve concerns prior to review if related to correctness/scope |
| `NEEDS_CONTEXT` | Provide missing context and re-dispatch same task |
| `BLOCKED` | Classify as missing context, model limit, oversized task, or plan error, then escalate to user or caller skill |

## Anti-Patterns

| Anti-Pattern | Problem |
| --- | --- |
| Proceeding to next task on DONE report alone | Misses omitted requirements and hidden failures. |
| Merging spec review and quality review haphazardly | Conflates "requirements met" with "code quality", muddying triage. |
| Blindly trusting test passes in subagent output | Execution environment, branch, or command scope may differ. |
| Assigning the same file to parallel workers | Increases risk of merge conflicts and silent overwrites. |

## brief2dev Usage

Read this reference in `feature-implementer` SDD mode each time a task implementation completes. When operating parallel workers, isolate write sets per worker, and ensure the controller aggregates final diffs and verification evidence before claiming completion.
