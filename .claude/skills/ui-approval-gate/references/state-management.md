# UI Approval Gate — State Management

> SKILL.md Tier 2 reference. Phase 5 result processing + CONTEXT.json schema extensions + feature-pilot state machine integration + transition rules.

## Phase 5: Result Processing

### On Approval

```markdown
1. Update CONTEXT.json
   - ui_approval.status → "approved"
   - ui_approval.approved_at → Current timestamp
   - ui_approval.approved_by → "user" | "auto" (Phase 4.0 tier)
   - ui_approval.risk_tier → "T1" | "T2", ui_approval.tier_reasons → decide output reasons[]
   - ui_approval.revision_count → {count}
   - Record state transition in history

2. Finalize wireframe storage
   - docs/wireframes/feature-<id>-wireframe.md

3. Proceed to next stage
   - Return Go signal to feature-pilot
```

### On Revision Request

```markdown
1. Check revision count
   - revision_count < 3 → Return to Phase 3
   - revision_count >= 3 → Enforce hard decision (see review-templates.md)

2. Collect feedback
   - Solicit specific changes
   - Record revision comments

3. Regenerate wireframes
   - Apply feedback
   - Re-run Phase 4
```

### On Rejection

```markdown
1. Record rationale
   - Collect rejection reason
   - Record in CONTEXT.json

2. Update CONTEXT.json
   - ui_approval.status → "rejected"
   - ui_approval.rejected_reason → {reason}
   - current_state → "Blocked"

3. Halt pipeline
   - Return No-Go signal to feature-pilot
   - Guide next actions: SPEC review or requirements re-scoping
```

## CONTEXT.json Schema Extension

ui-approval-gate adds/updates the `ui_approval` section in `CONTEXT.json`:

```json
{
  "ui_approval": {
    "status": "pending | in_review | approved | rejected",
    "wireframe_path": "docs/wireframes/feature-xxx-wireframe.md",
    "svg_paths": {
      "flow": "docs/wireframes/feature-xxx-flow.svg",
      "pipeline": "docs/wireframes/feature-xxx-pipeline.svg"
    },
    "work_type": "NEW_FEATURE | MODIFY_FEATURE",
    "revision_count": 0,
    "revisions": [
      {
        "at": "2026-02-14T10:00:00+09:00",
        "feedback": "Make card layout slightly larger",
        "applied": true
      }
    ],
    "approved_at": null,
    "approved_by": "user | auto",
    "risk_tier": "T1 | T2",
    "tier_reasons": [{ "code": "in_structure", "detail": "..." }],
    "rejected_reason": null,
    "last_updated_at": "2026-02-14T10:00:00+09:00"
  }
}
```

### State Definitions

| State       | Description                                                 |
| :---------- | :---------------------------------------------------------- |
| `pending`   | UI approval stage not yet reached                           |
| `in_review` | Wireframe generated; awaiting user review                   |
| `approved`  | Approved — by the user (T2) or automatically (T1, `approved_by: auto`) |
| `rejected`  | User rejected; SPEC revision or re-scoping required         |

## feature-pilot State Machine Integration

Adds the `UiApproval` state into the feature-pilot state machine:

```
                          +--------------+
                          | SpecDrafting |
                          +------+-------+
                                 | spec_done
                                 v
                          +--------------+
                          | UiApproval   |  (Mandatory)
                          +------+-------+
                                 | ui_approved
                                 v
                          +--------------+
                          | Implementing |
                          +--------------+
```

### Transition Rules

| Current State  | Trigger             | Next State     | Condition                         |
| :------------- | :------------------ | :------------- | :-------------------------------- |
| SpecDrafting   | SPEC Completed      | **UiApproval** | SPEC.md, screens/*.md exist       |
| SpecUpdating   | SPEC Update Done    | **UiApproval** | SPEC diff present                 |
| **UiApproval** | UI Approved         | Implementing   | Readiness Gate Go                 |
| **UiApproval** | UI Rejected         | Blocked        | Rejection reason logged           |
| Blocked        | Questions Resolved  | UiApproval     | Restart after re-scoping/review   |

## Wireframe File Naming Conventions

```
docs/wireframes/
├── feature-{id}-wireframe.md        # Wireframe document
├── feature-{id}-flow.svg            # User flow SVG
└── feature-{id}-pipeline.svg        # Pipeline progress SVG
```
