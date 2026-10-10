---
name: systematic-debugging
description: |
  Mandatory sub-skill invoked prior to attempting fixes for any bug, test failure, or unexpected behavior.
  Requires root-cause investigation before any code modification.
  Serves as the REQUIRED SUB-SKILL for the bug-fix skill, providing systematic debugging methodologies.

  Triggered by requests such as "debugging", "root cause analysis", "why is this failing", "root cause", "systematic debug", etc.
---

# Systematic Debugging

Establish a reproducible failing signal and a confirmed root cause before editing; after 3 failed fixes, stop and discuss the architecture with the user. Random modifications waste time and introduce new regressions, and quick patches mask the defect underneath.

Applies to test failures, production bugs, unexpected runtime behavior, performance bottlenecks, build failures and integration breakdowns — including the ones that look like a one-line fix.

---

## 4-Phase Process

Every Phase must be completed **strictly in sequence** prior to advancing.

### Phase 0: Feedback Loop First

Establish a rapid, deterministic pass/fail feedback loop before modifying code. Without an automated loop, root-cause investigation and validation blur together.

Select the highest feasible option from this hierarchy:

1. Failing automated test (unit / integration / e2e).
2. Minimal reproduction script or isolated CLI command.
3. Repetitive command with targeted instrumentation observing a single variable.
4. Browser / REPL manual reproduction with rigorous observation logs.

Success Criteria: The loop must be fast, reproducible, and isolate a single failure seam. If a loop cannot be constructed, log the issue as "unreproducible" and gather additional diagnostic telemetry in Phase 1.

For the 10-technique catalog and non-deterministic reproduction strategies, consult `references/feedback-loop-catalog.md`.

### Phase 1: Root Cause Investigation

**Before attempting any code edits:**

**1. Read Error Messages Carefully**
- Never gloss over error traces or warnings.
- Read the entire stack trace from top to bottom.
- Record exact line numbers, file paths, and error codes.

**2. Reproduce Consistently**
- Can the failure be triggered reliably?
- What are the exact reproduction steps?
- Does it occur on 100% of runs?
- If unreproducible → collect additional diagnostic telemetry rather than guessing.

**3. Check Recent Changes**
- What recent change could have triggered this behavior?
- Inspect git diffs and recent commits.
- Check for dependency updates, configuration changes, or environment drifts.

**3-1. "Pre-existing" Claims Require Proof**
Before attributing a failure to "pre-existing legacy issues," gather concrete evidence:
- Trace introducing commit via `git log -S '<pattern>' -- <file>`.
- Inspect per-line introduction points via `git blame <file>`.
- Re-run identical commands on the base/main branch to link evidence into `verification-loop.claim_evidence[]`.
- Unsubstantiated "pre-existing" claims violate verification integrity rules.

**4. Gather Evidence in Multi-Component Systems**
When tracing through multi-tier architectures (API → Service → DB):

```
At each component boundary:
  - Log data entering the component
  - Log data exiting the component
  - Verify environment and config propagation
  - Inspect internal state at each layer

Run once to collect empirical proof of WHERE the failure originates
→ Analyze evidence to isolate the failing component
→ Investigate that specific component deeply
```

**5. Trace Data Flow**
When an error manifests deep in the call stack:
- Where did the corrupted/invalid value originate?
- What invoked the downstream caller with this invalid parameter?
- Backtrace continuously until the ultimate source trigger is uncovered.

Detail: `references/root-cause-tracing.md`

### Phase 2: Pattern Analysis

**Find architectural patterns before modifying code:**

1. **Find Working Examples**: Identify analogous, functioning implementations elsewhere in the codebase.
2. **Compare Against References**: Read reference implementations completely without skimming.
3. **Identify Differences**: Catalog every discrepancy between the working implementation and the broken path.
4. **Understand Dependencies**: Map environmental prerequisites, runtime configs, and hidden assumptions.

### Phase 3: Hypothesis and Testing

**The Scientific Method:**

1. **Formulate 3–5 Falsifiable Hypotheses**: Frame each as: "X is the root cause because Y; this will be disproven if Z is observed."
2. **Rank by Probability**: Prioritize hypotheses based on recent diffs, frequency data, and call graph traces.
3. **Test with Minimal Invasiveness**: Test one variable at a time with the smallest possible instrumentation.
4. **Verify Before Proceeding**: If proven → advance to Phase 4. If disproven → move to the next hypothesis. Never stack speculative edits.
5. **Acknowledge Gaps**: Explicitly state "I do not understand X" rather than guessing.

### Phase 4: Implementation

**Fix the root cause, never the superficial symptom:**

1. **Write a Failing Test Case** — TDD is mandatory.
2. **Implement a Single Targeted Fix** — One isolated modification; avoid opportunistic refactoring.
3. **Verify the Fix** — Verify test passes, legacy tests remain green, and the original symptom is resolved.

3-1. **Correct Regression Seam**: Regression tests must assert across the public boundary or execution path where the real bug manifested. Testing internal private helpers while leaving the true user-facing failure unexercised does not constitute valid regression defense.

4. **If the Fix Does Not Work**:
   - **STOP immediately**.
   - Count the number of attempted fixes.
   - If < 3: Revert to Phase 1 and re-analyze with newly gathered data.
   - **If ≥ 3: STOP and challenge the underlying architecture** (see below).
   - Never retry identical patterns across repeated turns.

5. **If 3+ Fixes Fail: Question the Architecture**

   **Patterns Signaling Architectural Flaws:**
   - Each fix reveals new shared state, unexpected coupling, or cascading issues elsewhere.
   - The fix demands widespread, unconstrained refactoring across unrelated modules.
   - Each fix introduces new symptoms in neighboring modules.

   **Fundamental Inquiries:**
   - Is this architectural pattern fundamentally sound?
   - Are we clinging to an untenable pattern out of momentum?
   - Should we continue patching symptoms, or refactor the core architecture?

   **Discuss fundamental architectural trade-offs with the user before attempting further fixes.**

---

## Quick Reference

| Phase | Core Activity | Success Criteria |
|-------|---------------|------------------|
| **0. Feedback Loop** | Construct automated test / repro command / instrumentation | Fast, deterministic pass/fail signal |
| **1. Root Cause** | Read traces, reproduce, review diffs, collect telemetry | Understand WHAT and WHY |
| **2. Pattern** | Identify working examples, compare against references | Isolate exact discrepancies |
| **3. Hypothesis** | Formulate 3–5 falsifiable hypotheses, test minimally | Confirm root cause or advance hypothesis |
| **4. Implementation** | Author failing test, apply single fix, verify | Issue resolved, full suite green |

---

## Supporting Methodologies

Reference documents in this directory:

- **`references/root-cause-tracing.md`** — Backtracing call stacks to identify initial triggers.
- **`references/defense-in-depth.md`** — Implementing multi-layer validation post root-cause remediation.
- **`references/feedback-loop-catalog.md`** — 10-technique feedback loop catalog and loop-tightening discipline.

**Related Skills:**
- **bug-fix** — Orchestrator invoking this skill as a REQUIRED SUB-SKILL to manage full bug remediation lifecycles.
- **verification-loop** — 6-Phase comprehensive verification pipeline executed post-fix.

---

## Integration

**Call Relationships:**

| Context | Role |
|--------|------|
| **bug-fix** | Executes Phases 1–4 as a REQUIRED SUB-SKILL |
| **feature-implementer** | References Phases 1–3 upon encountering unexpected behaviors during implementation |
| Direct Invocation | Usable across any technical debugging context |

**Enforcement:**
- **Rule Enforcement**: R-CM-010 (verification-before-completion) — Loaded automatically across sessions.
- **Stop Hook**: Prompts verify root-cause investigation prior to concluding sessions.
- **Skill Enforcement**: `bug-fix` references this skill as a REQUIRED SUB-SKILL, mandating the 4-Phase process.

## Not For / Boundaries

Do not use this skill for:
- **New Feature Architecture / Design Decisions**: Use `feature-architect` / `architecture-selector`.
- **Infrastructure Outages / Deployment Failures**: Use `infra-designer` or `deploy` (SRE domains).
- **Code Review / Static Analysis**: Use `final-review` or the `code-reviewer` agent.

If essential diagnostic inputs (error traces, reproduction steps, environment context) are missing, ask 1–3 targeted clarifying questions before proceeding.

## Maintenance

- **Sources**: brief2dev internal rules (`.claude/rules/` R-CM/R-PL) + skill conventions.
- **Last updated**: 2026-04-11
- **Known limits**: Explicit boundaries are defined in the frontmatter description (`|...`) and body text.
