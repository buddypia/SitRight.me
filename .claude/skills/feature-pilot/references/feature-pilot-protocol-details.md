<!--
  No frontmatter (intentional): This file is an *archive reference* for SKILL.md, not a skill definition.
  Previously, a copy of SKILL.md frontmatter (description + calls) was kept here, which created a third copy
  and increased drift surface — drifting out of sync with the table in the body by 12 items.
  The declaration SSOT is solely in SKILL.md frontmatter + MANIFEST.json.
-->

# Feature Pilot (AI-Driven Feature Development Orchestrator)

> **Core Concept**: "One Entry, Auto Orchestration, Built-in Validation"

A unified orchestrator that receives all development requests in an AI-driven development environment and automatically coordinates appropriate workflows.

---

## EXECUTION PROTOCOL (MANDATORY) - v9.0

> Follow the protocol below exactly; on any violation, stop and restart from the beginning.

### PATH CONTRACT (MANDATORY)

> **BINDING**: This skill uses dynamic path placeholders.
> The AI must resolve paths in `project-config.json` before performing file operations.
> Using literal paths is a **protocol violation**.

| Placeholder | Resolution Source | Default |
|-------------|-------------------|---------|
| `{FEATURES_DIR}` | project-config.paths.features | `src/features` |
| `{SHARED_DIR}` | project-config.paths.shared | `src/shared` |
| `{TESTS_DIR}` | project-config.paths.tests_unit | `tests/unit` |
| `{DOCS_DIR}` | project-config.paths.docs_features | `docs/features` |
| `{COMPONENT_EXT}` | project-config.conventions.component_extension | `.tsx` |
| `{FEATURE_LAYERS}` | project-config.conventions.feature_structure | `["types","api","hooks","components"]` |

**Resolution**: `Read project-config.json → Resolve placeholders → Use resolved values`
**Fallback**: If project-config.json is absent, use the Default column.

**FORBIDDEN**: Never use literal `src/features/` or `src/shared/` in generated code, commands, or file paths.

**Step 0: Path Resolution**

```
1. Read project-config.json (located at project root)
2. Resolved path variables:
   - FEATURES_DIR = project_config.paths.features     (Default: "src/features")
   - SHARED_DIR   = project_config.paths.shared        (Default: "src/shared")
   - TESTS_DIR    = project_config.paths.tests_unit    (Default: "tests/unit")
   - DOCS_DIR     = project_config.paths.docs_features (Default: "docs/features")
   - COMPONENT_EXT = project_config.conventions.component_extension (Default: ".tsx")
   - FEATURE_LAYERS = project_config.conventions.feature_structure   (Default: ["types","api","hooks","components"])
3. If project-config.json does not exist, use default values (guaranteeing backward compatibility)
4. Pass resolved paths as context when calling sub-skills
```

**Usage Examples**:
```
# For Next.js projects in project-config.json
FEATURES_DIR = "src/features"  →  Glob {FEATURES_DIR}/<feature>/components/

# For Flutter projects in project-config.json
FEATURES_DIR = "lib/features"  →  Glob {FEATURES_DIR}/<feature>/views/

# When project-config.json is absent (legacy compatibility)
FEATURES_DIR = "src/features"  →  Identical to legacy behavior
```

### Pre-flight Checklist (Mandatory Output Prior to Starting Skill)

> **CHECKLIST UPDATE RULE (MANDATORY)**:
> Upon verifying each check item, re-output the entire checklist updating its status.
> `---` → `✅` (Pass) or `❌` (Fail). Reflect the latest status for each item verified.
> **Proceeding to the next step without updating = Violation Protocol infraction (severity: HIGH)**

```markdown
## Pre-flight Checklist (feature-pilot)

|   ID   | Item | Status |
| :----: | ------------------------------------------- | :--: |
| PF-000 | Path Resolution completed (read project-config.json) | ---  |
| PF-001 | Work type determination completed | ---  |
| PF-002 | CONTEXT.json accessible or ready for creation | ---  |
| PF-003 | Verify CLAUDE.md rules | ---  |
| PF-004 | Feature Characteristics determination completed | ---  |
| PF-005 | Verify Evidence cache | ---  |
| PF-006 | Verify sub-skill ESP compatibility | ---  |
| PF-007 | Confirm task ID | ---  |
| PF-008 | Create worktree and initialize PLAN.md | ---  |

**Work Type**: [NEW_FEATURE | MODIFY_FEATURE | BUG_FIX | DOCS_ONLY]
**Risk Level**: [high | medium | low]
**Pipeline**: [List of pipeline steps]

---

→ Re-output this table after verifying each item (updating status to ✅/❌)
→ All ✅: Proceed with execution / Any ❌: Halt immediately + report rationale
```

### Model Routing Policy (Mandatory Compliance)

| Task | Model | Cost |
| ----------------------------- | :----: | :----: |
| Work type classification | Sonnet | $ |
| Context collection | Sonnet | $ |
| Readiness Gate verification | Sonnet | $$ |
| Implementation (feature-implementer) | Sonnet | $$ |
| Architecture decisions | Opus | $$$ |

**Sub-skill ESP Inheritance Rules**:

- Calling ESP v2.0+ skills → Verify their Pre/Post-flight outputs.
- Calling non-ESP skills → `feature-pilot` performs surrogate validation.
- **Fallback Chain**: Sonnet → Sonnet → Opus (automatic promotion upon failure).

### Evidence Caching Policy

| Verification Type | TTL | Invalidation Conditions |
| -------------- | :------: | ----------------------------------------------- |
| make q.lint | 30 min | `{SOURCE_ROOT}/**/*.{LANG_EXT}` changed |
| make q.test | 30 min | `{TESTS_DIR}/**/*.{LANG_EXT}`, `{SOURCE_ROOT}/**/*.{LANG_EXT}` changed |
| Readiness Gate | 60 min | SPEC-*.md, screens/*.md changed |
| Security Scan | 60 min | `.env*` changed |

**Cache Utilization**:

- Identical verification within TTL → Skip re-execution, use cached result.
- Invalidation condition met → Force re-execution.
- `--force` flag → Ignore cache, force re-execution.

### Post-flight Checklist (Mandatory Output Prior to Ending Skill)

> **CHECKLIST UPDATE RULE (MANDATORY)**:
> Upon verifying each check item, re-output the entire checklist updating its status.
> `---` → `✅` (Pass) or `❌` (Fail). Reflect the latest status for each item verified.
> **Proceeding to the next step without updating = Violation Protocol infraction (severity: HIGH)**

```markdown
## Post-flight Checklist (feature-pilot)

|   ID    | Item | Status |
| :-----: | --------------------------------------------------- | :--: |
| POF-001 | Pipeline completed or explicitly halted | ---  |
| POF-002 | CONTEXT.json final state update completed | ---  |
| POF-003 | QA verification passed (pre-quality-gate) | ---  |
| POF-004 | All sub-skill Post-flights completed | ---  |
| POF-005 | Evidence caching completed | ---  |
| POF-006 | DoD verification completed (completion_contract verdict = passed) | ---  |
| POF-007 | Worktree PLAN.md and CONTEXT.json cleanup completed | ---  |

**Final Status**: [Done | Blocked | AwaitingUser | Failed]
**Evidence Cache**:

- npm_lint: [CACHED until HH:MM | NOT_CACHED]
- npm_test: [CACHED until HH:MM | NOT_CACHED]
- readiness_gate: [CACHED until HH:MM | NOT_CACHED]

---

→ Re-output this table after verifying each item (updating status to ✅/❌)
→ All ✅: Report completion / Any ❌: Fix and re-verify
```

### Violation Protocol

| Violation Type | Severity | Action |
| ------------------------------------------------ | :------: | -------------------------------------------- |
| Pre-flight not output | CRITICAL | Halt immediately, restart from the beginning |
| Post-flight not verified | HIGH | Execute verification before reporting completion |
| Missing Model parameter (Task call) | HIGH | Re-call Task with required parameters |
| Sub-skill ESP violation | HIGH | Re-execute that skill |
| Claiming completion without verification | CRITICAL | Halt immediately, execute verification |
| Ignoring Evidence cache (unnecessary re-run) | LOW | Warn and proceed |
| Un-updated checklist (leaving as ---/[ ]/⬜) | HIGH | Re-output checklist immediately, update status |

---

## Core Principles

1. **Single Entry Point**: Users do not need to know which internal skills are used.
2. **Auto Classification**: Analyze request to determine work type automatically.
3. **Pipeline Orchestration**: Sequentially or concurrently call appropriate sub-skills.
4. **Built-in Validation**: Readiness Gate is integrated natively, eliminating extra tool calls.
5. **Context Continuity**: Maintain unbroken context throughout the pipeline.
6. **Context Preservation via CONTEXT.json**: Track lifecycle state in a unified file to prevent context loss.

---

## Work Types

| Type | Trigger Signal | Pipeline |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------- |
| **NEW_FEATURE** | "New feature", "Add", SPEC absent | architect → spec → ui-approval → **gate** → impl → wiring → qa → status-sync → quality-gate |
| **MODIFY_FEATURE** | "Modify", "Change", SPEC exists | spec-update → ui-approval → **gate** → impl → wiring → status-sync → quality-gate |
| **BUG_FIX** | "Bug", "Error", "Fix" | analyze → impl → test |
| **DOCS_ONLY** | "Docs only", "SPEC only" | Call specified documentation skill only |

---

## CONTEXT.json Management Protocol (Context Preservation)

> Details: See `references/context-management-protocol.md`

---

## Efficiency and Quality Skills

> Details: See `references/efficiency-skills-protocol.md`

---

## Protocol

### Phase 0: Request Intake and Classification

1. **Request Analysis**:
   - Extract keywords (new feature, modify, bug, research, etc.)
   - Check for mentions of specific feature IDs
   - Check for mentions of specific files or screens

2. **Feature Inventory Lookup (Mandatory regardless of feature ID mention)**:

   ```bash
   # Derived ownership candidates: Surface existing feature/file/route/schema ownership first
   node .claude/scripts/generate-code-ownership-index.mjs query "<user request>" --json

   # Domain boundaries SSOT + feature inventory (fallback to ls docs/features/ + index.md)
   cat {DOCS_DIR}/domain-map.json 2>/dev/null
   cat {DOCS_DIR}/index.md 2>/dev/null
   # If feature ID mentioned, verify documentation existence
   ls {DOCS_DIR}/<mentioned-id>/ 2>/dev/null
   ```

   > Jumping directly to NEW_FEATURE without running the ownership query and reading the inventory is a protocol violation. Natural language requests lacking an ID are the primary source of duplicate feature folders. The ownership index is derived evidence and does not override the authority of `domain-map.json`, `CONTEXT.json`, or SPECs.

2.5. **Domain Placement Determination (Mandatory except for BUG_FIX / DOCS_ONLY)**:

   Compare requirements against ownership query `candidates[]` / `candidate_files[]`, domain-map.json `domains[].keywords` / `responsibility`, and `features[].title`, outputting a 4-way evaluation in tabular format:

   | Verdict | Meaning | Routing |
   | --- | --- | --- |
   | `DUPLICATE` | Identical feature exists | Halt + report existing feature ID |
   | `EXTEND_EXISTING` | Extend existing feature scope | MODIFY_FEATURE (targeting that feature ID) |
   | `NEW_IN_EXISTING_DOMAIN` | New feature within existing domain | NEW_FEATURE (pass domain id) |
   | `NEW_DOMAIN` | New domain required | NEW_FEATURE (note that new domain definition is needed) |

   Output format: `Verdict / Target domain id / Compared existing feature ID (or "None") / Rationale in 1-2 sentences`.
   **Ambiguous cases** (multiple candidate features or low confidence): Present candidate feature IDs + 1-line responsibility for each and confirm with user (`AwaitingUser`). Never guess NEW_FEATURE arbitrarily.
   Pass evaluation result (verdict + domain id + candidate ids/files) to `feature-architect` (re-verified in Step 1.5).

3. **Work Type Determination**:
   ```
   IF bug/error/malfunction mentioned → BUG_FIX
   ELSE IF Verdict == DUPLICATE → Halt + report existing feature
   ELSE IF Verdict == EXTEND_EXISTING → MODIFY_FEATURE
   ELSE IF SPEC absent AND new feature requested → NEW_FEATURE
   ELSE IF SPEC present AND modification requested → MODIFY_FEATURE
   ELSE → Clarification question to user
   ```

### Phase 1: Plan Presentation

Present execution plan based on the classified work type:

> **PIPELINE PROGRESS UPDATE RULE (MANDATORY)**:
> Upon completing each step, re-output this table updating the status column to `✅`/`❌`/`⏭️`.
> Proceeding to the next step while leaving `---` = Violation Protocol infraction (severity: HIGH).

```markdown
## Work Classification Complete

**Request**: [User request summary]
**Work Type**: NEW_FEATURE
**Related Feature**: None (New)

### Execution Plan

| Step | Status | Skill/Action | Description |
| :--: | :--: | ------------------------- | ------------------------------------------------------- |
| 0 | --- | `/research-pilot` | Product Discovery (Conditional: on research/feasibility keywords) |
| 1 | --- | `/feature-architect` | Create CONTEXT.json |
| 2 | --- | `/feature-spec-generator` | Generate SPEC.md + Screens |
| 3 | --- | **Readiness Gate** | Go/No-Go verification (Built-in) |
| 4 | --- | Implementation | Implement per SPEC |
| 5 | --- | Test + Quality Validation | lint + test + architecture check |

→ Re-output this table upon completing each step, updating status to ✅/❌/⏭️
→ All steps ✅/⏭️: Complete / Any ❌: Halt + report reason

Shall we proceed?
```

### Phase 2: Pipeline Execution

Pipelines per work type:

#### NEW_FEATURE Pipeline

**Important**: New features must follow the strict sequence of **architect (create CONTEXT)** → SPEC → Gate → Implementation.
**Option B Principle**: `feature-spec-generator` can execute only after `feature-architect` generates `CONTEXT.json`.

```
Phase -1: research-pilot (Conditional Execution)
        +------------------------------------+
        | Condition: Any of the following:   |
        |  - User mentions "research",       |
        |    "feasibility", "zero-base"      |
        |  - User explicitly calls           |
        |    /research-pilot                 |
        |  - Propose execution when external |
        |    API/AI/ML integration found     |
        |                                    |
        | Use Skill tool:                    |
        | - skill: "research-pilot"          |
        | - args: "<feature description>"    |
        |                                    |
        | On BUILD decision:                 |
        |   → Generate RESEARCH.md           |
        |   → Prepare CONTEXT.json research  |
        |   → Proceed to Phase 0.5           |
        |                                    |
        | On SKIP/DEFER decision:            |
        |   → Record in RESEARCH.md and      |
        |     terminate pipeline             |
        |                                    |
        | Cache: Existing RESEARCH.md within |
        |   30 days → skip, use cache        |
        +------------------------------------+
        v BUILD → Phase 0.5 / SKIP/DEFER → Terminate

Phase 0.5: Concurrent Context Collection
        +------------------------------------+
        | Task list generation → Dependency  |
        | analysis → Batch composition       |
        |                                    |
        | Parallel execution:                |
        | - Task 1: Search patterns [Sonnet] |
        | - Task 2: Check APIs [Sonnet]      |
        | - Task 3: Test patterns [Sonnet]   |
        | - Task 4: Reuse candidates [Sonnet]|
        |                                    |
        | Expected time reduction: 60-70%    |
        +------------------------------------+
        v Context collection complete (Merge parallel results)

Step 1: Invoke feature-architect via Skill tool - Mandatory Gate
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "feature-architect"       |
        | - args: (none) -- Standard mode    |
        |                                    |
        | Solely responsible for             |
        | CONTEXT.json generation            |
        | This step cannot be skipped        |
        +------------------------------------+
        v CONTEXT.json created (Mandatory)

Step 2: Invoke feature-spec-generator via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "feature-spec-generator"  |
        | - args: "<featureID>"              |
        |                                    |
        | Prerequisite: CONTEXT.json required|
        | (Created by architect in Step 1)   |
        +------------------------------------+
        v SPEC.md, screens/*.md created

Step 2.5: Invoke ui-approval-gate via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "ui-approval-gate"        |
        | - args: "<featureID>"              |
        |                                    |
        | Mandatory user approval gate       |
        | Wireframe generation + review      |
        | Cannot proceed without approval    |
        +------------------------------------+
        v Approved → Step 3 / Rejected → Blocked

Step 3: [Built-in] Execute Readiness Gate Protocol
        +------------------------------------+
        | Direct verification without skill  |
        | - Phase 1: Upstream Contract       |
        | - Phase 2: Technical Contract      |
        | - Phase 3: Implementation Safety   |
        | → See "Readiness Gate Protocol"    |
        +------------------------------------+
        v Go → Step 3.5 / No-Go → Revert to Step 2

Step 3.5: [Conditional] Generate Engineering Plan (Prepare SDD Mode)
        +------------------------------------+
        | Condition: >= 3 independent tasks  |
        |                                    |
        | Use Skill tool:                    |
        | - skill: "engineering-plan-writer" |
        | - args: "<featureID>"              |
        |                                    |
        | Artifact: PLAN.md (bite-sized)     |
        | → feature-implementer activates    |
        |   SDD mode (per-task subagent +    |
        |   2-stage review) automatically    |
        |                                    |
        | < 3 tasks:                         |
        | → Skip PLAN.md, inline TDD mode    |
        +------------------------------------+
        v PLAN.md created → Step 4 (SDD) / Skipped → Step 4 (Inline)

Step 3.6: Git worktree preparation - Mandatory
        +------------------------------------+
        | Establish GitHub Flow branch name  |
        | Worktree path: .worktrees/<branch> |
        |                                    |
        | Mandatory deliverables:            |
        | - .worktrees/<branch>/PLAN.md      |
        | - CONTEXT.json execution.worktree  |
        |                                    |
        | execution.worktree required fields:|
        | branch, worktree_path, plan_path,  |
        | status, last_updated, handoff      |
        +------------------------------------+
        v Worktree prepared → Step 4

Step 4: Begin Implementation (Sequential or SDD Mode)
        +------------------------------------+
        | Batch parallel implementation      |
        | → Batch 1: Type+Zod+API (Parallel) |
        | → Batch 2: Custom Hook (Sequential)|
        | → Batch 3: Component (Sequential)  |
        | → Batch 4: Test (Sequential)       |
        +------------------------------------+
        v Write code + tests following SPEC FR order

Step 4.5: Run /code-review --fix - CODE CLEANUP (Replaces de-sloppify, 2026-05-27) <!-- retired-ref-ok: history note replacing de-sloppify -->
        +------------------------------------+
        | Use Skill tool:                    |
        | - builtin: /code-review --fix      |
        |                                    |
        | Post-implementation cleanup:       |
        | - Remove console.log/debug         |
        | - Clean up unused imports          |
        | - Remove .only/.skip in tests      |
        | - Propose constants for magic nums |
        | - Suggest concrete types for any   |
        +------------------------------------+
        v Code cleaned up

Step 4.6: Invoke feature-wiring via Skill tool - INTEGRATED
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "feature-wiring"          |
        | - args: "<featureID>"              |
        |                                    |
        | Data source integration + nav      |
        | Must run after implementation      |
        +------------------------------------+
        v Integrated wiring complete

Step 4.6: Invoke pre-quality-gate via Skill tool (QA Cycle)
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "pre-quality-gate"        |
        |                                    |
        | lint → test → architecture check   |
        | Iterate up to 5 times until pass   |
        | Same error 3 times → Halt          |
        | Proceed to Step 5 upon passing     |
        +------------------------------------+
        v QA cycle passed

Step 5: Invoke feature-status-sync via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "feature-status-sync"     |
        | - args: "<featureID>" (optional)   |
        +------------------------------------+
        v Synchronize index.md status

Step 6: Invoke priority-analyzer via Skill tool (Optional)
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "priority-analyzer"       |
        | - args: "<featureID> --apply"      |
        |                                    |
        | Execution condition:               |
        | - progress change >= 10%           |
        | - or priority.last_updated >= 14d  |
        +------------------------------------+
        v Recalculate priorities (Update CONTEXT.json)

Step 7: Invoke pre-quality-gate via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "pre-quality-gate"        |
        +------------------------------------+
        v Final quality validation
```

#### MODIFY_FEATURE Pipeline

**Important**: When an existing SPEC exists, you must run `feature-spec-updater` first. Implementation must never start without updating the SPEC.

```
Step 1: Invoke feature-spec-updater via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "feature-spec-updater"    |
        | - args: "<featureID>"              |
        +------------------------------------+
        v Load existing SPEC, analyze change scope, output diff

Step 2: Review feature-spec-updater results
        - Review SPEC changes
        - Verify added change history
        - Check cascading impact documents
        v

Step 2.5: Invoke ui-approval-gate via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "ui-approval-gate"        |
        | - args: "<featureID>"              |
        |                                    |
        | Mandatory user approval on UI diff |
        | Wireframe update + review          |
        +------------------------------------+
        v Approved → Step 3 / Rejected → Blocked

Step 3: [Built-in] Execute Readiness Gate Protocol
        +------------------------------------+
        | Direct verification without skill  |
        | → See "Readiness Gate Protocol"    |
        +------------------------------------+
        v Go → Step 4 / No-Go → Revert to Step 2.5

Step 4: Implementation + Testing (Per updated FRs in SPEC)
        v

Step 4.5: Invoke feature-wiring via Skill tool (When needed) - INTEGRATED
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "feature-wiring"          |
        | - args: "<featureID>"              |
        |                                    |
        | Execution conditions:              |
        | - New Hooks/screens added          |
        | - Data/entry points modified       |
        +------------------------------------+
        v Integration complete

Step 5: Invoke feature-status-sync via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "feature-status-sync"     |
        | - args: "<featureID>"              |
        +------------------------------------+
        v Synchronize index.md status

Step 6: Invoke priority-analyzer via Skill tool (Optional)
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "priority-analyzer"       |
        | - args: "<featureID> --apply"      |
        |                                    |
        | Execution conditions:              |
        | - progress change >= 10%           |
        | - or priority.last_updated >= 14d  |
        +------------------------------------+
        v Recalculate priorities

Step 7: Invoke pre-quality-gate via Skill tool (Optional)
        v Quality validation
```

#### BUG_FIX Pipeline

**Important**: Bug fixing follows a disciplined root-cause analysis rather than symptom-only patching.

```
Step 1: Invoke bug-fix via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "bug-fix"                 |
        | - args: "<bug symptom description>"|
        +------------------------------------+
        v Phase 1: Bug Analysis (symptom summary, locate code)
        v Phase 2: Root Cause Analysis (formulate hypotheses, verify)
        v Phase 3: Fix Implementation (regression test → code fix)
        v Phase 4: Verification Complete (full tests, lint)

Step 2: Confirm Fix Completion
        - Verify regression test addition
        - Verify full suite passes
        - Verify make q.lint passes
        v

Step 3: (Optional) Invoke pre-quality-gate via Skill tool
        +------------------------------------+
        | Use Skill tool:                    |
        | - skill: "pre-quality-gate"        |
        +------------------------------------+
        v Final quality validation (prior to commit)
```

### Phase 3: Progress Tracking

Update status upon completing each stage:

```markdown
## Progress Status

**Task**: 001-data-processing (NEW_FEATURE)

| Stage | Status | Artifact |
| -------------- | :------: | ------------------------- |
| Create CONTEXT | Done | `CONTEXT.json` |
| Create SPEC | Done | `SPEC-001.md`, `screens/` |
| Readiness Gate | Done | Go verdict |
| Implementation | Done | FR-00101~00105 complete |
| Status Sync | Progress | Updating index.md |
| Quality Check | Pending | - |

### Current Operation

feature-status-sync: Synchronizing index.md status...
```

---

## Readiness Gate Protocol (Built-in)

> **Core Question**: "Can AI safely implement this looking ONLY at this document, without asking additional questions?"

### Overview

The standalone `Readiness Gate` skill has been **integrated** into `feature-pilot`.

| Integration Rationale | Effect |
| ---------------------------------- | ------------------------------ |
| Eliminates Skill tool call overhead | Improves pipeline efficiency |
| Zero context switching | Prevents information loss |
| Reduces total skill count | Lowers cognitive load in small development environments |
| Self-contained in a single skill | Simplifies management |

### Execution Timing

- **NEW_FEATURE**: Step 3 (After SPEC creation)
- **MODIFY_FEATURE**: Step 3 (After SPEC update)

> 5-Phase verification structure, output formats, and decision criteria details: See `references/readiness-gate-protocol.md`

---

## Sub-skill Invocation Rules

> **Option B Principle**: `feature-architect` is a **mandatory gate**. `spec-generator` cannot execute without `CONTEXT.json`.

| Skill | Invocation Condition | Skill Tool args | Role | Mandatory |
| ------------------------ | --------------------------------- | ---------------------------------------------- | ------------------------------------------ | :----: |
| `research-pilot` | **NEW_FEATURE Phase -1** (Conditional) | `"<feature description>"` or `"--tier <S\|M\|L\|XL>"` | **Product Discovery** | Conditional |
| `feature-architect` | NEW_FEATURE Step 1 | `(none)` or `"--quick"` | **CONTEXT.json Creation (Sole Responsibility)** | Mandatory |
| `feature-spec-generator` | NEW_FEATURE Step 2 | `"<featureID>"` | Generate SPEC from CONTEXT | Mandatory |
| `feature-spec-updater` | **MODIFY_FEATURE Step 1** | `"<featureID>"` | **Modify Existing SPEC** | Mandatory |
| `ui-approval-gate` | **Step 2.5 (After SPEC create/update)** | `"<featureID>"` | **Generate UI Wireframe + User Approval** | Mandatory |
| `bug-fix` | **BUG_FIX Step 1** | `"<bug symptoms>"` | **Bug Analysis and Fix** | Mandatory |
| `feature-wiring` | **Step 4.5 After Implementation** | `"<featureID>"` | **Data Wiring + Nav Linking** | Mandatory |
| `feature-status-sync` | **After Wiring Complete** | `"<featureID>"` (optional) | **Synchronize index.md Status** | Mandatory |
| `feature-doctor` | **On CONTEXT.json mismatch/corruption** | (none) | **State Diagnosis + Auto Repair** | Optional |
| `priority-analyzer` | **After Status Sync** (Optional) | `"<featureID> --apply"` | **Recalculate Priorities** | Optional |
| `pre-quality-gate` | After priority update | (none) | Final quality validation | Optional |
| `story-decomposer` | **After SPEC Complete** (Optional) | `"<feature name>"` or `"--format job"` | **Decompose SPEC → User/Job Stories + INVEST Validation** | Optional |

**architect mode**: Always Standard (Full context collection, up to 7 questions).

> **Note**: The Readiness Gate is **built-in**; run it directly without extra skill tool calls.

---

## User Interaction Patterns

### Minimal Input (Recommended)

```
User: "Add a data processing feature"
```

→ `feature-pilot` coordinates all pipeline stages automatically.

### Detailed Input

```
User: "In 001-data-processing, change the analysis logic to use a different AI service"
```

→ Identified as MODIFY_FEATURE, loads that SPEC and proceeds.

### Mid-flight Intervention

```
User: "Create up to the SPEC for now, do implementation later"
```

→ Switches to DOCS_ONLY, executes through the gate.

---

## Exception Handling

| Scenario | Handling |
| ------------------------------- | ------------------------------------------------- |
| **Work type ambiguous** | Present options to user |
| **Sub-skill failed** | Display error details, then retry or ask for manual intervention |
| **CONTEXT.json mismatch/corruption** | Run `feature-doctor` and retry |
| **Readiness Gate No-Go (New)** | Provide revision guidance, re-call `feature-spec-generator` |
| **Readiness Gate No-Go (Modify)** | Provide revision guidance, re-call `feature-spec-updater` |
| **User halts execution** | Save current progress and halt |
| **7-question limit reached** | Transition to `AwaitingUser`; auto-select recommended defaults for unanswered items |
| **High-risk operation (security/payments/PII)** | Halt immediately, transition to `AwaitingUser`, user confirmation mandatory |

---

## Autonomy Control Rules

> Details: See `references/autonomy-control-rules.md`

---

## AI Behavioral Guidelines

### DO

- Classify work type upon receiving a request.
- **Use the Skill tool to call sub-skills** (`feature-architect`, `feature-spec-generator`, `bug-fix`, etc.).
- **Always invoke `ui-approval-gate` after SPEC creation/update** (wireframe creation + mandatory user approval).
- **Run Readiness Gate directly after UI approval** (no separate skill call).
- Report results of each step clearly.
- Continuously update progress status.
- Summarize and communicate outputs of sub-skills.
- Guide user on expected next steps.
- **Invoke `feature-wiring` after implementation** (data source integration + navigation linking mandatory).
- **Invoke `pre-quality-gate` after wiring** (passing QA cycle mandatory).
- **Invoke `feature-status-sync` after passing QA** (synchronizing index.md status mandatory).
- **Always invoke `bug-fix` skill for BUG_FIX** (systematic bug analysis and fix).
- **Invoke `priority-analyzer` when progress changes >= 10% or priority is 14+ days stale**.
- **Utilize parallel task execution during context collection** (boost efficiency via concurrent reads).

### DON'T

- Ask the user which skill should be run.
- Start implementation directly without determining work type.
- **Execute tasks directly without invoking sub-skills** (e.g., editing SPEC without `feature-spec-updater`, fixing bugs without `bug-fix`).
- **Proceed to Readiness Gate without UI approval** (skipping `ui-approval-gate` is prohibited).
- Proceed to implementation without Readiness Gate verification (NEW_FEATURE / MODIFY_FEATURE).
- Skip intermediate steps.
- **Run `feature-status-sync` without wiring** (creates empty data / orphaned page bugs).
- **Run quality validation (`pre-quality-gate`) without status synchronization (`feature-status-sync`)**.
- **Complete bug fixes without regression tests** (enforced by `bug-fix` skill).
- **Skip `feature-architect` in NEW_FEATURE** (Option B Principle — only architect can create `CONTEXT.json`).
- **Call `feature-spec-generator` directly without `CONTEXT.json`** (violates mandatory prerequisite).

---

## Usage Examples

```bash
# Natural language request (Recommended)
"I need a feature that processes user-submitted data to produce structured results"

# Specific modification request
"Improve the quality of result text after processing in 001-data-processing"

# Bug fix request
"Fix the formatting issue on the comparison view screen"

# Research request
"Analyze data processing features in competitor products"
```

---

## Not For / Boundaries

- **Initial project setup / scaffolding**: Handled by `project-scaffolder`
- **Business analysis / Market research**: Handled by `business-analyzer`, `market-researcher`
- **Discovery / Research**: Handled by `discover`, `research-pilot` (`feature-pilot` is dedicated to development execution)
- **GTM / Pricing strategies**: Handled by `gtm-pilot`, `pricing-strategist`
- **Core brief2dev pipeline execution**: Handled by `brief2dev-orchestrator` (`feature-pilot` orchestrates development within generated projects)

---

## References

### Separated Detailed References

- [CONTEXT.json Management Protocol](references/context-management-protocol.md) - State machine, lifecycle, DoD verification
- [Efficiency and Quality Skills Protocol](references/efficiency-skills-protocol.md) - `pre-quality-gate`
- [Readiness Gate Protocol](references/readiness-gate-protocol.md) - 5-Phase verification structure, output formats, decision criteria
- [Autonomy Control Rules](references/autonomy-control-rules.md) - 7-question limit, auto-stop conditions, autonomy levels

### Core Pipeline Skills

- [Readiness Gate Detailed Checklist](references/readiness-gate-protocol.md)
- [feature-architect Skill](../feature-architect/SKILL.md)
- [feature-spec-generator Skill](../feature-spec-generator/SKILL.md) - Generate new SPECs
- [feature-spec-updater Skill](../feature-spec-updater/SKILL.md) - Modify existing SPECs
- [ui-approval-gate Skill](../ui-approval-gate/SKILL.md) - UI wireframe approval gate
- [bug-fix Skill](../bug-fix/SKILL.md) - Bug analysis and repair
- [feature-wiring Skill](../feature-wiring/SKILL.md) - Data integration + navigation linking
- [feature-status-sync Skill](../feature-status-sync/SKILL.md) - Synchronize index.md status

### Efficiency and Quality Skills

- [pre-quality-gate Skill](../pre-quality-gate/SKILL.md) - lint/test/architecture QA cycle

---

## Maintenance

- **Sources**: CLAUDE.md (feature-pilot pipeline definition), project-config.json (dynamic path resolution)
- **Last updated**: 2026-03-26
- **Known limits**: Readiness Gate's validate_spec.py supports Markdown SPECs only. JSON/YAML SPECs not supported.
