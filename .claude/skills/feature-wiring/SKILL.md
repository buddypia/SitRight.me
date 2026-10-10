---
name: feature-wiring
description: |
  Feature integration and wiring verification skill.
  Verifies module exports, routes, data flows, and linting for implemented features,
  ensuring all components are cleanly wired and operational.

  Triggered by requests like "verify integration", "check wiring", "wiring", or "check connections".
---

# Feature Wiring

> **Core Concept**: "Verify Every Connection Point" - Ensures end-to-end integration integrity post-implementation.

Following feature implementation, this skill verifies 4 core dimensions: Exports, Routing, Data Flow, and Linting, confirming that the feature is properly wired into the host application.

## PATH CONTRACT (MANDATORY)

> **BINDING**: This skill uses dynamic path placeholders.
> The AI must resolve paths from `project-config.json` before performing file operations.
> Using literal paths is a **protocol violation**.

| Placeholder | Resolution Source | Default |
| --- | --- | --- |
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{SOURCE_ROOT}` | `project-config.paths.source_root` | `src` |

**Resolution**: `Read project-config.json → Resolve placeholders → Use resolved values`
**Fallback**: If `project-config.json` does not exist, use Default column
**Route Verification**: Branches based on framework (Next.js: `{SOURCE_ROOT}/app/`, Nuxt: `pages/`, SvelteKit: `{SOURCE_ROOT}/routes/`, Flutter: `lib/app/router.dart`, Expo: `app/`)

**FORBIDDEN**: Never use literal `src/features/` or `src/app/` in generated code, commands, or file paths.

```
1. Read project-config.json (Use defaults if absent)
2. FEATURES_DIR = paths.features (Default: "src/features")
3. SOURCE_ROOT = paths.source_root (Default: "src")
4. LINT_CMD = project-config.commands.lint (Skip if null)
5. Route verification branches by framework:
   - Next.js: Page files under {SOURCE_ROOT}/app/
   - Nuxt: pages/ or src/pages/
   - SvelteKit: {SOURCE_ROOT}/routes/
   - Flutter: lib/app/router.dart
   - Expo: app/ (Expo Router)
```

---

## Verification Criteria

| # | Check Dimension | Target | Pass Condition |
| --- | --- | --- | --- |
| 1 | **Export Verification** | Barrel files (`index.ts` or equivalent) | All necessary modules are cleanly exported |
| 2 | **Route Verification** | Framework routing directory | Page files exist in valid framework locations |
| 3 | **Data Flow Verification** | Hook/Store → API → Backend | Unbroken call chains across all layers |
| 4 | **Lint Verification** | Full project scope | 0 lint errors |

---

## Execution Flow

```
[Start]
  |
  +-- Phase 1: Static Verification
  |     +-- 1.1 Export Verification: Validate public API in barrel file (index.ts)
  |     +-- 1.2 Route Verification: Confirm page exists in framework router
  |
  +-- Phase 2: Dynamic Verification
  |     +-- 2.1 Data Flow Verification: Check Hook → API → Backend chain
  |     +-- 2.2 Lint Verification: Check 0 errors from project-config.commands.lint
  |     +-- 2.3 UI Flow Verification: Validate project-config.commands.check_architecture
  |
  +-- Phase 2.5: Cross-Feature Dependency Verification (GSD Boundary Map Pattern)
  |     +-- 2.5.1 Ingest dependent Feature completion_summary
  |     +-- 2.5.2 Cross-verify import ↔ produces
  |     +-- 2.5.3 Stub Detection (return null, TODO, empty stubs)
  |
  +-- Phase 3: Results Reporting
        +-- All checks Pass → Render Go verdict
        +-- Failures detected → Propose concrete remediations → Re-verify post-fix
```

---

## Phase 1: Static Verification

### 1.1 Export Verification

Target: `{FEATURES_DIR}/<feature>/index.ts`

Checklist:

- Are type definitions (`types`) exported?
- Are custom hooks (`hooks`) exported?
- Are UI components (`components`) exported?
- Are API functions exported where appropriate (internal-only utils excluded)?

```bash
# Read barrel file contents
Read("{FEATURES_DIR}/<feature>/index.ts")

# Check existence of submodule files
Glob("{FEATURES_DIR}/<feature>/**/*.ts*")
```

### 1.2 Route Verification

Target: Framework routing directory (refer to PATH CONTRACT routing rules)

Checklist:

- Does a page file corresponding to the feature exist?
- Is the page placed in accordance with framework routing conventions?
- Does the page import the feature's entry component?

---

## Phase 2: Dynamic Verification

### 2.1 Data Flow Verification

Call Chain: `Component → Hook → API → Backend (API Route)`

Checklist:

- Does the Component invoke the Hook?
- Does the Hook invoke the API client function?
- Does the API function reference valid endpoints?
- Does the API Route exist in the framework API directory (where applicable)?

### 2.2 Lint Verification

```bash
# project-config.json → commands.lint (Skip if null)
# R-CM-009: Never hardcode make targets
```

- 0 errors strictly required
- Warnings reported but treated as passing
- If `commands.lint` is null, skip this phase

### 2.5 Cross-Feature Dependency Verification (GSD Boundary Map Pattern)

> **Purpose**: Cross-checks `completion_summary.produces` of dependent Features against actual imports.
> Implements GSD's Key Links pattern to detect features that exist in isolation without active wiring.

**Activation Criteria**: When 1+ dependent features exist in `CONTEXT.json` `references.dependencies.features`

**Procedure**:

1. **Ingest Dependent Feature's completion_summary**:
   ```bash
   # Extract dependent feature IDs from CONTEXT.json dependencies.features
   # Read completion_summary.produces from each dependent CONTEXT.json
   Read docs/features/<dep-feature-id>/CONTEXT.json → .completion_summary.produces
   ```

2. **Cross-verify import ↔ produces**:
   ```bash
   # Extract imports referencing dependent features in current feature code
   Grep "from.*features/<dep-feature>" {FEATURES_DIR}/<current-feature>/

   # Assert each imported symbol exists in dep-feature completion_summary.produces.exports
   # Missing = FAIL: "Feature B imports generateToken() from Feature A,
   #                 but it is missing from Feature A's completion_summary.produces.exports"
   ```

3. **Stub Detection** (GSD Static Verification Pattern):
   ```bash
   # Detect stub patterns across all .ts/.tsx/.dart files in current feature
   Grep "return null|return \{\}|return \[\]|TODO|FIXME|HACK|console\.log.*placeholder|throw new Error\('not implemented'\)" {FEATURES_DIR}/<feature>/

   # Line count sanity check: All exported symbols in barrel files must have ≥10 LOC
   # <8 LOC + sole return statements flagged as suspected stubs
   ```

**Report Format**:

```markdown
### Phase 2.5: Cross-Feature Dependency Verification

| Dependent Feature | Symbol | Import Present | Present in produces | Verdict |
| --- | --- | :---: | :---: | :---: |
| 001-auth | generateToken() | OK | OK | PASS |
| 001-auth | User (type) | OK | OK | PASS |
| 001-auth | refreshToken() | OK | **MISSING** | FAIL |

### Stub Detection

| File | LOC | Stub Pattern | Verdict |
| --- | :---: | --- | :---: |
| api/auth.ts | 45 | None | PASS |
| hooks/useSearch.ts | 6 | `return null` | FAIL |
```

**When completion_summary is absent**: If a dependent feature's `completion_summary` is `null`, that feature is not yet finalized. Emit a warning without failing (the prerequisite feature may still be under development).

### 2.3 UI Flow Verification

Target: `docs/ui-flow/ui-flow.json`

Checklist:

- Are new panels registered under `panels` in `ui-flow.json`?
- Are new SSE events declared in `sse_mapping`?
- Are new panels mapped into appropriate phases in `phases`?
- Does `project-config.commands.check_architecture` pass (skip if null)?

```bash
# project-config.json → commands.check_architecture (Skip if null)
# R-CM-009: Never hardcode make targets
```

- All 12 items must pass (MVS violations block with exit code 1)

---

## Remediation on Failure

Remediation actions by failure type:

| Check | Common Cause | Remediation Action |
| --- | --- | --- |
| Export | Missing export in barrel file | Add export to `index.ts` |
| Route | Missing page file | Create page in framework route directory |
| Data Flow | Import path mismatch | Route imports through barrel file |
| Lint | Type errors, unused variables | Resolve errors per linter output |
| UI Flow | Unregistered panels/phases | Update `docs/ui-flow/ui-flow.json` |

Always **re-verify** following fixes.

---

## Output Format

### All Checks Pass

```markdown
Feature Wiring - Verification Complete

Feature: <feature-id>
Result: All Checks Pass

| # | Check Dimension | Result |
| --- | --- | --- |
| 1 | Export Verification | Pass |
| 2 | Route Verification | Pass |
| 3 | Data Flow Verification | Pass |
| 4 | Lint Verification | Pass |

→ Feature integration completed successfully.
```

### Failures Detected

```markdown
Feature Wiring - Remediations Required

Feature: <feature-id>
Result: Discovered N issues

| # | Check Dimension | Result | Issues |
| --- | --- | --- | --- |
| 1 | Export Verification | Fail | `useXxx` not exported |
| 2 | Route Verification | Pass | - |
| 3 | Data Flow Verification | Pass | - |
| 4 | Lint Verification | Fail | 2 errors |

Remediation Actions:

1. Add `export { useXxx }` to `{FEATURES_DIR}/<feature>/index.ts`
2. Fix lint errors (details above)

→ Re-verify after executing fixes.
```

---

## Usage Examples

```bash
# Execute by Feature ID (Recommended)
/feature-wiring dashboard

# Automatically invoked post-feature-implementer via feature-pilot
# → Manual invocation typically not required
```

---

## AI Behavioral Guidelines

### DO

- Execute all 4 verification dimensions before rendering report
- Provide concrete, actionable remediation steps on failure
- Re-run verification after applying fixes
- Base checks on the presence of barrel files (`index.ts`)

### DON'T

- Skip verification dimensions
- Modify test suites (outside the scope of Wiring)
- Generate extraneous unrequested files

---

## SPEC Compliance Audit (Final Phase of Wiring)

Following Phases 1–3, if `SPEC.md` exists for the feature, read `references/spec-compliance-audit-template.md` and execute a SPEC compliance audit.

**Process**:
1. Extract FR / NFR / API / UI / Test specifications from `SPEC.md`.
2. Cross-verify against implemented code to assign DONE / PARTIAL / NOT_DONE / CHANGED verdicts.
3. Bidirectionally detect Scope Drift (unspecified features) + Missing Requirements (unimplemented specs).
4. Recommend FAIL if COMPLIANCE is below 80%.

This audit is **informational** — it does not block mechanical Export/Route/Lint verification, but reports incomplete items to `feature-pilot`.

## Not For / Boundaries

> Explicit non-targets for this skill (R-CM-018 Rule 4 — Missing Boundaries prevention). Frontmatter description + trigger clauses serve as the SSOT for boundaries.

- Areas outside the explicit triggers in frontmatter description are out of scope.
- Consult skill body or `MANIFEST.json` for call chains and dependencies.
- Executes integration verification (Export / Route / Data Flow / Lint) only. Implementation and code writing belong to `feature-implementer`.
- Build/Test gates belong to `pre-quality-gate` — this skill focuses strictly on wiring integrity.
- E2E and visual verification belong to `final-review` and dedicated tools. This skill is limited to static wiring.

## Maintenance

- **Sources**: brief2dev internals (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` conventions).
- **Known limits**: Explicit boundaries defined in frontmatter description (`|...`) and skill body.

