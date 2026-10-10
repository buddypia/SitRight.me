# Plan Document Standards & Bite-Sized Step Guide (engineering-plan-writer Reference)

> **Source**: `oss/superpowers/skills/writing-plans/SKILL.md` (Pattern Track adapted)
> **Sync Baseline**: superpowers v6.1.1, 2026-07-17 (Task Right-Sizing / Global Constraints header / per-task Interfaces blocks)
> **Adaptation**: Stripped original frontmatter. Converted "your human partner" → "user". Mapped superpowers cross-references to brief2dev native conventions. Normalized plan storage paths to brief2dev standards.
> **Loaded by**: Invoked by `engineering-plan-writer` when breaking down SPECs into bite-sized tasks requiring standard headers and granular step guidance.

---

## Core Principles

> "Assume the engineer has zero context on the codebase and questionable taste. Document everything needed: files to touch, code, tests, docs to review, and verification commands. Break the entire plan into bite-sized tasks."

**Principles**: DRY. YAGNI. TDD. Frequent commits.

**Persona Assumption**: A capable developer, but entirely unfamiliar with this specific problem domain and codebase patterns.

---

## Scope Check

If the specification encompasses multiple independent subsystems, split them into **separate modular plans**. Each plan must produce **independently functional and testable software**.

---

## File Structure (Decomposition First)

Map which files to create/modify and their distinct responsibilities **before** defining tasks. Decomposition decisions are locked at this stage.

| Principle | Description |
|-----------|-------------|
| Clear Boundaries & Defined Interfaces | Each file holds a single well-defined responsibility |
| Small, Focused Files | Sized to fit comfortably within single context windows |
| Colocate Files that Change Together | Group by domain responsibility, not arbitrary tech layers |
| Respect Existing Codebase Patterns | Avoid unilateral architectural restructuring |

---

## Task Right-Sizing

A task is the **smallest unit of work that contains its own complete test cycle and justifies a review gate**.

When drawing task boundaries: fold setup, configuration, scaffolding, and documentation directly into the functional deliverable task that requires them. Split tasks only where a reviewer could meaningfully reject this specific unit while approving adjacent ones. Every task ends in an independently verifiable deliverable.

| Criterion | Rule |
|-----------|------|
| Fold In | Include setup, scaffolding, and docs within the task delivering the feature |
| Split Threshold | Split only where independent review rejection/approval makes sense |
| Exit Condition | Each task concludes with an independently testable deliverable |

---

## Bite-Sized Task Granularity

**Each step is a single concrete action (2–5 minutes):**

```
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement minimal code to make the test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step
```

Average: 1 task = 5–10 steps (10–50 minutes total). The complete plan comprises multiple tasks.

---

## Plan Document Standard Header

**Every plan begins with this standard header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers-executing-plans.md` (sequential) to implement task-by-task. Track progress using checkbox (`- [ ]`) syntax.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences describing technical approach]

**Tech Stack:** [Core libraries and framework dependencies]

## Global Constraints

[Project-wide constraints from the spec — minimum runtime versions, dependency restrictions, naming rules, platform requirements. Verbatim copy from spec. All tasks inherit these constraints implicitly.]

---
```

**Role of Global Constraints**: Contains global specification requirements inherited by all tasks. Task Reviewers use this section verbatim as the review baseline, ensuring project-wide requirements are preserved across isolated task executions.

---

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [Signatures and contracts consumed from earlier tasks]
- Produces: [Functions, parameters, and types produced for downstream tasks]

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test, confirm failure**
  ```bash
  pytest tests/exact/path/to/test.py::test_specific_behavior
  ```

- [ ] **Step 3: Implement minimal code**
  [Implementation guidance with code snippet]

- [ ] **Step 4: Run test, confirm pass**
  ```bash
  pytest tests/exact/path/to/test.py::test_specific_behavior
  ```

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: implement specific_behavior"
  ```
````

---

## brief2dev Process

### 1. Plan Storage Locations

| Context | Storage Path |
|---------|--------------|
| Feature Development Plan | `docs/features/<feature-slug>/plan.md` |
| Research-Driven Plan | `docs/research/<topic-slug>/plan.md` |
| Ad-hoc Task Plan | `.tmp/plans/<task-slug>.md` (Ignored by git) |

### 2. Worktree Isolation (Optional)

Isolate large-scale changes using the `EnterWorktree` tool.

### 3. Plan Authoring Flow

1. Read `SPEC.md` or `BRIEF.md`.
2. Scope Check — split if multiple subsystems exist.
3. Map File Structure — define file boundaries.
4. Task Breakdown — target 5–10 steps per task.
5. Sizing Validation — verify steps take 2–5 minutes each.
6. Author Plan Header + Global Constraints.
7. Request user review prior to execution.

---

## Integration Touchpoints

### Relationship to Other Reference Documents

| Reference Document | Role |
|--------------------|------|
| `cold-start-plan-protocol.md` | Plan authoring when entering new codebases |
| `scope-challenge-framework.md` | Validating scope decisions |
| `temporal-interrogation.md` | Validating timing and sequencing decisions |
| **`superpowers-writing-plans.md` (This Guide)** | **Standard header + 2–5 min steps + DRY/YAGNI/TDD** |
| **`superpowers-executing-plans.md`** | **Execution cycle & verification protocol** |

---

## Anti-Patterns

| Anti-Pattern | Operational Impact |
|--------------|-------------------|
| Tasks spanning 1+ hours | Obscures progress; causes large rollbacks on partial failures |
| Multi-action steps ("Do X, and also Y") | Violates bite-sized granularity; complicates failure isolation |
| Missing file paths ("in appropriate file...") | Implementers guess, placing code in incorrect locations |
| Skipping test steps | Violates TDD; leaves regressions undetected |
| Omitting plan headers | Implementers lack context on execution constraints |
| Bundling multiple subsystems | Causes scope explosion; prevents incremental delivery |

---

## Maintenance

- **Sources**:
  - Original: `oss/superpowers/skills/writing-plans/SKILL.md` (superpowers v6.1.1)
  - Attribution: superpowers OSS by Jesse Vincent / Prime Radiant
- **Sync Baseline**: superpowers v6.1.1, 2026-07-17
- **Last updated**: 2026-07-17
- **Adaptation type**: `adapted` (Standard header + bite-sized rules + Task Right-Sizing / Global Constraints / Interfaces blocks + brief2dev feature paths)
