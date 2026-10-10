---
name: feature-status-sync
description: |
  Skill for synchronizing target project CONTEXT.json (SSOT) and index.md.
  Verifies code existence based on CONTEXT.json progress metadata and generates/updates index.md.
  Invoked during feature-pilot post-implementation status update steps.
  Triggered by requests like "feature status sync", "sync doc and code", "update index.md", or "synchronize feature status".
---

# Feature Status Synchronizer

## Overview

A skill that executes **synchronization between CONTEXT.json (SSOT) and the codebase/documentation** in target projects.

### SSOT Architecture

```
CONTEXT.json (SSOT) ← Single Source of Truth
    |
    +--→ Code Verification (File existence & test runs)
    |
    +--→ Generate index.md (Individual feature view)
    |
    +--→ domain-map.json Integrity Verification + Sync (Phase 7)
    |
    +--→ Top-level index.md Sync (Phase 7)
```

> **Important**: `index.md` is NOT an SSOT. It is a **generated view** derived from `CONTEXT.json`.

### Problem Definition

- Divergence between `CONTEXT.json` progress records and actual codebase reality
- Stale `index.md` files misleading downstream skills
- Inter-skill confusion stemming from conflicting metadata sources

### Resolution Strategy

1. Read **code paths per FR** from `CONTEXT.json`.
2. Verify that **target implementation files actively exist**.
3. Verify that **corresponding test files exist and pass**.
4. Update `CONTEXT.json` progress metadata.
5. Regenerate `index.md`.

## PATH CONTRACT (MANDATORY)

> **BINDING**: This skill uses dynamic path placeholders.
> The AI must resolve paths from `project-config.json` before performing file operations.
> Using literal paths is a **protocol violation**.

| Placeholder | Resolution Source | Default |
| --- | --- | --- |
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{TESTS_DIR}` | `project-config.paths.tests_unit` | `tests/unit` |
| `{DOCS_DIR}` | `project-config.paths.docs_features` | `docs/features` |
| `{SHARED_DIR}` | `project-config.paths.shared` | `src/shared` |
| `{TEST_SUFFIX}` | `project-config.conventions.test_suffix` | `.test.ts` |

**Resolution**: `Read project-config.json → Resolve placeholders → Use resolved values`
**Fallback**: If `project-config.json` does not exist, use Default column

**FORBIDDEN**: Never use literal `src/features/`, `src/shared/`, or `tests/unit/` in generated code, commands, or file paths.

---

## Trigger Conditions

- Automatic invocation after `feature-pilot` implementation completion (Step 5)
- "feature status sync", "sync doc and code"
- "update index.md", "synchronize feature status"
- Pre-PR quality checks (extension of `/pre-quality-gate`)
- Recommended prior to executing `priority-analyzer`

## Workflow

### Phase 1: Identify Target Features

```bash
# Collect all feature CONTEXT.json paths
Glob docs/features/*/CONTEXT.json
```

### Phase 2: Feature-Level Analysis

For each `CONTEXT.json`:

1. **Read progress.details** (File list mapped per FR)
2. **Read references.related_code** (Associated code paths)
3. **Inspect priority.last_updated** (Staleness detection)

#### Priority Staleness Check

> **Automation Trigger**: Proactively alerts when priorities require refreshes.

```python
STALE_THRESHOLD_DAYS = 14

priority = context.get("priority", {})
last_updated = priority.get("last_updated")

if last_updated:
  days_old = (now - parse_datetime(last_updated)).days
  if days_old >= STALE_THRESHOLD_DAYS:
    print(
        f"Warning: {feature_id}: Priority has not been updated for"
        f" {days_old} days."
    )
    print(f"   Recommended: Run /priority-analyzer {feature_id} --apply")
```

**Output Example**:

```
Warning: 008-monetization-system: Priority has not been updated for 21 days.
   Recommended: Run /priority-analyzer 008-monetization-system --apply
```

```json
{
  "progress": {
    "percentage": 100,
    "fr_total": 6,
    "fr_completed": 6,
    "details": {
      "FR-501": {
        "status": "completed",
        "files": ["{FEATURES_DIR}/lesson/components/LessonListPage.tsx"]
      }
    }
  }
}
```

### Phase 3: Code Existence Verification

```bash
# Check implementation file existence
Glob {FEATURES_DIR}/<feature>/components/<file>.tsx
Glob {FEATURES_DIR}/<feature>/hooks/<file>.ts

# Check test file existence (Rule: {FEATURES_DIR}/ → {TESTS_DIR}/features/ mapping)
Glob {TESTS_DIR}/features/<feature>/components/<file>.test.tsx
Glob {TESTS_DIR}/features/<feature>/hooks/<file>.test.ts
```

### Phase 4: State Evaluation Matrix

| Code Exists | Test Exists | Tests Pass | Implementation State |
| :---: | :---: | :---: | :---: |
| OK | OK | OK | `completed` |
| OK | OK | NG | `in_progress` |
| OK | NG | -- | `in_progress` |
| NG | -- | -- | `pending` |

### Phase 4.5: Test Execution Verification

> **Purpose**: Requires passing test execution in addition to file existence for Done status.

```bash
# Determine test runner via project-config.quality.test_framework
# Example (Vitest):  npx vitest run {TESTS_DIR}/features/${feature_name}/ --reporter=json
# Example (Flutter): flutter test test/features/${feature_name}/ --machine
# Example (Jest):    npx jest {TESTS_DIR}/features/${feature_name}/ --json
# Generic: {TEST_RUNNER} run {TESTS_DIR}/features/${feature_name}/ --reporter=json
```

**Record Results in CONTEXT.json**:

```json
{
  "progress": {
    "details": {
      "FR-XXX": {
        "status": "completed",
        "files": ["{FEATURES_DIR}/xxx/components/Yyy.tsx"],
        "test_passed": true,
        "last_verified_at": "2026-02-13T12:00:00+09:00"
      }
    }
  }
}
```

**Evaluation Flow**:

1. Test file missing → `in_progress` (Tests unauthored)
2. Test execution fails → `in_progress` (Tests failing)
3. Test execution passes → `completed` (Verified Done)

> **Phase 4.7 Completion Summary Generation**: Triggered exclusively upon reaching 100% progress. Details: `references/completion-summary-generation.md`.

### Phase 5: Update CONTEXT.json

```markdown
## CONTEXT.json Update Actions

1. Read `docs/features/<id>/CONTEXT.json`
2. Edit:
   - `progress.percentage` → Recompute
   - `progress.fr_completed` → Recompute
   - `progress.details[FR-XXX].status` → Reflect verification results
   - `quick_resume.current_state` → "SyncingStatus"
   - `quick_resume.last_updated_at` → Current ISO timestamp
   - `history[]` += Sync entry
```

### Phase 6: Generate index.md

Generate/regenerate `index.md` derived from `CONTEXT.json`:

```markdown
# {feature_id}: {title}

> **Status**: {status} ({progress.percentage}%)

## Progress Status

| FR | Title | Code | Tests |
| --- | --- | :---: | :---: |
| FR-501 | Lesson List | OK | OK |
| FR-502 | Query Data | OK | -- |

## Related Files

### Components

- {FEATURES_DIR}/lesson/components/LessonListPage.tsx

### Hooks

- {FEATURES_DIR}/lesson/hooks/useLessonSession.ts

...
```

### Phase 7: domain-map.json Integrity Verification + Top-Level index.md Sync

> **Purpose**: Guarantees system-wide consistency post-feature index.md regeneration.

1. **domain-map.json Integrity Check + Sync**:
   - Read `docs/features/domain-map.json` (Initialize from `docs/_templates/domain_map_template.json` if absent).
   - Verify feature registration in `features[]`. If unregistered, register automatically based on CONTEXT.json `domain` field (handles manually created features). If `domain` is null, prompt user for domain assignment.
   - On mismatch between CONTEXT.json `domain` and `features[].domain`, synchronize using CONTEXT.json as SSOT + emit warning.
   - Update `features[].status` based on `quick_resume.current_state` (Done → done, Archived → archived, Idle/SpecDrafting → planned, otherwise → in_progress).
   - Emit warning if referenced `domain` ID is not declared in `domains[]` (orphan domain).

2. **Top-Level index.md Sync**:
   - Verify feature entry in `docs/features/index.md` (including Domain column).
   - If missing, add table row utilizing `domain` from `CONTEXT.json`.
   - Recompute metrics in the statistics overview section.

3. **Documentation Consistency Verification (Optional)**:
   - Directly verify coherence across `docs/` artifacts (`CONTEXT.json`, `index.md`, `domain-map.json`).
   - Emit warning notices upon detecting divergences.

## Divergence Report

```markdown
## Feature Status Sync Report

### Divergence Detected

| Feature | CONTEXT State | Actual State | Action |
| --- | :---: | :---: | --- |
| 015-notification-system | 0% | 95% | Update CONTEXT |

### Detailed Breakdown

#### 015-notification-system

| FR | CONTEXT | Code | Tests | Actual State |
| --- | :---: | :---: | :---: | :---: |
| FR-1501 | pending | OK | OK | completed |
| FR-1502 | pending | OK | OK | completed |
```

## Code Path Mapping Rules

### Source → Test Conversion (Feature-First Structure)

| Source Path | Test Path |
| --- | --- |
| `{FEATURES_DIR}/xxx/components/Yyy.tsx` | `{TESTS_DIR}/features/xxx/components/Yyy.test.tsx` |
| `{FEATURES_DIR}/xxx/hooks/useYyy.ts` | `{TESTS_DIR}/features/xxx/hooks/useYyy.test.ts` |
| `{FEATURES_DIR}/xxx/types/index.ts` | `{TESTS_DIR}/features/xxx/types/index.test.ts` |
| `{FEATURES_DIR}/xxx/api/yyy.ts` | `{TESTS_DIR}/features/xxx/api/yyy.test.ts` |
| `{SHARED_DIR}/components/Xxx.tsx` | `{TESTS_DIR}/shared/components/Xxx.test.tsx` |

## Progress Computation

```
Overall Progress = (Completed FR Count / Total FR Count) * 100%

Status Labels:
- 100%: Completed
- 80–99%: Finalizing (~XX%)
- 50–79%: In Progress (~XX%)
- 1–49%: Initial (~XX%)
- 0%: Unimplemented
```

## Usage Examples

### Synchronize Single Feature

```
User: "Sync status for 015-notification-system"

1. Read docs/features/015-notification-system/CONTEXT.json
2. Extract and verify code paths
3. Update CONTEXT.json progress
4. Regenerate index.md
5. Report results to user
```

### Full Workspace Scan

```
User: "Check feature status synchronization across all features"

1. Glob docs/features/*/CONTEXT.json
2. Loop verification across all features
3. Generate divergence catalog
4. Present batch update proposal
```

## Integration with feature-pilot

Automatically invoked in `feature-pilot` implementation completion phase:

```
feature-pilot pipeline (NEW_FEATURE / MODIFY_FEATURE)
    ...
    Step 4: Implementation Complete
        ↓
    Step 5: Invoke feature-status-sync
        → Phases 1–6: Sync CONTEXT.json + individual index.md
        → Phase 7: Sync registry integrity + top-level index.md
        ↓
    Step 6: Invoke pre-quality-gate → Final Quality Gate
```

## Integration with priority-analyzer

When running `priority-analyzer`, **invoking this skill first** is strongly recommended to ensure `CONTEXT.json` states are fresh prior to analysis.

```markdown
## priority-analyzer Enhanced Flow

1. Invoke feature-status-sync → Synchronize CONTEXT.json
2. Execute analysis based on synchronized CONTEXT.json
3. Derive accurate priority roadmap
```

### Bidirectional Linkage

| Direction | Trigger | Action |
| --- | --- | --- |
| **status-sync → priority** | Detect staleness in Phase 2 | Print priority update recommendation |
| **priority → status-sync** | Prior to `priority-analyzer` | Recommend progress refresh |

**Staleness Threshold**: 14 days (`STALE_THRESHOLD_DAYS`)

---

## Direct CONTEXT.json Updates

> **State Transition**: `Implementing` / `BugFixing` → `SyncingStatus`

**Update Example**:

```json
{
  "quick_resume": {
    "current_state": "SyncingStatus",
    "current_task": "015-notification-settings CONTEXT.json + index.md sync complete",
    "next_actions": ["Transition to Reviewing step", "Execute pre-quality-gate"],
    "last_updated_at": "2026-02-11T16:00:00+09:00"
  },
  "progress": {
    "percentage": 95,
    "fr_total": 10,
    "fr_completed": 9,
    "fr_in_progress": 1
  },
  "history": [
    {
      "at": "2026-02-11T16:00:00+09:00",
      "from_state": "Implementing",
      "to_state": "SyncingStatus",
      "triggered_by": "feature-status-sync",
      "note": "Completed FR 9/10, synchronized CONTEXT.json + index.md"
    }
  ]
}
```

---

## Operational Guidelines

- **CONTEXT.json is the SSOT**: `index.md` is a generated artifact; direct manual editing is prohibited.
- **Automated updates require user approval**: Prevents unsolicited modifications.
- **Inspect Git State**: Run `git status` prior to edits to avoid merge collisions.
- **Do not modify SPEC documents**: Scope is strictly `CONTEXT.json` and `index.md`.

## When CONTEXT.json is Missing

```markdown
CONTEXT.json Missing

`docs/features/001-user-dashboard/CONTEXT.json` does not exist.

Choose one of the following:

1. Scaffold fresh feature via feature-architect: `/feature-architect 001`
2. Author CONTEXT.json manually
```

## Resources

This skill requires no external scripts; synchronization operates via native filesystem discovery and editing tools.

## Not For / Boundaries

> Explicit non-targets for this skill (R-CM-018 Rule 4 — Missing Boundaries prevention). Frontmatter description + trigger clauses serve as the SSOT for boundaries.

- Areas outside explicit triggers in frontmatter description are out of scope.
- Consult skill body or `MANIFEST.json` for call chains and dependencies.
- Handles CONTEXT.json (SSOT) ↔ index.md synchronization and progress code existence verification only.
- Feature implementation and SPEC generation belong to `feature-pilot` / `feature-spec-generator`.
- CONTEXT.json corruption repair and self-healing belong to `feature-doctor` — this skill assumes well-formed SSOTs.

## Maintenance

- **Sources**: brief2dev internals (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` conventions).
- **Last updated**: 2026-06-11
- **Known limits**: Explicit boundaries defined in frontmatter description (`|...`) and skill body.
