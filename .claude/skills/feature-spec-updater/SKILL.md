---
name: feature-spec-updater
description: |
  Skill for updating existing SPEC documents. Unlike new SPEC generation (feature-spec-generator), this skill loads existing SPECs and updates only modified sections.
  Provides change history management, diff displays, and blast radius analysis.

  Triggered by requests like "SPEC update", "update SPEC", "feature modification", "add FR", or "modify FR".
---

# Feature Spec Update

> **Core Concept**: "Tracked Modification"
> **SPEC Format**: IEEE 830 SRS + FSD/FRD unified, supporting Zero-Context implementation

A skill to safely update existing SPECs. Instead of overwriting the entire document, it **updates only changed sections** and records a full **change history**.

## Comparison: spec-generator vs. spec-updater

| Item | spec-generator | spec-updater |
| --- | --- | --- |
| **Purpose** | Generate new SPEC | Update existing SPEC |
| **Input** | `CONTEXT.json` | `CONTEXT.json` + **Existing SPEC** |
| **Output** | Full new SPEC | **Modified sections only** |
| **Revision History** | Initial version only | **Full audit trail** |
| **Overwrite Risk** | None (new file) | **Built-in overwrite prevention** |

---

## Protocol

### PATH CONTRACT (MANDATORY)

> **BINDING**: This skill uses dynamic path placeholders.
> The AI must resolve paths from `project-config.json` before performing file operations.
> Using literal paths is a **protocol violation**.

| Placeholder | Resolution Source | Default |
| --- | --- | --- |
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{DOCS_DIR}` | `project-config.paths.docs_features` | `docs/features` |

**Resolution**: `Read project-config.json → Resolve placeholders → Use resolved values`
**Fallback**: If `project-config.json` does not exist, use Default column

**FORBIDDEN**: Never use literal `src/features/` in generated code, commands, or file paths.

### Phase 0: Document & Code Loading

1. **Mandatory File Ingestion**:

   ```
   docs/features/<ID>/
   ├── CONTEXT.json          # Unified Context (SSOT)
   ├── SPEC-<ID>-*.md        # Existing SPEC (Mandatory)
   └── screens/              # Screen specifications

   Framework-specific API directory  # Mandatory when modifying §0.5
   └── [endpoint]/route.ts           # API Route code (path varies by framework)
   ```

   > **Note**: `CONTEXT.json` is the sole context SSOT.

2. **File Collection by Modification Type**:

   | Modification Type | Additional Files to Collect |
   | --- | --- |
   | §0.4 Zod Schema Updates | `{FEATURES_DIR}/*/types/*.ts` |
   | §0.5 API Contract Updates | Framework API Route files |
   | §0.6 NFR Updates | Existing SPEC performance/cost sections |
   | §0.9 Design Token Updates | Global stylesheet (e.g., `globals.css`) |

3. **Rejection if SPEC Missing**:

   ```markdown
   No existing SPEC found — Switch to spec-generator required

   `docs/features/001-user-dashboard/SPEC-*.md` does not exist.

   -> Run `/feature-spec-generator 001` first to create the initial SPEC.
   ```

### Phase 1: Change Scope Analysis

1. **Determine Modification Type**:

   | Modification Type | Trigger Signal | Scope of Impact | Affected Section |
   | --- | --- | --- | --- |
   | **Project Context Update** | Naming rule changes | AI implementation contract | §0.0 |
   | **Add FR** | "Add feature", "new requirement" | Generate new FR section | §2 |
   | **Modify FR** | "Change FR-XXXXX", "modify behavior"| Update specific FR only | §2 |
   | **Delete FR** | "Delete FR-XXXXX", "remove feature" | Delete FR + blast radius analysis | §2, §3 |
   | **Section 0 Updates** | Target Files, Architecture changes | AI implementation contract | §0.1–§0.3 |
   | **React Hook Spec Updates** | Lifecycle / dependency changes | Hook lifecycle | §0.2.2 |
   | **State Transitions Updates**| State machine modifications | State transition diagram | §0.2.3 |
   | **Error Handling Updates** | Error handling policy changes | 4-level error handling | §0.3 |
   | **Zod Schema Updates** | Add / modify validations | Type definitions + validations | §0.4 |
   | **API Contract Updates** | Request / Response changes | API Contract documentation | §0.5 |
   | **NFR Updates** | Performance / cost target changes | Non-functional requirements | §0.6 |
   | **AI Prompt Updates** | Prompt / response schema changes | AI Logic documentation | §0.7 |
   | **AI Safety Updates** | Validation rules / rate limits | Safety documentation | §0.8 |
   | **Design Token Updates** | Add / change theme tokens | UI consistency | §0.9 |
   | **Goals / Non-Goals Updates**| Scope expansion / reduction | Scope definition | §1.4 |
   | **Screen Flow Updates** | Navigation changes | Screen Flow diagram | §1.5 |
   | **Business Logic Updates** | Core algorithm changes | Business Rules pseudocode | §2.X |
   | **Exception Flow Updates** | Error handling adjustments | FR EF table | §2 EF |
   | **Sequence Diagram Updates** | Component flow changes | Dependency section | §3.4 |
   | **Screen Updates** | UI alterations, screen updates | Screen documentation | §4 |
   | **Test Spec Updates** | Test criteria adjustments | Verification section | §5 |
   | **Message Key Updates** | Add / modify `messages.ts` keys | Message definitions | §6 |

2. **Output Blast Radius Analysis**:

   ```markdown
   ## Change Scope Analysis

   **Request**: Switch notification mechanism from email to push notifications

   ### Impacted Items

   | Item | Current | Proposed | Affected Section |
   | --- | --- | --- | --- |
   | FR-00602 | Uses email dispatch logic | Sends push notification | §2 |
   | Zod Schema | `emailAddress` field | `pushToken` field | §0.4 |
   | Custom Hook | `useEmailNotification()` | Complete logic overhaul | §0.1 |

   ### Ripple Effects

   - Screen: Configuration UI in `notification-settings` screen
   - Test: `tests/unit/features/notification/hooks/use-push-notification.test.ts`

   ### Open Confirmations

   - [ ] Legacy user notification setting migration strategy

   Proceed with these modifications?
   ```

### Phase 2: Modification Planning

1. **Determine Update Granularity**:
   - **Atomic Update**: Single FR modified (Recommended)
   - **Batch Update**: Related cluster of FRs modified
   - **Major Update**: Entire section rewritten (Caution required)

2. **Backup Recommendation** (For Major Updates):

   ````markdown
   Major Update Detected

   This modification alters >30% of the SPEC.
   Creating a backup is recommended prior to proceeding:

   ```bash
   cp SPEC-006-payment-system.md SPEC-006-payment-system.md.bak
   ```

   Would you like to proceed?
   ````

### Phase 3: Spec Modification

1. **Apply Modifications**:
   - Preserve existing contents while editing only changed portions.
   - **Full file rewrites are strictly prohibited**.

2. **Append Change History** (At SPEC bottom):

   ```markdown
   ## Revision History

   | Version | Date | Description | Affected FRs |
   | --- | --- | --- | --- |
   | 1.0 | 2026-01-15 | Initial release | - |
   | 1.1 | 2026-01-25 | Switched from email to push notification | FR-00602 |
   ```

3. **Output in Diff Format**:

   ````markdown
   ## Changes (Diff)

   ### FR-00602: Review Interval Calculation

   ```diff
   - Dispatches notifications via email.
   - emailService.send(to, subject, body)
   + Dispatches notifications via push notifications.
   + pushService.send(token, title, message)
   ```
   ````

   ### §0.4 Zod Schema Changes

   ```diff
   import { z } from 'zod';

   export const notificationItemSchema = z.object({
   -   emailAddress: z.string().email(),
   -   emailSubject: z.string(),
   +   pushToken: z.string(),
   +   scheduledAt: z.string().datetime(),
   });

   export type NotificationItem = z.infer<typeof notificationItemSchema>;
   ```

> **Phase 4 Validation Checklist & Handover**: Read upon entering Phase 4. Details: `references/validation-checklist.md`.

> **Modification Templates and Before/After Examples**: Read when modifying specific sections. Details: `references/modification-types.md`.

## AI Behavioral Guidelines

### DO
- Read existing SPECs completely before editing
- Thoroughly analyze change scope before starting edits
- Output changes in diff format
- Always append revision history (§7)
- Validate ripple effects across dependent documents
- **On §0.0 updates, maintain glossary (`docs/glossary.md`) references**
- **On §0.2.2 updates, explicitly declare React Hook lifecycle policies**
- **On §0.2.3 updates, synchronize state transition diagrams**
- **On §0.3 updates, evaluate 4 levels (Hook / API / Component / Global)**
- **On §0.4 updates, verify Zod schema completeness**
- **On §0.5 updates, verify API Route code synchronization**
- **On §0.7 updates, specify complete prompt text without summaries**
- **On §0.8 updates, maintain rate limit policy consistency**
- **On §0.9 updates, maintain theme guide alignment**
- **On §1.4 Non-Goals additions, provide mandatory "why excluded" reasons**
- **On §1.5 updates, synchronize Screen Flow diagrams**
- **On §2 EF updates, declare explicit recovery paths**
- **On §2.X updates, synchronize Business Rules pseudocode**
- **On §3.4 updates, synchronize responsibility allocation tables**
- **On §5 updates, synchronize Test Fixtures**
- **On §6 updates, follow `messages.ts` key naming conventions**

### DON'T
- Rewrite entire SPEC files (Overwriting full files with Write tools is prohibited)
- Edit without prior scope analysis
- Reuse numbers from deleted FRs
- Omit revision history (§7)
- **Update SPEC without synchronizing actual code**
- **Duplicate glossary definitions inside SPEC §0.0**
- **Omit Error Codes updates when modifying §0.5 APIs**
- **Summarize prompt texts in §0.7**
- **Alter error handling in §0.8 without fallback strategies**
- **List "later" in §1.4 Non-Goals without rationale**
- **Omit timeout policies when updating §3.4 Sequence Diagrams**

---

## Direct CONTEXT.json Updates

> **State Transition**: `Idle` -> `SpecUpdating`
> **Reference**: `docs/_templates/context_schema.json` | `docs/_templates/context_template.json`

Directly update `CONTEXT.json` upon completion:

```markdown
## CONTEXT.json Update Actions

1. Read `docs/features/<id>/CONTEXT.json`
2. Edit:
   - `quick_resume.current_state` -> "SpecUpdating"
   - `quick_resume.current_task` -> "SPEC update complete, awaiting Readiness Gate"
   - `quick_resume.next_actions` -> ["Execute Readiness Gate", "Proceed with implementation upon Go"]
   - `quick_resume.last_updated_at` -> Current ISO timestamp
   - `artifacts.spec` -> Path to updated SPEC
   - `decisions[]` += Update decision record
   - `history[]` += State transition record
```

**Update Example**:

```json
{
  "quick_resume": {
    "current_state": "SpecUpdating",
    "current_task": "SPEC-006 update complete - Switched email to push notifications",
    "next_actions": ["Execute Readiness Gate", "Verify impacted Screen documents"],
    "last_updated_at": "2026-01-25T14:00:00+09:00"
  },
  "decisions": [
    {
      "at": "2026-01-25T14:00:00+09:00",
      "summary": "Switched notification method from email to push notifications",
      "rationale": "Implementation simplicity + user ergonomics"
    }
  ],
  "history": [
    {
      "at": "2026-01-25T14:00:00+09:00",
      "from_state": "Idle",
      "to_state": "SpecUpdating",
      "triggered_by": "feature-spec-updater",
      "note": "SPEC v1.1 - Updated FR-00602 algorithm"
    }
  ]
}
```

---

## Usage Examples

```bash
# Basic usage (Feature ID + modification description)
/feature-spec-updater 006 "Switch email notifications to push notifications"

# Add FR
/feature-spec-updater 005 --add-fr "Offline data persistence capability"

# Modify FR
/feature-spec-updater 006 --modify FR-00602 "Change notification dispatch logic"

# Zod Schema updates
/feature-spec-updater 006 --section 0.4 "Add boxLevel field"

# API Contract updates
/feature-spec-updater 002 --section 0.5 "Add confidence_score to response"

# Interactive mode
/feature-spec-updater 006
```

---

## Integration with feature-pilot

```
[feature-pilot Auto Classification]
     |
     +-- No SPEC -> /feature-spec-generator
     |
     +-- SPEC Exists -> /feature-spec-updater <-- Auto-selected
```

When `feature-pilot` classifies a request as `MODIFY_FEATURE`, this skill is automatically invoked.

---

## References

- [feature-spec-generator Skill](../feature-spec-generator/SKILL.md) - For generating new SPECs
- [feature-pilot Skill](../feature-pilot/SKILL.md) - Built-in Readiness Gate verification
- [SPEC Template v3.0](../../../docs/_templates/spec_template.md) - IEEE 830 + FSD/FRD unified
- [SPEC Section Guide v3.0](../feature-spec-generator/references/spec-sections.md) - Section authoring guide
- [CONTEXT Schema](../../../docs/_templates/context_schema.json) - Context SSOT
- [Glossary](../../../docs/glossary.md) - Referenced in §0.0; do not duplicate in-SPEC

## Not For / Boundaries

> Explicit non-targets for this skill (R-CM-018 Rule 4 — Missing Boundaries prevention). Frontmatter description + trigger clauses serve as the SSOT for boundaries.

- Areas outside the explicit triggers in frontmatter description are out of scope.
- Consult skill body or `MANIFEST.json` for call chains and dependencies.
- Handles existing SPEC updates + diff output only. New SPEC generation is delegated to `feature-spec-generator` (R-CM-019 whitelist separation).
- Code changes during implementation belong to `feature-implementer` — this skill strictly updates SPEC documents.
- SPEC validation and schema consistency are delegated to `spec-validator` — this skill is responsible only for editing and diffs.

## Maintenance

- **Sources**: brief2dev internals (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` conventions).
- **Last updated**: 2026-04-19
- **Known limits**: Explicit boundaries defined in frontmatter description (`|...`) and skill body.
