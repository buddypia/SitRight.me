---
name: final-review
description: |
  Final review skill that systematically validates the entire implementation process in sequence and evaluates logical correctness and long-term viability.
  Enforces mandatory test execution and delivers clear, human-understandable verdicts backed by concrete evidence.
  Triggered by requests like "final check", "final review", "QA review", "code check", "review code".
---

# Final Review

`final-review` is the ultimate quality gate prior to commit/PR. It aims for **long-term viable, root-cause resolutions** rather than superficial hacks, delivering Go/No-Go verdicts based on change scope and empirical evidence.

## Not For / Boundaries

- Direct code modifications: Performs Read-Only verification only. Delegate fixes to `bug-fix` or `feature-pilot`.
- Debating business requirement validity: Validates alignment strictly against the agreed SPEC.
- Unsubstantiated speculations: Do not record findings without file/line citations, code evidence, or execution command output.

## Core Contract

- **Sequential Process Trace**: Sequentially traces requirements (SPEC) -> architecture -> implementation code -> test verification.
- **Mandatory Verification**: Code behavior changes strictly require passing test suites or equivalent contract tests. Documentation/skill contract changes may substitute dedicated regression tests.
- **Clear Review Summary**: Succinctly summarizes verdict, rationale, and remaining actions so the next engineer can act immediately.
- **Long-term Viability & ROI**: Evaluates whether root causes were solved, additional complexity is justified, and overengineering was avoided.
- **Evidence-Based**: Every finding links to file/line, execution command, exit code, test counts, or explicit unverified assumptions.

## Review Policy SSOT

Read **`REVIEW.md` at the repository root** before scoring. It defines the review passes, the severity vocabulary
(`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`), the Important/Nit threshold, the Nit volume cap, and the exclusion list of
findings already enforced by gates. The 8-Axis review below is *how* this skill inspects; `REVIEW.md` is *what
counts and how loudly*. Never emit a severity label that does not appear in `REVIEW.md` — findings must transcribe
into the follow-up debt ledger untranslated. If `REVIEW.md` is absent, state that in the verdict and proceed on the
axes alone.

## Pre-flight Checklist

| ID | Item | On Failure |
| --- | --- | --- |
| PF-000 | `REVIEW.md` read (or its absence explicitly noted in the verdict) | No-Go |
| PF-001 | Review target files and change intent identified | No-Go |
| PF-002 | Paths/commands resolved via `project-config.json` or fallback | No-Go |
| PF-003 | Test/lint/contract verification commands and obligatoriness classified | No-Go |
| PF-004 | Adaptive Depth (Quick/Standard/Deep) determined | No-Go |
| PF-005 | Test obligations recorded for doc-only, config-only, or behavior-altering changes | No-Go |

## Model Routing

| Task | Assigned Role |
| --- | --- |
| Scope, gate execution, final verdict | Lead |
| Standard 8-Axis review | Lead |
| Deep / strict review | Lead + independent reviewers when available |

## Execution Flow

1. **Scope & Intent**: Confirm modified files, SPEC/intent, test obligations, and Adaptive Depth.
2. **Automated Gate**: Run lint/test/contract checks using resolved commands.
3. **8-Axis Review**: Execute depth-appropriate axes, probing for edge cases and counterexamples.
4. **Score & Verdict**: Calculate Quality Score and Go/No-Go verdict using unified severity math.
5. **Review Summary**: Output human-readable summary of verdict, rationale, and next actions.

## Evidence Bundle Contract

| Claim | Required Evidence |
| --- | --- |
| Tests Passing | Command executed, exit code 0, pass/fail counts |
| Test Exemption Allowed | Doc-only / config-only justification with alternative regression test |
| Long-term Viability | Preexisting pattern alignment, ease of deletion, Complexity ROI |
| Logical Correctness | State transitions, edge cases, defensive logic file/line citations |
| Security Finding | Confidence >= 8/10, exploit path, remediation |

## 8-Axis Review

| Axis | Guiding Question |
| --- | --- |
| 1. Process Trace & Impact | Are requirements, design, implementation, and tests connected, with blast radius traced? |
| 2. Logic & Data Flow | Are state transitions, branches, async flow, types/schemas, and data transforms free of contradictions? |
| 3. Edge Cases & Failure Modes | Does it withstand empty data, huge payloads, concurrency, network failures, and time boundaries? |
| 4. Security & Privacy | Are auth/authz, XSS, injection, secrets, and PII leaks verified with Confidence >= 8/10? |
| 5. Performance & Resources | Are unnecessary renders, serial awaits, and memory/timer/listener leaks prevented? |
| 6. Test Sufficiency & Evidence | Are modified behaviors and failure modes covered by tests or contract verification? |
| 7. Rollback & Operations | Can it be safely rolled back post-deploy while maintaining env/cache/API compatibility? |
| 8. Long-term Viability & Complexity ROI | Is it a root-cause fix, easily maintainable/extensible/deletable, and free of overengineering? |

> Axis 1 (Process Trace & Impact) / Axis 2 (Logic & Data Flow) operational details (documented intent vs. actual implementation cross-check): `references/pm-intended-vs-implemented.md`. This table is the SSOT; references provide deep procedural guidance.

## Review Summary

Conclude the report with the following 5-line summary rather than JSON:

| Item | Content |
| --- | --- |
| Verdict | Go / Conditional Go / No-Go |
| Quality Score | 0-100 and deduction rationale |
| Evidence | Executed commands, exit codes, test counts |
| Blockers | CRITICAL/HIGH findings or None |
| Next Actions | Immediately required fixes or None |

The final output line must adhere to the sentinel contract (`references/gstack-review-report-contract.md`) to make unresolved decisions grep-friendly.

## Severity And Verdict

| Severity | Definition | Score Penalty |
| --- | --- | --- |
| CRITICAL | Missing/failing tests, data loss, security vulnerability, crash, negative ROI | -25 |
| HIGH | Functional defect, edge case bug, maintainability damage, severe performance drop | -10 |
| MEDIUM | Maintainability risk, excessive complexity, test coverage gap | -3 |
| LOW | Readability, minor styling enhancement | -1 |

`Quality Score = max(0, 100 - ((CRITICAL x 25) + (HIGH x 10) + (MEDIUM x 3) + (LOW x 1)))`.

| Verdict | Conditions |
| --- | --- |
| Go | CRITICAL=0, HIGH=0, Score >= 80, mandatory verifications passed |
| Conditional Go | CRITICAL=0, HIGH<=2, Score >= 60, only trackable non-blockers present |
| No-Go | CRITICAL>=1 OR HIGH>=3 OR Score < 60 OR mandatory verifications failed |

Under `--strict`, Conditional Go is prohibited, and Go requires CRITICAL=0, HIGH=0, Score >= 90.

## Auto-Stop

- Review target/intent cannot be identified, or path/command resolution fails.
- Behavior-altering code change lacks tests or contract verification, or tests fail.
- Temporary hacks/TODOs/FIXMEs masking symptoms are discovered.
- Information is too fragmented to present a cohesive final verdict with evidence.

## Post-flight Checklist

| ID | Item | On Failure |
| --- | --- | --- |
| POF-001 | All axes executed according to Adaptive Depth | No-Go |
| POF-002 | Mandatory commands, exit codes, pass/fail counts reported | No-Go |
| POF-003 | Quality Score computed using unified severity math | No-Go |
| POF-004 | Blocker findings ordered with file/line and evidentiary citations | No-Go |
| POF-005 | Review Summary completed | No-Go |
| POF-006 | Self-review bias, edge case, and Complexity ROI questions answered | Conditional Go or below |
| POF-007 | On No-Go / Conditional Go, routing skills and re-verification commands explicitly specified in Next Actions per blocker (`references/no-go-routing.md` format) | No-Go |

## Detailed Protocol Reference

Consult `references/final-review-protocol-details.md` on-demand for full protocols (adaptive depth, path scoping, self-review bias defenses, multi-perspective, security confidence gates).

**No-Go / Conditional Go Handling**: Follow `references/no-go-routing.md` for blocker routing matrix + Generation-Verification Loop + 3-Strike Escalation. As `final-review` is Read-Only, fixes are executed by routed skills (`bug-fix` / `feature-implementer` / `code-standards-aligner`, etc. — inline code review uses Claude `code-review --fix` built-in / Codex `codex review` / shared `pre-quality-gate`).

## Maintenance

- Sources: Core quality requirements (sequential process trace, logic/bug analysis, test mandate, long-term viability, ROI evaluation)
- Last updated: 2026-05-11
- Known limits: External systems, real exploit executions, or production traffic assumptions are not confirmed as findings without active verification evidence.
