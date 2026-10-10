---
name: feature-architect
description: Takes user stories/Why/requirements/tasks as input to gather context and invokes feature-spec-generator to create SPEC.md and Screen documents. Serves as the orchestrator for intent-to-spec transformation.
---

# Feature Architect

This skill serves as an orchestrator that captures high-level user intent, analyzes context, and hands off to feature-spec-generator.

## Division of Responsibilities

> **Caution: Option B Principle**: feature-architect is the **sole entity responsible for creating CONTEXT.json**.
> feature-spec-generator executes only when CONTEXT.json exists.

```
[Intent Input]
  |  User Story / Why / Requirements / Task
  |
  v
[feature-architect] ─────────────────────┐
  |  Intent Analysis + ID Assignment + Context Gathering  |
  |  Create CONTEXT.json (Mandatory Gate)                 |
  v──────────────────────────────────────┘
[feature-spec-generator] → SPEC.md + screens/
  |  (Requires CONTEXT.json as input)
  v
[Implementation]
```

| Skill | Responsibilities | Output | Required |
| --- | --- | --- | :--: |
| **feature-architect** | Finalize intent, gather context, **create BRIEF.md + CONTEXT.json** | `BRIEF.md`, `CONTEXT.json` | Required |
| **feature-spec-generator** | Document implementation contracts based on CONTEXT + BRIEF | `SPEC.md`, `screens/*.md` | Required |

**Separation of Concerns Principles**:

- **Architect**: "What to build" (What) — Defines intent, scope, and context
- **Spec-Generator**: "How to build it" (How) — Documents implementation contracts and test criteria

---

## Execution Modes

### Standard Mode (Only Mode)

> **Objective**: Comprehensive context gathering across all features

Standard mode follows the full stages in the "Protocol" section below.

### Step: Feature Characteristics Detection

Scan the codebase and record 12 boolean characteristics in `characteristics` of CONTEXT.json.

| Characteristic | Detection Method |
| --- | --- |
| `involves_new_api` | Whether new API Route files are created |
| `involves_external_api` | Presence of external service invocation code |
| `db_schema_change` | DB migrations / schema modifications |
| `multi_screen` | 2 or more pages/screens created |
| `ai_ml_integration` | AI/ML model integration code |
| `security_sensitive` | Auth/authorization-related modifications |
| `realtime_processing` | Real-time processing such as WebSocket/SSE |
| `offline_capability` | Offline synchronization logic |
| `payment_billing` | Payment/billing related code |
| `pii_handling` | Personally Identifiable Information (PII) processing |
| `novel_domain` | Brand new domain concepts introduced to the project |
| `cross_feature_impact` | Impacts other feature directories |

**Automatic Risk Level Derivation**:
- **high**: Any of `security_sensitive`, `payment_billing`, `pii_handling` is true
- **medium**: Any of `involves_external_api`, `multi_screen`, `db_schema_change` is true
- **low**: None of the above

---

## PATH CONTRACT (MANDATORY)

> **BINDING**: This skill uses dynamic path placeholders.
> The AI must resolve paths from `project-config.json` before performing file operations.
> Using literal paths is a **protocol violation**.

| Placeholder | Resolution Source | Default |
| --- | --- | --- |
| `{FEATURES_DIR}` | project-config.paths.features | `src/features` |
| `{DOCS_DIR}` | project-config.paths.docs_features | `docs/features` |

**Resolution**: `Read project-config.json → Resolve placeholders → Use resolved values`
**Fallback**: If project-config.json does not exist, use the Default column

**FORBIDDEN**: Never use literal `src/features/` in generated code, commands, or file paths.

---

## Protocol

### Step 0: Path Resolution (Mandatory)

> Dynamically resolve project paths from project-config.json.

```
1. Read project-config.json (use defaults if not present)
2. FEATURES_DIR = paths.features (default: "src/features")
3. DOCS_DIR = paths.docs_features (default: "docs/features")
4. COMPONENT_EXT = conventions.component_extension (default: ".tsx")
5. FEATURE_LAYERS = conventions.feature_structure (default: ["types","api","hooks","components"])
```

### Step 0: Input Mode Detection

> Determine mode based on arguments content

**Freeform Mode (Default)**: Execute existing protocol directly

---

### Step 0.5: Idempotency Pre-flight

> Detect semi-completed states and safely resume

**Inspection Items**:

1. Does the target feature directory already exist?
   - `CONTEXT.json` exists → **Skip (already completed)**
   - `CONTEXT.json` does not exist → **Proceed normally**

**Decision Table**:

| CONTEXT Exists? | Verdict | Action |
| :---: | :---: | --- |
| No | Normal | Full execution |
| Yes | Already Completed | Skip + informational message |

---

### Step 1: Context Analysis & ID Assignment

1. **Analyze Intent**: Extract "Why (Goal)" and "Value (User Benefit)" from user requests.

1.5. **Domain Placement** — Mandatory step, execute *before* ID assignment:

   > **Purpose**: Prevent duplicate creation of similar features and incorrect domain separation prior to ID assignment.

   1. Read `{DOCS_DIR}/domain-map.json` + `{DOCS_DIR}/index.md`. If domain-map.json is missing, copy `docs/_templates/domain_map_template.json` to initialize it (empty domains/features — init entrypoint).
   2. Compare keywords/responsibilities of new requirements against `domains[].keywords`/`responsibility` and `features[].title`.
   3. **Output the Domain Placement Verdict in table format** (do not omit):

      | Verdict | Meaning | Subsequent Action |
      | --- | --- | --- |
      | `DUPLICATE` | Identical feature already exists | Halt creation, report existing feature ID |
      | `EXTEND_EXISTING` | Extends scope of existing feature | Halt creation, report MODIFY_FEATURE rerouting to feature-pilot |
      | `NEW_IN_EXISTING_DOMAIN` | New feature within existing domain | Proceed with corresponding `domain` id |
      | `NEW_DOMAIN` | Brand new domain | Add definition to domain-map.json#domains[] then proceed |

      Output format: `Verdict / Target domain id / Compared existing feature ID list / Rationale in 1-2 sentences`.
   4. If the verdict differs from feature-pilot Phase 0's Verdict, report the discrepancy and obtain user confirmation. When discovering similar (adjacent) features, note their SPEC path for inclusion in CONTEXT.json `references.related_specs`, and candidate dependent feature IDs for `dependencies.features`.

2. **Determine Feature ID** — Mandatory step:

   > **Important**: To prevent ID collisions, you **must** execute the following command:

   ```bash
   # Mandatory execution - Check existing IDs in docs/features/
   ls -d docs/features/[0-9][0-9][0-9]-*/ 2>/dev/null | sed 's/.*\/\([0-9]\{3\}\)-.*/\1/' | sort -n | tail -1
   ```

   - **On success**: Increment the returned number (e.g., `028`) by +1 to assign the next ID (e.g., `029`)
   - **On failure/empty result**: Start with `001`
   - **Strictly forbidden**: Using arbitrary IDs without scanning the directory

   - Generate a kebab-case name for the feature (e.g., `user-dashboard`)
   - Final ID format: `XXX-feature-name` (e.g., `001-user-dashboard`)

3. **Read Template**:
   - Read `docs/_templates/context_template.json` to understand the CONTEXT structure.

### Step 2: Technical Discovery & Drafting

1. **Scan Codebase**: Use `glob` or `grep` to identify relevant existing code.
   - Relevant component/hook/API files (`{FEATURES_DIR}/<feature>/` structure)
   - Relevant API Route files (reference paths in project-config.json, framework-specific API directory)
   - Existing SPEC documents for similar features

2. **Infer Constraints**: Propose technical constraints based on the codebase.
   - *Hard Constraints (Mandatory)*: Existing schemas, core packages, architectural patterns (React Hooks, Feature-First + Simplified Clean Architecture, Zod)
   - *Soft Constraints (Recommended)*: Reuse of specific services or UI components

3. **Organize Input Information**: Organize information extracted from user input.
   - Categorize User Stories, Why, Requirements, Tasks
   - Test locations (e.g., `tests/unit/features/<feature>/hooks/<name>.test.ts`)

4. **Implicit Requirements Check**: Check domain checklist items needed for this feature that the user did not explicitly state.

   > **Principle**: Do not apply all items mechanically. Review **only items relevant** to this feature, and add omissions to `open_questions`.

   | Category | Checklist Item | Action if Applicable |
   | --- | --- | --- |
   | **API Route** | Are AI / external API calls required? | Design API Route → references.api_routes |
   | **Error / Empty States** | What is the UI when there is no data or loading fails? | Error scenarios → incorporate into requirements |
   | **Existing Feature Duplication** | Does a similar feature already exist? | Preemptively resolved via Step 1.5 Domain Placement Verdict — re-run verdict if new info surfaces |
   | **UI Flow Impact** | New panels / SSE events / state additions needed? | Feature_type classification basis → record blast radius in open_questions |

   **Output**: Omit non-applicable items. If omissions are discovered, report a summary:

   ```markdown
   Implicit requirements identified:

   - Error state: Empty state UI when data is absent is undefined → added to open_questions
   ```

5. **PRP Context Curation**:

   > **PRP = PRD + curated codebase intelligence + agent runbook**
   > Minimal sufficient context packet for AI to generate production-quality code on first pass.

   | Phase | Target | Method | Condition |
   | --- | --- | --- | --- |
   | 5a | **Codebase Patterns** | Implementation patterns of similar features (component structure, state management, API calling conventions) | Always |
   | 5b | **Library Documentation** | Query latest library APIs via context7 MCP | When `involves_external_api` or `novel_domain` is true |
   | 5c | **Existing SPEC References** | Reference patterns/structures from SPEC.md of similar features | When existing SPECs exist |
   | 5d | **Project Conventions** | Extract coding conventions from CLAUDE.md and project-config.json | Always |

   **Output**: Record curated references structurally in Section 9 (Context Map) of BRIEF.md:

   ```markdown
   ## Context Map (PRP)

   ### Codebase Patterns
   - `{FEATURES_DIR}/existing-feature/hooks/useX.ts` — reference identical pattern

   ### Library References
   - zustand v5: createStore pattern (queried via context7)

   ### Convention References
   - CLAUDE.md: Feature-First Architecture (R-CM-005)
   - project-config.json: feature_structure layers
   ```

   **Skip Condition**: For simple UI modifications (modifying 1-2 files), 5b/5c can be skipped.

6. **Feature Type Classification**: Classify feature type from intent analysis and scan results.

   > **Schema Contract**: Must be **explicitly set** by architect when creating CONTEXT per `context_schema.json`.

   | feature_type | Criteria | Example |
   | --- | --- | --- |
   | `ui_feature` | Has user-facing UI (adding/modifying panels/pages) | Dashboard panels, settings screens |
   | `backend_feature` | Server logic only (API Route, DB processing) | Rate limiting, batch processing |
   | `system_feature` | Infrastructure / platform baseline | Offline sync, push notification foundation |
   | `strategy_feature` | Business strategy (UA, retention initiatives) | A/B testing, referral programs |

   **Classification Rationale**: User input intent + codebase scan results + "UI Flow Impact" from Implicit Requirements Check.
   **Reading ui-flow.json is unnecessary** — This is a What-level (what to build) classification; detailed How-level panel placement is handled by spec-generator.

7. **Prepare `CONTEXT.json` Draft**: Prepare scan results and input information according to the CONTEXT structure.

### Step 3: Create BRIEF → Create CONTEXT → Handoff to spec-generator

> **Key Rule**: Create BRIEF.md before CONTEXT.json to preserve user intent.

1. **Create Directory**:
   - Target directory: `docs/features/<ID>-<name>/`

1.5. **Auto-register in domain-map.json**:

- Read `{DOCS_DIR}/domain-map.json` (already created/queried in Step 1.5)
- Add entry to `features[]`: `{"id": "{NNN}-{kebab-name}", "title": "{Feature Title}", "domain": "{Domain ID confirmed in Step 1.5}", "src_dir": "{FEATURES_DIR}/ directory name (null for non-code features)", "status": "planned"}`
- If verdict was `NEW_DOMAIN`, also add `{id, name, responsibility, keywords[], out_of_scope[]}` definition to `domains[]` (Optional: `aliases[]` — add for mapping if the DDD bounded_context name differs from id/name, enabling domain-boundary-coherence BC naming consistency checks)
- Update `updated_at`. **Idempotency**: Skip if already registered.
- **Example**: `{"id": "001-user-dashboard", "title": "User Dashboard", "domain": "dashboard", "src_dir": "user-dashboard", "status": "planned"}`

2. **Generate BRIEF.md** (using unified_feature_brief.md template):
   - Generate based on `docs/_templates/unified_feature_brief.md` template
   - **Section 0**: Copy user input verbatim **as-is** (editing/summarizing strictly forbidden)
   - **Section 1-7**: Reflect intent analysis + codebase scan results
   - **Section 8**: Empty Clarification Log (populated in spec-generator)
   - **Section 9**: Populate Context Map with codebase scan results
   - File path: `docs/features/<ID>-<name>/BRIEF.md`

3. **Report BRIEF Summary to User + Request Review**:

   ```markdown
   BRIEF generation complete

   **Feature ID**: 001-user-dashboard
   **Feature Name**: User Dashboard

   ### BRIEF Summary

   - **Problem**: No method to check key metrics at a glance
   - **User Stories**: 2 (US-01, US-02)
   - **Acceptance Criteria**: 3 (AC-01 ~ AC-03)
   - **Scope**: In 3 items, Out 2 items

   > Please review the BRIEF. Let me know if revisions are needed.
   > If everything looks good, we will proceed with CONTEXT.json creation + SPEC generation.
   ```

4. **Generate CONTEXT.json** (including `artifacts.brief` path):
   - Target file: `docs/features/<ID>-<name>/CONTEXT.json`
   - `artifacts.brief` → Set BRIEF.md path
   - `architecture` → Initialize to `null` (Schema contract: architect initializes to null, feature-pilot updates after Discovery Gate)
   - `traceability` → Empty initial value (populated by spec-generator)

5. **Automatically invoke feature-spec-generator**:
   - Pass gathered input information (User Stories / Why / Requirements / Tasks)
   - Pass CONTEXT.json path
   - feature-spec-generator generates SPEC.md + screens/

---

## CONTEXT.json Generation Guide

> **Reference**: Detailed schema is defined in [context_schema.json](../../../docs/_templates/context_schema.json).

Record scan results in the following format:

```json
{
  "schema_version": 8,
  "feature_id": "001-user-dashboard",
  "title": "User Dashboard",
  "feature_type": "ui_feature",
  "domain": "dashboard",
  "why": "Improve work efficiency by viewing key metrics at a glance",
  "user_story": "As a user, I want to check current status via the dashboard",
  "requirements": ["Add/remove widgets", "Favorites functionality"],
  "quick_resume": {
    "current_state": "SpecDrafting",
    "current_task": "Generating SPEC in feature-spec-generator",
    "next_actions": ["Complete SPEC.md", "Start implementation"],
    "last_updated_at": "2026-01-24T10:30:00+09:00"
  },
  "artifacts": {
    "brief": "docs/features/001-user-dashboard/BRIEF.md",
    "spec": "docs/features/001-user-dashboard/SPEC-001-user-dashboard.md"
  },
  "references": {
    "related_specs": ["docs/features/003-notification-settings/SPEC-003-notification-settings.md"],
    # Paths resolved via project-config.json paths.features (default: src/features)
    "related_code": {
      "components": ["{FEATURES_DIR}/review/components/*.tsx"],
      "hooks": ["{FEATURES_DIR}/review/hooks/*.ts"],
      "api": ["{FEATURES_DIR}/review/api/*.ts"]
    },
    "api_routes": []
  },
  "dependencies": {
    "features": ["003-notification-settings"],
    "packages": []
  },
  "assumptions": ["Can add dashboard type to existing data structures"],
  "open_questions": ["Is there a limit on maximum data sources per widget?"],
  "history": []
}
```

---

## AI Behavioral Guidelines

### DO

- **Always verify existing IDs using `ls -d docs/features/[0-9][0-9][0-9]-*/` command** (Mandatory for ID collision prevention)
- Clearly extract User Stories / Why / Requirements / Tasks from user input
- Scan codebase and reference only files that actually exist
- Explicitly record assumptions and unresolved questions (Open Questions)
- **Automatically invoke feature-spec-generator after creating CONTEXT.json**
- Record related code/spec paths in the `references` section of CONTEXT.json
- **Create BRIEF.md before CONTEXT.json**
- **Preserve raw user input in Section 0 verbatim** (editing/summarizing strictly prohibited)
- **Report BRIEF summary to user and request review**
- **Always generate §7 Definition of Done (DoD)** (Never omit even in Quick mode — verifiable test + implementation criteria; a missing §7 is a Readiness Gate No-Go)
- **Output Domain Placement Verdict in table format before ID assignment** (Step 1.5 — querying domain-map.json is mandatory; skipping it is the direct cause of duplicate features)
- **Auto-register in domain-map.json** (After creating directory, before creating BRIEF.md. Copy template if file does not exist)
- **Always set feature_type and domain** (Mandatory schema contract — never generate CONTEXT.json with null; null forces spec-generator into heuristics)

---

## Direct CONTEXT.json Creation

> **State Transition**: `Idle` → `SpecDrafting`

Upon task completion, **create CONTEXT.json by copying from template**:

```markdown
## CONTEXT.json Creation Steps

1. Copy `docs/_templates/context_template.json` → `docs/features/<id>/CONTEXT.json`
2. Set basic information:
   - feature_id → Assigned feature ID
   - title → Feature title
   - why → Why extracted from input
   - user_story → User story extracted from input
   - requirements → Requirements list extracted from input
   - feature_type → Feature type classified in Step 2, Sub-step 6
   - artifacts.brief_format_version → "v2.0" (Always align with latest template upon new creation)
3. Set quick_resume:
   - current_state → "SpecDrafting"
   - current_task → "Generating SPEC in feature-spec-generator"
   - next_actions → ["Complete SPEC.md", "Start implementation"]
   - last_updated_at → Current timestamp
4. Set references:
   - related_code → Scanned related code paths
   - api_routes → Related API routes
   - dependencies → Dependent features/packages
5. Set open_questions (if any)
6. Add first transition entry to history
7. **Invoke feature-spec-generator** → Create SPEC.md + screens/
```

---

## Usage Examples

```bash
# Start with user story
/feature-architect As a user, I want to manage my dashboard

# Provide Why and requirements together
/feature-architect --why "Increase work efficiency by 30%" --req "Add/remove/favorite widgets"

# Detailed input (multi-line)
/feature-architect
Why: Systematically manage saved items
User Story: As a user, I want to create my own dashboard
Requirements:
- Add/remove/edit widgets
- Favorites functionality
```

---

## Reference Documents

- [CONTEXT.json Schema](../../../docs/_templates/context_schema.json) - Required fields, state enum definitions
- [CONTEXT.json Template](../../../docs/_templates/context_template.json) - Initial template for copying
- [feature-spec-generator Skill](../feature-spec-generator/SKILL.md) - Responsible for SPEC generation
- [BRIEF Template](../../../docs/_templates/unified_feature_brief.md) - Initial template for BRIEF.md

## Not For / Boundaries

> Explicit non-goals for this skill (prevents R-CM-018 Rule 4 — Missing Boundaries). Refer to frontmatter description + trigger section as the single source of truth for boundaries.

- Areas outside the triggers specified in frontmatter description are not handled by this skill.
- Refer to body or MANIFEST.json for related skills / call chains / dependencies.
- This skill is responsible only for creating CONTEXT.json + BRIEF.md. Implementation contract documentation (SPEC.md/screens) is delegated to `feature-spec-generator`.
- Actual code implementation is out of scope for this skill — delegate to `feature-implementer` or `feature-pilot`.
- Modifying existing SPECs is handled by `feature-spec-updater`, and status synchronization is handled by `feature-status-sync`.

## Maintenance

- **Sources**: brief2dev internals (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` skill conventions). Refer to text for external references.
- **Last updated**: 2026-06-11
- **Known limits**: Explicit boundaries for this skill are defined in frontmatter description (`Takes user stories/Why/requirements/tasks as input to gather context and invokes feature-spec-generator to create SPEC.md and Screen documents...`) and body.
