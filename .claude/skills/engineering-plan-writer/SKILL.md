---
name: engineering-plan-writer
description: |
  Generates engineering-level bite-sized execution plans from SPEC.md inputs.
  Executes after feature-spec-generator and before feature-implementer to produce
  SPEC → engineering task decomposition → execution plan deliverables.
  Unlike story-decomposer (which focuses on user stories), this skill produces implementation-level plans with exact file paths, complete code snippets, and test commands.

  Triggered by requests such as "execution plan", "implementation plan", "engineering plan", "bite-sized tasks", "task breakdown", etc.
---

# Engineering Plan Writer (Engineering Execution Planning)

> **Core Concept**: Transform SPEC documents into bite-sized tasks executable immediately by a zero-context engineer.

Assumes a zero-context engineer: unfamiliar with the codebase, lacking pre-existing context, and prone to skipping tests unless strictly guided.
Every task includes exact file paths, complete code snippets, and automated verification commands.
DRY. YAGNI. TDD. Frequent commits.

---

## Role Boundaries

| Skill | Role | Deliverable |
|-------|------|-------------|
| **story-decomposer** | SPEC → User / Job Stories (Business Level) | Backlog items |
| **engineering-plan-writer** | SPEC → Engineering Tasks (Implementation Level) | Execution plan documents |
| **feature-implementer** | Execution Plan → Code (TDD) | Production code |

---

## PATH CONTRACT (MANDATORY)

> **BINDING**: Dynamically resolve paths from `project-config.json`. Never hardcode literal paths.

| Placeholder | Resolution Source | Default |
|-------------|-------------------|---------|
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{TESTS_DIR}` | `project-config.paths.tests_unit` | `tests/unit` |
| `{COMPONENT_EXT}` | `project-config.conventions.component_extension` | `.tsx` |

---

## Inputs

| Required | Item | Source |
|:---:|------|------|
| Mandatory | `SPEC.md` | `docs/features/<feature-id>/SPEC-*.md` |
| Optional | `CONTEXT.json` | `docs/features/<feature-id>/CONTEXT.json` |
| Optional | `project-config.json` | Project root |

---

## Protocol

### Step 1: Scope Check

Reference: `references/scope-challenge-framework.md` — 6-check scope challenge to prevent over-scoping prior to plan generation.

If the SPEC spans multiple independent subsystems, propose separate plans per subsystem. Each plan must produce working, independently testable software.

### Step 2: File Structure Mapping

Before defining individual tasks, map the files to be created/modified along with their distinct responsibilities.

- Design units with explicit boundaries and well-defined interfaces.
- One clear responsibility per file.
- Colocate files that change together.
- Adhere strictly to existing codebase conventions.

### Step 2.5: Temporal Interrogation (REQUIRED)

**Must Load First**: `references/temporal-interrogation.md` — Temporal framework proactively answering questions implementers face during development.

Enforce a **mandatory checklist** across 4 temporal horizons commonly overlooked during planning. Do not proceed to Step 3 without answering the questions in each horizon.

```
HOUR 1 (Foundations)   →  "What the implementer must know before typing"
  - File paths (existing vs. new)
  - Config / environment variables + defaults
  - Credential access patterns
  - DB migration sequencing
  - First failing test file + test name

HOUR 2-3 (Core Logic)  →  "Ambiguities the implementer will encounter"
  - Edge-case behaviors (nil, empty, boundaries)
  - Race conditions and concurrency
  - Retry and backoff strategies on external API failures
  - Trust boundaries and validation layers
  - Return signatures (project convention)
  - Logging level and structure

HOUR 4-5 (Integration) →  "Surprises that will trip up the implementer"
  - Coupling with existing modules + circular import hazards
  - Callers (API endpoints / UI triggers / cron jobs)
  - Auth / RLS policy conflicts
  - Cache invalidation strategy
  - Test environment mocks
  - E2E test start and end boundaries
  - Backward compatibility

HOUR 6+ (Polish)       →  "Things we wish we had planned upfront"
  - Loading, empty, and error UI states
  - Accessibility (keyboard navigation, screen readers, contrast)
  - Mobile responsiveness
  - User-facing error copy
  - Observability metrics and alerts
  - Rollback procedures
  - Documentation updates
  - Feature flag requirements
```

**"No Questions" Allowed Only Once**: If a horizon has no open questions, **explicitly state the rationale**. Two consecutive "None" entries indicate superficial interrogation → re-apply the reference checklist.

**Deliverable**: Label each task in `PLAN.md` with `Horizon: HOUR X`. **Every Task must include the `**Effort**: HUMAN ~X / CC ~Y` notation** (gstack ETHOS AI Effort Compression Table native — mandatory dual `human_scale` and `cc_scale` notation).

```markdown
### Task 2: Slot Creation Logic [HOUR 2-3: Core Logic]
**Effort**: HUMAN ~3h / CC ~15min  (~12x compression, task type: feature implementation)
**HOUR 2-3 Resolved Items**:
- [x] nil/empty title → ValidationError
- [x] duplicate slot → return existing id (idempotent)
- [x] Race condition: DB sequence utilized
- [x] Return signature: {data, error} (R-CM-005)
...
```

#### AI Effort Compression Table (Boundary-Uniform with mvp-scoper Step 6)

Reference the compression multiples per task type below when estimating task effort. Documenting `~Nx` is mandatory.

| Task Type | Human (Single Dev) | CC + brief2dev | Compression |
|-----------|--------------------|----------------|-------------|
| Boilerplate / Scaffold (Single module) | 4–8 hours | 5–15 min | **~30–50x** |
| Test Authoring (Unit + integration, single feature) | 4–8 hours | 30–60 min | **~10–15x** |
| Feature Implementation (1 module, TDD) | 1–3 days | 2–6 hours | **~6–12x** |
| Bug Fix (Root cause + regression test) | 2–8 hours | 30–90 min | **~5–10x** |
| Refactoring (1 module, preserving test suite) | 4–8 hours | 1–2 hours | **~5x** |
| Architecture Decision (ATAM Lite 3-option review) | 1–2 days | 2–4 hours | **~5x** |
| Research / Exploration (Market research, codebase crawl) | 1 day | 3 hours | **~3x** |

**Formatting Rules**:
1. **`**Effort**:` line mandatory immediately after task headers + enforced in `PLAN.contract.json` `tasks[].effort` object** (`engineering-plan.schema.json#tasks[].required` schema validation enforced). The `effort` object requires 4 fields: `human` (string), `cc` (string), `compression` (`~Nx` pattern), and `task_type` (8 enum: boilerplate/test/feature/bug_fix/refactor/architecture/market_research/custom). If `task_type=custom`, `task_type_rationale` is required.
2. **Never Omit HUMAN Baseline**: Omitting human estimates distorts user decision-making — always specify both `HUMAN ~X` and `CC ~Y`.
3. **Explicit Multiples + Task Type**: Follow the `~Nx compression, task type: <type>` format. Qualitative descriptions ("fast") are forbidden.
4. **Evidence Honesty**: The compression table above is the SSOT for estimates. Unmapped task types must state `task type: custom (rationale: ...)`.

---

### Step 3: Bite-Sized Task Breakdown (Grouped by Horizons)

Detail: `references/cold-start-plan-protocol.md` — Cold-Start planning protocol for self-contained task context briefs.

**Each Step is a Single Action (2–5 Minutes):**
- "Write the failing test" — Step
- "Run test to verify failure" — Step
- "Implement minimal code to pass test" — Step
- "Run test to verify pass" — Step
- "Commit" — Step

### Step 4: Authoring Plan Documents

Storage Paths:
- Human-Readable Plan: `docs/features/<feature-id>/PLAN.md`
- Machine-Verifiable Contract: `docs/features/<feature-id>/PLAN.contract.json`

#### Plan Document Header (Mandatory)

```markdown
# [Feature Name] Implementation Plan

> **For Subagents:** REQUIRED SUB-SKILL: Use `feature-implementer` to execute task-by-task.
> Track steps using checkbox (`- [ ]`) syntax.

**Goal:** [One sentence describing what this plan builds]

## Task Identity Contract

> Durable agent brief principle: ensures long-running sessions and subagents work against behavioral contracts rather than stale file paths.

| Field | Authoring Rule |
|-------|----------------|
| **Current Behavior** | Actual observable behavior today. Do not list just file paths. |
| **Desired Behavior** | Observable behavior post-implementation. Linked to acceptance criteria. |
| **Out of Scope** | Explicitly excluded work to prevent scope creep. |
| **Context Authority** | Specifies which document (SPEC, CONTEXT.json, ADR) serves as the supreme authority. |
| **Staleness Guard** | If file/line instructions diverge from code, prioritize behavioral criteria and update the plan. |

**Architecture:** [2-3 sentences describing technical approach]

**Tech Stack:** [Core libraries and technologies]

### Failure Modes Registry (Mandatory)
> **Gap identification:** Map failure modes for every new code path; if RESCUED, TEST, and USER SEES are all negative, treat it as a defect and revise the plan.
> **TEST ENFORCEMENT RULE:** Every FAILURE MODE listed here must map to a concrete test case (e.g., `it('should handle DB Lock timeout')`) in Task N's `- [ ] Write test` step.

| CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES? | LOGGED? | TEST CASES |
|----------|--------------|----------|-------|------------|---------|------------|
| [Path/Module] | [e.g., Timeout, DB Lock] | [Y/N] | [Y] | [friendly_error/raw_error/silent/none] | [Y/N] | [`it('should handle DB lock timeout')`] |

### Worktree Parallelization Strategy
> **Parallel Execution Lanes:** Group tasks touching independent modules into isolated lanes to facilitate parallel worktree execution.
- **Lane A**: Task 1 → Task 2 (Sequential, write_scope: shared modules)
- **Lane B**: Task 3 (Parallelizable, write_scope: independent module)
- **Conflict Flags**: If Lanes A and B touch overlapping directories, specify resolution (`sequentialize|split_scope|merge_owner`).

### Machine-Readable Contract (Mandatory)

Generate `PLAN.contract.json` in the same directory as `PLAN.md`. This file must validate against `data/schemas/stage-output/engineering-plan.schema.json`, and all `failure_modes_registry[].test_cases[]` must appear in `tasks[].steps[]` with `type: "write_test"`.

```bash
make q.engineering-plan-contract
```

This contract serves as the SSOT for subsequent AI sessions and subagents to parse failure modes, test cases, and parallel lanes deterministically. Updating `PLAN.md` requires updating `PLAN.contract.json` in the same turn.

---
```

#### Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `{FEATURES_DIR}/<feature>/types/model.ts`
- Modify: `{FEATURES_DIR}/<feature>/hooks/useData.ts:45-60`
- Test: `{TESTS_DIR}/<feature>/model.test.ts`

**Task Contract:**
- Current Behavior: [Current state]
- Desired Behavior: [Observable target state]
- Out of Scope: [Excluded items]
- Context Authority: [SPEC/CONTEXT/ADR paths]

- [ ] **Step 1: Write failing test**

```typescript
describe('DataModel', () => {
  it('should validate required fields', () => {
    const result = validateData({ name: '' });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `project-config.commands.test -- {TESTS_DIR}/<feature>/model.test.ts`
Expected: FAIL - "validateData is not defined"

- [ ] **Step 3: Minimal implementation**

```typescript
export function validateData(data: DataInput): ValidationResult {
  if (!data.name?.trim()) {
    return { success: false, error: 'Name required' };
  }
  return { success: true, data };
}
```

- [ ] **Step 4: Verify test passes**

Run: `project-config.commands.test -- {TESTS_DIR}/<feature>/model.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add {FEATURES_DIR}/<feature>/types/model.ts {TESTS_DIR}/<feature>/model.test.ts
git commit -m "feat(<feature>): add data validation"
```
````

### Step 5: Plan Review Loop

Post-authoring:

1. Dispatch a review subagent to audit the plan (SPEC alignment + task completeness).
2. If issues are identified, revise and re-review.
3. Escalate to the user if review exceeds 3 iterations.

**Review Criteria:**
- Completeness: Zero placeholders, missing steps, or incomplete tasks.
- SPEC Alignment: Every requirement in the SPEC is addressed in the plan.
- Executability: Can an engineer execute this without ambiguity or blockers?
- TDD Rigor: Every task follows strict Red-Green-Refactor sequencing.

---

## Integration

**Call Chain:**

```
feature-architect → feature-spec-generator → engineering-plan-writer → feature-implementer
                                                                    ↘ (In SDD Mode)
                                                               subagent per task + 2-stage review
```

**Callers:**
- `feature-pilot` — Automatically invoked after SPEC generation for NEW_FEATURE flows.
- Direct invocation supported.

**Related Skills:**
- `story-decomposer` — Business-level story decomposition (complementary).
- `feature-implementer` — Executes the engineering plan (activates SDD mode).
- `spec-validator` — Validates SPEC completeness.

**Schema Validation:**
- `data/schemas/stage-output/engineering-plan.schema.json` — Validates `PLAN.contract.json` structure.
- `data/schemas/sdd-phase-transition.schema.json` — Tracks SDD phase transitions.

---

## Red Flags

**Strictly Avoid:**
- Vague steps like "Add validation" (must provide exact code).
- Tasks lacking exact file paths.
- Verification steps lacking expected output traces.
- Tasks skipping TDD red-green sequencing.
- Bundling multiple unrelated changes into a single task.
- **Omitting `**Effort**:` line or single-scale notation**: Missing HUMAN baseline violates gstack ETHOS principles.

## Not For / Boundaries

- **User Story Decomposition**: Handled by `story-decomposer`. This skill operates strictly at the engineering tier (file/code/test commands).
- **SPEC Authoring**: Handled by `feature-spec-generator`. This skill transforms SPEC → Execution Plan.
- **Code Implementation**: Handled by `feature-implementer`. This skill authors plans; execution is strictly separated.

## Maintenance

- **Sources**: brief2dev internal rules (`.claude/rules/` R-CM/R-PL) + skill conventions + gstack AI Effort Compression Table + `plan-ceo-review` HUMAN/CC notation.
- **Last updated**: 2026-05-09 (Integrated gstack ETHOS AI Effort Compression Table — mandatory `**Effort**: HUMAN ~X / CC ~Y` notation across all tasks).
- **Known limits**: Explicit boundaries are defined in the frontmatter description (`|...`) and "Not For / Boundaries" section.
