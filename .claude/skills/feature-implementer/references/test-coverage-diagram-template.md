# Test Coverage Diagram Template

> **Purpose**: Systematically map all branches, errors, and user flows of modified code during the TDD implementation phase to identify test gaps in advance.
> **When**: Execute prior to starting Step 3 (TDD Implementation) in `feature-implementer`.

## Iron Rule

```
NO COMMITS WITH UNTESTED CODE PATHS.
```

---

## Step 1: Code Path Tracing

Map every execution path of the code to be implemented. Read the **entire file** rather than just diff hunks to understand the full context.

For each modified file:

1. **Identify Entry Points**: Route handlers, exported functions, event listeners, component render functions.
2. **Trace Data Flow**:
   - Input sources: Request parameters, props, DB queries, API calls.
   - Transformations: Validation, mapping, computations.
   - Outputs: DB writes, API responses, rendering, side effects.
   - Failure potential at each step: null/undefined, invalid inputs, network failures, empty collections.
3. **Draft Branch Diagram**:
   - All added/modified functions/methods.
   - All conditional branches (`if/else`, `switch`, ternary, guard clauses, early returns).
   - All error paths (`try/catch`, error boundaries, fallbacks).
   - Invocations of other functions (trace untested branches of those functions as well).
   - Edge cases: null inputs, empty arrays, invalid types.

---

## Step 2: Map User Flows + Interactions + Error States

Code coverage alone is insufficient. Real user interactions must be covered.

For each modified feature:

- **User Flows**: Sequence of user actions touching this code (e.g., "Click checkout → Validate form → Call API → Success/Failure screen").
- **Interaction Edge Cases**:
  - Double clicking / rapid resubmission
  - Abandonment mid-flow (back button, tab close)
  - Submissions with stale data (idle for 30 minutes, expired session)
  - Slow connections (API takes 10s — what does the user see?)
  - Concurrent actions (two tabs, same form)
- **Error States**:
  - Clear error message vs. silent failure
  - User recoverability (retry, back, modify input)
  - Offline/no network, API 500, invalid server payload
- **Boundary States**: 0 results, 10,000 results, single character, max length.

---

## Step 3: Coverage Check Against Existing Tests

Cross-check each branch in the diagram against existing tests.

### Quality Scoring

| Score | Meaning | Criteria |
|:-----:|---|---|
| ★★★ | Complete | Tests behavior + edge cases + error paths |
| ★★ | Basic | Tests happy path only |
| ★ | Minimal | Smoke test / presence check / trivial assertion |

### Test Type Decision Matrix

| Condition | Recommended Type | Diagram Marker |
|---|---|:---:|
| User flow spanning 3+ components/services | E2E | `[→E2E]` |
| Integration point where mocking masks real failures | E2E | `[→E2E]` |
| Auth / Payment / Destructive data flows | E2E | `[→E2E]` |
| LLM output quality evaluation | Eval | `[→EVAL]` |
| Pure functions, internal helpers | Unit | (Default) |
| Single function edge cases | Unit | (Default) |

### Regression Iron Rule

```
IRON RULE: If a diff modifies existing behavior (not purely new code) and existing tests do not cover that path,
write a regression test immediately. Without asking. Without skipping.
```

Regression Criteria:
- Diff modifies existing behavior (not purely greenfield code)
- Existing test suite does not cover the modified code path
- Change introduces a new failure mode for existing callers

---

## Step 4: ASCII Coverage Diagram Output

Integrate code paths and user flows into a unified diagram.

```
CODE PATH COVERAGE
===========================
[+] src/features/search/api/search-api.ts
    │
    ├── executeSearch()
    │   ├── [★★★ TESTED] Happy path + empty results + timeout — search.test.ts:42
    │   ├── [GAP]         Network timeout — NO TEST
    │   └── [GAP]         Invalid query params — NO TEST
    │
    └── paginateResults()
        ├── [★★  TESTED] Normal pagination — search.test.ts:89
        └── [★   TESTED] Last page (presence check only) — search.test.ts:101

USER FLOW COVERAGE
===========================
[+] Search Flow
    │
    ├── [★★★ TESTED] Keyword search → Render results — search.e2e.ts:15
    ├── [GAP] [→E2E] Back button during search — E2E required
    ├── [GAP]         Empty search term submit — Unit test sufficient
    └── [★   TESTED]  Search loading state (render check only) — search.test.ts:40

[+] Error States
    │
    ├── [★★  TESTED] API 500 error message — search.test.ts:58
    ├── [GAP]         Network timeout UX — NO TEST
    └── [GAP]         0 results state — NO TEST

─────────────────────────────────
COVERAGE: 4/10 paths tested (40%)
  Code paths: 2/4 (50%)
  User flows: 2/6 (33%)
QUALITY:  ★★★: 2  ★★: 1  ★: 1
GAPS: 6 paths need tests (1 needs E2E)
─────────────────────────────────
```

**Fast path**: If all paths are covered → Output "All code paths have test coverage ✓" and omit full diagram.

---

## Step 5: Generate Gap Tests

When gaps are identified:

- **AUTO**: Pure function unit tests, edge cases for existing test functions → Write immediately.
- **ASK**: E2E tests, requiring new test infrastructure, ambiguous behavior → Confirm with user before writing.
- **[→E2E]** marked paths: Always ASK.
- **[→EVAL]** marked paths: Always ASK.

---

## Platform Agnostic

This template follows dynamic path resolution from `project-config.json`.
Test path: `project-config.paths.tests_unit`
Test command: `project-config.commands.test`
