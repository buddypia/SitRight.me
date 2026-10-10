# Test Failure Ownership Triage Template

> **Used by**: `verification-loop` Phase 4 (Test)

## Purpose

When test failures occur, avoid treating all failures uniformly. Categorize failures into **in-branch** (caused by current work) and **pre-existing** (legacy failures) to execute appropriate remedial actions.

**Core Principle**: Block execution only on in-branch failures. Log pre-existing failures as non-blocking warnings and continue.

---

## Step 1: Classification

For each failing test:

### 1-1. Inspect Changed Files

```
Extract failure list from project-config.json → commands.test output
Inspect git diff --name-only (files modified in the active session)
```

### 1-2. Classification Criteria

| Classification | Condition | Action |
|---|---|---|
| **in-branch** | The failing test file was edited in this session, OR code referenced by the test was modified in this session, OR the failure trace originates directly from current branch diffs | **BLOCK** — Remediation mandatory |
| **pre-existing** | Neither the test file nor the target implementation was touched in this session, AND the failure is verifiably unrelated to current changes | **WARN** — Log warning and proceed |

### 1-3. Ambiguity Default

**When classification is ambiguous, default to in-branch.** Pausing the engineer to verify is vastly safer than permitting regressions to pass. Classifying an issue as pre-existing requires definitive evidence.

---

## Step 2: Handling In-Branch Failures

If any in-branch failures exist, **halt immediately**.

```
VERIFICATION BLOCKED
========================
In-branch test failures detected ({N} cases):

  [FAIL] {test-file}:{line} — {Summary of error trace}
    Root Cause: Modifications in {changed-file} broke this assertion

Remediate failures and re-run verification-loop.
```

---

## Step 3: Handling Pre-Existing Failures

If only pre-existing failures remain, **proceed with warnings**.

```
PRE-EXISTING TEST FAILURES (non-blocking)
==========================================
Detected {N} legacy test failures (unrelated to current changes):

  [PRE-EXISTING] {test-file}:{line} — {Summary of error trace}
    Evidence: Test file and target module were not modified in this session

Action: Logged warning; proceeding to next Phase.
Recommendation: Resolve legacy failures in a dedicated cleanup session.
```

---

## Step 4: Triage Summary Report

Output a structured summary table after classifying all failures:

```
TEST TRIAGE SUMMARY
═══════════════════
  Total failures:     {N}
  In-branch:          {M} → BLOCKING (Remediation required)
  Pre-existing:       {K} → WARNING (Logged; non-blocking)

  Decision: {BLOCKED | PASS_WITH_WARNINGS}
```

---

## Decision Chain

```
Test Failures Detected
  │
  ├─ Was target code modified in this session?
  │   ├─ YES → in-branch → BLOCK
  │   └─ NO
  │       ├─ Was test file itself modified in this session?
  │       │   ├─ YES → in-branch → BLOCK
  │       │   └─ NO
  │       │       ├─ Can root cause be traced to diff?
  │       │       │   ├─ YES → in-branch → BLOCK
  │       │       │   └─ NO → pre-existing → WARN
  │       │       └─ Ambiguous? → in-branch (conservative default) → BLOCK
  │
  ├─ 0 in-branch failures? → PASS_WITH_WARNINGS (Record pre-existing only)
  └─ 1+ in-branch failures? → BLOCKED (Remediate and rerun)
```

---

## Integration Rules

- **R-CM-010 (Verification Before Completion)**: A `PASS_WITH_WARNINGS` triage decision constitutes acceptable verification evidence. The full triage log including pre-existing warnings serves as the evidentiary artifact.
- **R-CM-017 #3 (3-Strike Escalation)**: If remediation of in-branch failures fails 3 consecutive times, escalate immediately.
- **`feature-pilot` DoD**: If in-branch failures equal 0, DoD verification passes even if pre-existing failures are present.
