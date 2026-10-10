# Superpowers Claim-Evidence Protocol

> **Source**: `oss/superpowers/skills/verification-before-completion/SKILL.md`
> **Adaptation**: Merged into `verification-loop` as a completion claim discipline rather than a standalone skill. Tailored for brief2dev's `make q.check`, 6-Phase verification pipeline, and subagent SDD reporting workflows.

## Core Principle

Completion claims—such as "completed", "passing", "fixed", or "addressed feedback"—must only be asserted when supported by fresh empirical evidence. In the absence of evidence, the state is unverified, not successful.

## Claim-Evidence Mapping

| Claim | Required Evidence | Insufficient Evidence |
|-------|-------------------|-----------------------|
| Tests are passing | Full command output and zero exit code executed in the current turn | Prior runs, truncated logs, or "should pass" assumptions |
| Bug is fixed | Passing tests or reproducible procedures that originally demonstrated the failure | The code edit itself without execution |
| Regression test is valid | Red-green evidence proving test failed before fix and passes after fix | Passing once after writing without prior failure check |
| Task is completed | Exact match across plan/spec checklist, diff review, and verification command output | Relying solely on implementer's "DONE" message |
| Review feedback addressed | File:line code inspection and targeted verification per feedback item | Performative agreement or assumed resolution after batch edits |

## Pre-Claim Gate

1. Identify the specific assertion you intend to claim.
2. Determine the exact command, diff, or checklist required to substantiate that assertion.
3. Execute fresh verification commands within the active working context.
4. Inspect the complete output trace and exit code.
5. Assert completion or success only when the evidence decisively supports the claim.
6. If evidence is incomplete, explicitly state the `unverified` status and identify remaining risks.

## Red Flags

| Red Flag | Underlying Meaning | Corrective Action |
|----------|-------------------|-------------------|
| "Should work" | Prediction lacking empirical evidence | Execute proving command |
| "Probably" | Obscuring uncertainty | Report unverified state + verification method |
| "Looks good" | Impression-based judgment | Inspect checklist and actual test outputs |
| "Just this once" | Rationalizing protocol bypass | Explicitly flag exception necessity to user |
| "Agent reported it done" | Mistaking proxy claims for evidence | Controller re-verifies diff and command outputs |

## Application in brief2dev

- `verification-loop`: Apply the claim-evidence gate prior to summarizing Phase PASS/FAIL statuses.
- `feature-implementer`: The controller must verify diffs and command outputs after a subagent reports DONE.
- `pre-quality-gate`: Never declare quality gate passage without clean `make q.check` output.
- `final-review`: Separate evidence-bearing file:line citations from subjective review verdicts.

## Operational Risk & Calibrated Discipline

Enforcing the full 6-phase verification on lightweight documentation edits introduces unnecessary overhead. This protocol operates as prompt-level discipline invoked prior to completion claims, PR merges, or reporting passing statuses to the user.
