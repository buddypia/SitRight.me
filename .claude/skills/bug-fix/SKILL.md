---
name: bug-fix
description: |
  Bug-fix dedicated skill for the target project.
  Analyzes bug reports, isolates root causes, implements fixes, and adds regression tests.
  Invoked by feature-pilot for BUG_FIX task types, or used standalone.

  Triggered by requests like "bug fix", "error occurred", "doesn't work", "not working", "crash", "fix bug".
---

# Bug Fix

> **Core Concept**: "Reproduce → Root Cause → Fix → Prevent Regression"

This skill takes bug reports, systematically analyzes them, isolates the root cause, implements fixes with minimal blast radius, and adds regression tests to prevent recurrence.

**REQUIRED SUB-SKILL**: `systematic-debugging` — Follow the 4-Phase root-cause process for all debugging. Never attempt a fix without root-cause investigation (Phase 1). Details: `.claude/skills/systematic-debugging/SKILL.md`

## Target Project Tech Stack Resolution

> **Platform Agnostic**: This skill dynamically resolves project structure from `project-config.json`.

### PATH CONTRACT (MANDATORY)

Resolve paths from `project-config.json` before file operations, rather than hardcoding `src/features/`, because generated projects use different layouts.

| Placeholder | Resolution Source | Default |
|-------------|-------------------|---------|
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{TESTS_DIR}` | `project-config.paths.tests_unit` | `tests/unit` |
| `{COMPONENT_EXT}` | `project-config.conventions.component_extension` | `.tsx` |

**Resolution**: `Read project-config.json → Resolve placeholders → Use resolved values`
**Fallback**: If project-config.json does not exist, use Default column


| Item | Resolution Method | Default (if project-config absent) |
| --- | --- | --- |
| **Architecture** | Feature-First (`project-config.paths.features`) | `src/features/` |
| **Testing** | `project-config.quality.test_framework` | Vitest |
| **Component Extension** | `project-config.conventions.component_extension` | `.tsx` |

---

## Role Division

| Scenario | Responsible Skill |
| --- | --- |
| New Feature Development | `feature-architect` → `feature-spec-generator` → `feature-implementer` |
| Modify Existing Feature | `feature-spec-updater` → `feature-implementer` |
| **Bug Fix** | **bug-fix** (This skill) |

---

## Input

| Required | Item | Example |
| :---: | --- | --- |
| Mandatory | Bug symptom description | "Streaming halts halfway" |
| Optional | Reproduction steps | "Enter code → Execute analysis → Open explanation panel" |
| Optional | Error logs | Console output, stack traces |
| Optional | Related file / screen | "DataPanel.tsx" |

---

## Protocol

### Phase 1: Bug Analysis

> **Goal**: Clarify exact symptom, conditions, and blast radius of the bug

**Step 1.1: Clarify Symptoms**

```markdown
## Bug Symptom Summary

| Item | Description |
| --- | --- |
| **Symptom** | [Problem reported by user] |
| **Expected Behavior** | [How it should operate normally] |
| **Actual Behavior** | [What currently occurs] |
| **Severity** | Critical / High / Medium / Low |
```

**Step 1.2: Locate Relevant Code**

```bash
# Search relevant files by keyword
Grep "<keyword>" src/ --type ts --type tsx

# Check feature-specific files in Feature-First structure
Glob {FEATURES_DIR}/<feature>/components/
Glob {FEATURES_DIR}/<feature>/hooks/
```

**Step 1.3: Confirm Reproduction Conditions**

| Question | Answer |
| --- | --- |
| Always reproducible? | Y/N |
| Occurs only under specific conditions? | [Conditions] |
| Occurs only with specific data? | [Data characteristics] |
| Related to recent changes? | [Commit or change history] |

---

### Phase 2: Root Cause Analysis

> **Goal**: Pinpoint "why" the bug occurs

**Step 2.1: Trace Code Flow**

Trace execution flow based on Feature-First + Simplified Clean Architecture:

```
[UI Event] → [Custom Hook] → [API Call] → [Response]
     ↓            ↓              ↓            ↓
  Trigger    State Change   Execute fetch  Process data
```

**Step 2.2: Formulate and Validate Hypotheses**

```markdown
### Hypothesis List

| # | Hypothesis | Validation Method | Result |
| --- | --- | --- | --- |
| 1 | [Hypothesis 1] | [Validation Method] | OK / NG |
| 2 | [Hypothesis 2] | [Validation Method] | OK / NG |
| 3 | [Hypothesis 3] | [Validation Method] | OK / NG |
```

**Step 2.3: Finalize Root Cause**

```markdown
## Root Cause

**Location**: `{FEATURES_DIR}/<feature>/hooks/<file>.ts:123`

**Cause**: [Detailed explanation of the root cause]

**Blast Radius**: [Impact on other features]
```

---

### Phase 3: Fix Implementation

> **Goal**: Resolve bug with minimal surgical changes

**Step 3.1: Determine Fix Strategy**

| Strategy | Pros | Cons | Selected |
| --- | --- | --- | :---: |
| Strategy A | [Pros] | [Cons] | - |
| Strategy B | [Pros] | [Cons] | - |

**Selection Criteria**:

- Minimal blast radius
- Adherence to existing patterns
- Minimal side effects

**Step 3.2: Author Regression Test First (TDD)**

Write a failing test case that reproduces the bug before applying code fixes:

```typescript
// tests/unit/features/<feature>/<file>.test.ts

describe('BUG: [Bug Title]', () => {
  it('should [expected behavior] when [condition]', async () => {
    // Arrange - Set up bug condition
    // Act - Trigger bug
    // Assert - Verify expected behavior (fails at this stage)
  });
});
```

```bash
# Verify test failure (Red) - Must fail before proceeding
# Execute project-config.json#commands.test (dynamic detection if null — R-CM-009)
$TEST_CMD -- tests/unit/features/<feature>/<file>.test.ts
```

**Step 3.3: Verify Failure (Red) → Commit → Lock**

- If test **passes** → Test is inaccurate → Refine test and re-run
- If test **fails** → commit the test on its own (tests only, no code in that commit). Where
  `.claude/scripts/regression-test-lock.mjs` exists and you work in a `.worktrees/<branch>` worktree, that red commit
  locks every test file it *added*: from then on committing any change to it (`sed`, `rm`, `git mv` included) is
  denied where `commit-guard` is wired, and editing it (Write/Edit) is denied where `coverage-threshold-guard` is
  wired. A test added to an existing test file is not locked, and neither is a test committed together with its fix
  (it is your own test; nothing mechanical stops you from weakening it, only the independent reviewer sees that) -
  lock those by hand:

```bash
# Playbook Stage 4 "protect the loop" — a test that existed before the fix and could not be rewritten is the proof
node .claude/scripts/regression-test-lock.mjs lock tests/unit/features/<feature>/<file>.test.ts --reason "red verified"
# (only in a .worktrees/<branch> worktree where .claude/scripts/regression-test-lock.mjs exists; elsewhere review the diff for test edits instead)
```

**Step 3.4: Fix Code (Green)**

```typescript
// Before
// [Problematic code]

// After
// [Fixed code]
```

```bash
# Verify test passes (project-config.json#commands.test, dynamic detection if null)
$TEST_CMD -- tests/unit/features/<feature>/<file>.test.ts
```

**Step 3.5: Static Analysis**

```bash
# project-config.json#commands.lint (skip if null — R-CM-009 Rule 3)
$LINT_CMD
```

---

### Phase 4: Verification & Completion

> **REQUIRED RULE**: `R-CM-010` (verification-before-completion) — Never claim completion without fresh execution evidence.

**Step 4.1: Run Full Test Suite**

```bash
# Run all tests (project-config.json#commands.test, dynamic detection if null)
$TEST_CMD
```

**Step 4.1b: The Lock Needs No Release When the Suite Is Green**

A green suite with the red test untouched *is* the proof — leave the lock in place; it dies with the worktree.
Release only if the test itself turns out to be wrong, and say so to the user first (where the lock script exists):

```bash
node .claude/scripts/regression-test-lock.mjs status                                   # what is locked, and why
node .claude/scripts/regression-test-lock.mjs unlock <file> --reason "<what was wrong>"  # recorded; listed in the Pre-Ship Panel
```

**Step 4.2: Verify Blast Radius**

> **CHECKLIST UPDATE RULE (MANDATORY)**:
> Re-output checklist and update `[ ]` to `[x]` as each item is verified.
> Confirm all items `[x]` before proceeding to completion report.
> Proceeding without updating loses audit-trail evidence for this fix — re-output before the completion report.

- [ ] Verify behavior of adjacent features touching modified files
- [ ] Zero new lint/type warnings introduced by fix
- [ ] All preexisting unit/integration tests pass

**Step 4.3: Completion Report**

```markdown
## Bug Fix Complete

### Summary

| Item | Description |
| --- | --- |
| **Symptom** | [Symptom] |
| **Root Cause** | [Cause] |
| **Fix Location** | `<file path>:<line>` |

### Change Log

| File | Change Type | Description |
| --- | --- | --- |
| `src/...` | Modify | [Description] |
| `tests/...` | Add | Regression test |

### Verification Evidence

- Regression test added and passing
- Full test suite passing
- project-config.json#commands.lint passing (skip if null)

### Next Steps

→ Ready to commit
```

---

> **Special Case Handling** (GitHub Issue-based / Error log available / Hard-to-reproduce / Multiple causes / SPEC-related): Consult on-demand in `references/special-cases.md`.

## Bug Severity Classification

| Severity | Criteria | Response Target |
| :---: | --- | --- |
| **Critical** | App crash, data loss | Immediate fix |
| **High** | Core feature blocked | Fix within 24 hours |
| **Medium** | Degraded functionality | Fix before next release |
| **Low** | UI glitch, typo | Fix as scheduled |

---

> **Layer-by-Layer Error Handling Recap**: Consult `references/error-handling-recap.md` when modifying error-handling code.

## AI Behavioral Guidelines

### DO

- Accurately understand bug symptoms before analyzing
- Formulate hypotheses and validate systematically to find root causes
- **Always write a regression test before fixing code** (TDD) — commit it on its own (what that locks: Step 3.3), and fix the code, never the test
- Solve issues with minimal blast radius
- Adhere to existing patterns and conventions
- Verify project-config.json `commands.lint` passes (skip if null)
- Run full test suite after fix
- Clearly report change logs and verification evidence

### DON'T

- Guess causes and fix based on symptoms alone
- Modify code without tests
- Bundle unrelated refactoring alongside the bug fix
- Claim completion without inspecting side effects
- **Apply temporary workarounds** (root cause fix mandatory)
- Ignore errors (`catch (e) {}`)
- Introduce silent failures

---

## Direct CONTEXT.json Updates

> **State Transition**: `Any State` → `BugFixing`

Bug fix operations can start from any state. Update `CONTEXT.json` directly upon starting and completing work:

### When Starting Bug Fix

```markdown
## CONTEXT.json Update Contents

1. Read `docs/features/<id>/CONTEXT.json`
2. Edit:
   - quick_resume.current_state → "BugFixing"
   - quick_resume.current_task → "Bug Analysis: [Symptom]"
   - quick_resume.next_actions → ["Isolate root cause", "Write regression test", "Implement fix"]
   - quick_resume.last_updated_at → Current timestamp
   - history[] += State transition record
```

### When Completing Bug Fix

```json
{
  "quick_resume": {
    "current_state": "SyncingStatus",
    "current_task": "Bug fix complete, awaiting status sync",
    "next_actions": ["Execute feature-status-sync", "Reflect status in index.md"],
    "last_updated_at": "2026-02-11T15:30:00+09:00"
  },
  "decisions": [
    {
      "at": "2026-02-11T15:30:00+09:00",
      "summary": "Bug root cause: [Cause summary]",
      "rationale": "[Rationale for fix strategy]"
    }
  ],
  "history": [
    {
      "at": "2026-02-11T15:30:00+09:00",
      "from_state": "BugFixing",
      "to_state": "SyncingStatus",
      "triggered_by": "bug-fix",
      "note": "Bug fix complete - [Symptom] → [Fix summary]"
    }
  ]
}
```

---

## Direct Wisdom Logging

> **Purpose**: Record lessons learned during bug fixing directly in Wisdom to prevent recurrence of similar issues.

### When Starting Work

**Reference Wisdom** (Check existing error patterns):

```bash
Read(".claude/wisdom/common-errors.md")
Read(".claude/wisdom/project-patterns.md")
```

### When Learning Occurs During Work

**Record in Wisdom Immediately** (APPEND only):

#### 1. When Discovering a New Error Pattern

```markdown
## {Error Name}

**Symptom**: {Bug occurrence context}
**Root Cause**: {Why it happened}
**Resolution**: {How it was fixed}

```typescript
// Before fix
{problematic code}

// After fix
{fixed code}
```

**Prevention**: {Remedies against recurrence}
**Test**: {Added regression test}
```

#### 2. When Discovering a New Solution Pattern

```markdown
## {Pattern Name}

**Context**: {When to use}
**Implementation**: ```typescript
{code example}
```
**Rationale**: {Why this approach is beneficial}
```

### Critical Rules

**Bug-Fix Specific Logging Rules**:

- **Reproduction Steps**: Mandatory to log (so other developers can understand)
- **Error Log**: Include full stack trace
- **Regression Test**: Mandatory to author (prevent regression)

---

## Usage Examples

```bash
# Standalone invocation
/bug-fix "Streaming halts halfway in explanation panel"

# With error log
/bug-fix "Null error on quiz answer submission" --log "<error log>"

# With specific file
/bug-fix "Detail view broken" --file {FEATURES_DIR}/dashboard/components/DetailPanel.tsx
```

---

## Not For / Boundaries

- New feature implementation requests → Use `feature-pilot`
- Performance optimization-only tasks → Use `feature-pilot`
- Code refactoring (non-buggy behavior changes) → Use `feature-pilot`
- Adding tests only (unrelated to bugs) → Use `feature-pilot`

---

## Reference Documents

- [CLAUDE.md - Error Handling Conventions](../../../CLAUDE.md)

---

## Maintenance

- **Sources**: Target project codebase, error logs, GitHub Issues, test outputs
- **Last updated**: 2026-04-05
- **Known limits**: Complex multithreaded/asynchronous bugs may be overlooked during Phase 4 verification; external API errors may have hard-to-isolate root causes.
