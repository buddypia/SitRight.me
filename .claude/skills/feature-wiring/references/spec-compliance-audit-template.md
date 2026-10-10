# SPEC Compliance Audit Template

> **Purpose**: Cross-verifies implemented code against FR/NFR items in `SPEC.md` post-implementation to detect omissions and scope drift.
> **When**: Executed during `feature-wiring` integration verification following Export / Route / Lint verification passes.

---

## Purpose

Even when `SPEC.md` exists, teams often lack a **structural** mechanism to ensure implementation fully satisfies the specification.
This template maps each SPEC item into DONE / PARTIAL / NOT_DONE / CHANGED states,
executing bidirectional detection of Scope Drift (unspecified implementations) and Missing Requirements (unimplemented specifications).

---

## Step 1: Extract SPEC Items

Read `SPEC.md` and extract all actionable specification items.

### Extraction Targets

- **FR (Functional Requirements)**: `FR-XXX` or items under `### FR`
- **NFR (Non-Functional Requirements)**: `NFR-XXX` or explicit performance/security/a11y requirements
- **API Endpoints**: Each endpoint in `api_endpoint` blocks
- **Component Specifications**: Each component under `### Components`
- **Test Scenarios**: Each scenario under `### Test Scenarios`

### Extraction Exclusions

- Background / Context sections
- Future considerations (Future, Out of scope)
- Open questions / unresolved items (TBD, TODO)

### Item Categorization

Assign a category to each extracted item:

| Category | Description |
| --- | --- |
| `CODE` | Requires implementation code |
| `TEST` | Requires test authoring |
| `API` | API endpoint implementation |
| `UI` | UI component implementation |
| `CONFIG` | Configuration / Environment variables |
| `DOCS` | Documentation authoring |

**Ceiling**: Maximum 50 items. If exceeded: "Showing N of top 50 items — consult SPEC.md for full catalog."

---

## Step 2: Cross-Verification Against Implementation Code

Read implemented code (`features/{name}/` subtree) to evaluate the status of each SPEC item.

### Evaluation Rubric

| Status | Definition | Evaluation Criteria |
| --- | --- | --- |
| **DONE** | Fully implemented | Unambiguous evidence of functionality in diff. Concrete file citation required. |
| **PARTIAL** | Partially implemented | Work exists but incomplete (e.g., model created but controller missing). |
| **NOT_DONE** | Unimplemented | Zero evidence of specified feature in diff. |
| **CHANGED** | Implemented differently | Goal achieved via alternative approach. Document divergences. |

**Be conservative on DONE**: File edits alone are insufficient; specified capability must actively exist.
**Be flexible on CHANGED**: Accept implementations where the underlying objective is satisfied via valid alternative patterns.

---

## Step 3: Scope Drift Detection

Identify code modifications absent from `SPEC.md`.

### SCOPE CREEP Signals

- File modifications unreferenced in SPEC
- New features or unsolicited refactoring not specified in SPEC
- "While we're in here..." modifications (expanding blast radius)

### MISSING REQUIREMENTS Signals

- SPEC FRs / NFRs unreflected in code
- Missing test suites for specified test scenarios
- Incomplete implementations (started but unfinalized)

---

## Step 4: Audit Report Output

```
SPEC COMPLIANCE AUDIT
═══════════════════════════════
SPEC: docs/features/{name}/SPEC.md
Feature: {feature-name}

## Functional Requirements
  [DONE]      FR-001 Search API — src/features/search/api/search-api.ts (+142 lines)
  [PARTIAL]   FR-002 Filtering — Category filter present; date filter missing
  [NOT_DONE]  FR-003 Autocomplete — No relevant code
  [CHANGED]   FR-004 "Redis Cache" → Implemented via in-memory LRU cache

## Non-Functional Requirements
  [DONE]      NFR-001 Response time ≤200ms — Cache layer implemented
  [NOT_DONE]  NFR-002 Accessibility WCAG 2.1 AA — ARIA attributes unapplied

## Test Scenarios
  [DONE]      TS-001 Keyword Search — search.test.ts:15
  [NOT_DONE]  TS-002 Empty Result Handling — Missing test

## Scope Check
  [SCOPE CREEP] src/shared/utils/debounce.ts — Unspecified utility added
  [CLEAN]       All other modifications remain within SPEC scope

─────────────────────────────────
COMPLIANCE: 4/8 DONE, 1 PARTIAL, 2 NOT_DONE, 1 CHANGED
SCOPE: 1 creep detected, 2 requirements missing
─────────────────────────────────
```

---

## Integrations

- **NOT_DONE Items** → Report as incomplete work to `feature-pilot`
- **PARTIAL Items** → Update progress in `CONTEXT.json`
- **SCOPE CREEP Items** → Informational (does not block; for user visibility)
- **COMPLIANCE < 80%** → Issue recommendation for `feature-wiring` FAIL

---

## Platform Independence

This template follows dynamic path resolution from `project-config.json`.
SPEC Path: `{FEATURES_DIR}/{name}/SPEC.md`
Code Path: `{FEATURES_DIR}/{name}/`
