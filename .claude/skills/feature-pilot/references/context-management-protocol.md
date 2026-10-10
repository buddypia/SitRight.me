# CONTEXT.json Management Protocol (Context Preservation)

> Detailed reference document separated from feature-pilot SKILL.md.

> **Core Objective**: "Context Loss Prevention" - Complete preservation of work state across session interruptions/resumptions and skill transitions.

### Overview

`CONTEXT.json` is the **unified context file** that tracks the entire lifecycle state of feature development.

| Item | Details |
| --- | --- |
| **Location** | `docs/features/<id>/CONTEXT.json` |
| **Schema** | `docs/_templates/context_schema.json` |
| **Template** | `docs/_templates/context_template.json` |
| **Git Tracked** | Yes (preserves state history) |

### Core Sections

| Section | Purpose | Utilization Timing |
| --- | --- | --- |
| **quick_resume** | Grasp situation in < 3 seconds | Read first upon session resumption |
| **progress** | Progress rate based on FRs | Continuously updated during implementation |
| **references** | Reference document priorities | Dynamically updated per active task |
| **decisions** | Decision history | Consulted during context restoration |
| **history** | State transition log | Debugging and audit tracking |

### State Machine

```
                          +----------+
                          |   Idle   |
                          +----+-----+
                               | start
                               v
                          +----------+
              +---------->| Briefing |
              |           +----+-----+
              |                | brief_done
              |                v
              |         +--------------+
              |         | SpecDrafting |<--------------+
              |         +------+-------+               |
              |                | spec_done             |
              |                v                       |
              |         +--------------+         +-----+-------+
              |         |  UiApproval  |         | SpecUpdating |
              |         +------+-------+         +-----+-------+
              |                | ui_approved           |
              |                v                       | update_done
              |         +--------------+               |
              |         | Implementing |<--------------+
              |         +------+-------+
              |                | impl_done
              |                v
              |         +--------------+
              |         | SyncingStatus|
              |         +------+-------+
              |                | sync_done
              |                v
              |         +-----------+
              |         | Reviewing |
              |         +-----+-----+
              |               | review_pass
              |               v
              |         +----------+
              |         |   Done   |
              |         +----------+
              |
              |  +-----------+
              +--| BugFixing | (from any state)
                 +-----------+

---------- Exceptional States ----------

+-----------------+     +--------------+     +----------+     +----------+
|  AwaitingUser   |     |   Blocked    |     |  Failed  |     | Archived |
| (7-question max |     | (unresolved  |     |(unrecov- |     | (closed) |
|  limit reached) |     |  questions)  |     | erable)  |     |          |
+-----------------+     +--------------+     +----------+     +----------+
       ^                      ^
       |                      |
       +----------------------+--- (from any state)
```

### State Descriptions

| State | Trigger Condition | Exit Condition |
| --- | --- | --- |
| **AwaitingUser** | 7-question limit reached, high-risk work (security/payments/PII) | User response received |
| **Failed** | Unrecoverable error, 3 consecutive No-Go verdicts | Manual intervention required |
| **Archived** | Explicit user request (merged/superseded/deferred/abandoned/duplicate) | Cannot be restored (create new instead) |

### State Transition Rules

| Current State | Trigger | Next State | Condition |
| --- | --- | --- | --- |
| Idle | Start work | Briefing | - |
| Briefing | CONTEXT.json complete | SpecDrafting | CONTEXT.json exists |
| SpecDrafting | SPEC.md complete | **UiApproval** | SPEC.md, screens/\*.md exist |
| **UiApproval** | UI approved | Implementing | Readiness Gate Go |
| **UiApproval** | UI rejected | Blocked | Record rejection reason |
| SpecUpdating | SPEC update complete | **UiApproval** | SPEC update complete |
| Implementing | Implementation complete | SyncingStatus | Tests pass |
| BugFixing | Bug fix complete | SyncingStatus | Regression tests pass |
| SyncingStatus | Sync complete | Reviewing | index.md updated |
| Reviewing | DoD verification pass | Done | DoD verdict = passed |
| _Any_ | Unresolved question | Blocked | Add to open_questions |
| Blocked | Question resolved | previous_state | Question resolved |
| _Any_ | **7-question limit reached** | **AwaitingUser** | question_count >= 7 |
| _Any_ | **High-risk work (security/payments/PII)** | **AwaitingUser** | Auth/permissions/PII/payments related |
| AwaitingUser | User response received | previous_state | - |
| _Any_ | **3 consecutive No-Go verdicts** | **Failed** | Consecutive failure count >= 3 |
| _Any_ | **Unrecoverable error** | **Failed** | Fatal error occurred |
| Failed | Manual intervention | Idle | Admin reset |
| Done | Archive request | **Archived** | Explicit user request |
| Blocked | Archive request | **Archived** | Explicit user request |
| Failed | Archive request | **Archived** | Explicit user request |

### CONTEXT.json Lifecycle

#### 1. At Work Start (Load or Create)

```markdown
## CONTEXT.json Check

1. Check existence of `docs/features/<id>/CONTEXT.json`
2. If exists:
   - Read quick_resume section to grasp current state immediately
   - Check lock.locked → warn if locked
   - Check references.current_focus → identify documents to reference
3. If absent:
   - Copy `docs/_templates/context_template.json` to create new file
   - Initialize feature_id, title, why, success_criteria
```

#### 2. Lock Acquisition

```json
{
  "execution": {
    "lock": {
      "locked": true,
      "locked_by": "claude-session-20260211-1430",
      "locked_at": "2026-02-11T14:30:00+09:00",
      "lock_expires_at": "2026-02-11T15:00:00+09:00"
    }
  }
}
```

**Lock Rules**:

- Acquire lock at work start (`lock_expires_at` = `locked_at` + 30 min)
- If lock exists but `lock_expires_at` < current time → **treat as stale lock**, force release and acquire new lock
- Release explicitly on work completion/interruption

#### 3. State Transition

Record in `history` on every state change:

```json
{
  "history": [
    {
      "at": "2026-02-11T14:35:00+09:00",
      "from_state": "Briefing",
      "to_state": "SpecDrafting",
      "triggered_by": "feature-spec-generator",
      "note": "SPEC-001.md authoring complete"
    }
  ]
}
```

#### 4. Decision Logging

Append to `decisions` whenever key decisions occur:

```json
{
  "decisions": [
    {
      "at": "2026-02-11T15:00:00+09:00",
      "summary": "Selected React Hooks for state management (instead of Zustand)",
      "rationale": "Lightweight fit for project scale + consistency with existing patterns"
    }
  ]
}
```

#### 5. Open Questions

Transition condition to Blocked:

```json
{
  "open_questions": [
    {
      "id": "Q1",
      "question": "What is the cache retention duration for processing results?",
      "status": "open",
      "impact": "API design + storage design",
      "resolution": null
    }
  ]
}
```

#### 6. At Work Completion

> **CHECKLIST UPDATE RULE (MANDATORY)**:
> Upon verifying each item, re-output the entire checklist updating `[ ]` to `[x]`.
> Proceed to next step only after verifying all items are `[x]`. Proceeding un-updated = Protocol Violation (severity: HIGH).

```markdown
## Completion Checklist

- [ ] current_state → Done
- [ ] lock.locked → false
- [ ] Final review of touched_files list
- [ ] Add completion record to history
```

### Direct CONTEXT.json Updates from Sub-skills

Each sub-skill **directly updates CONTEXT.json** upon completing work:

```
// Each skill reads, modifies, and saves CONTEXT.json directly:
Read docs/features/<id>/CONTEXT.json
Edit:
  - quick_resume.current_state → new state
  - quick_resume.current_task → next task
  - quick_resume.next_actions → next actions
  - quick_resume.last_updated_at → current timestamp
  - progress.details.FR-XXXNN → update progress status
  - history[] → add state transition record
```

**Example: Upon feature-spec-generator Completion**

```json
{
  "quick_resume": {
    "current_state": "SpecDrafting",
    "current_task": "Awaiting Readiness Gate verification",
    "next_actions": ["Execute Readiness Gate", "Start implementation upon Go verdict"],
    "last_updated_at": "2026-02-11T14:35:00+09:00"
  },
  "progress": {
    "percentage": 10,
    "fr_total": 5,
    "fr_completed": 0,
    "fr_in_progress": 0
  },
  "history": [
    {
      "at": "2026-02-11T14:35:00+09:00",
      "from_state": "Briefing",
      "to_state": "SpecDrafting",
      "triggered_by": "feature-spec-generator",
      "note": "SPEC-001.md authoring complete"
    }
  ]
}
```

**Example: Updating architecture after Discovery Gate (Phase 0) Completion**

```json
{
  "architecture": {
    "domain_model": {
      "path": "docs/features/001-user-dashboard/DOMAIN-MODEL.md",
      "bounded_contexts": ["DashboardManagement"],
      "ubiquitous_language_count": 12,
      "generated_at": "2026-02-11T10:00:00+09:00"
    },
    "adr": null,
    "system_design": null,
    "discovery_gate": {
      "verdict": "Go",
      "verified_at": "2026-02-11T10:30:00+09:00",
      "blocking_count": 0,
      "warning_count": 0
    },
    "risk_level": "medium"
  }
}
```

> **Schema Contract**: `architecture` is initialized to null by `feature-architect` and updated with actual artifact paths by `feature-pilot` after passing Discovery Gate. Retains null throughout for low-risk features (Phase 0 skipped).

**Example: Transition to Archived**

```json
{
  "quick_resume": {
    "current_state": "Archived",
    "current_task": "",
    "next_actions": [],
    "last_updated_at": "2026-02-11T16:00:00+09:00"
  },
  "archived_reason": "superseded",
  "archived_ref": "046-user-dashboard-v2"
}
```

> **Schema Contract**: `archived_reason` is enum `["merged", "superseded", "deferred", "abandoned", "duplicate"]`. `archived_ref` is mandatory only when `archived_reason` is "merged" or "superseded".

### Blocked State Recovery Protocol

```markdown
## Recovery from Blocked State

1. Review items in `open_questions` where status="open"
2. Present question list to user
3. Upon receiving response:
   - status → "resolved"
   - Record response in resolution field
4. When all questions are resolved:
   - current_state → previous_state
   - previous_state → null
```

### Reviewing Stage (DoD Verification + Quality Verification)

> **SSOT Principles**:
>
> - Quality verification rules → `Makefile`
> - Completion criteria definition → `BRIEF §7`
> - Completion criteria tracking → `CONTEXT.json completion_contract`
> - Common Base DoD → `.claude/pipelines/*.yaml base_dod`

**Execution Sequence**:

1. **Initialize completion_contract** (if uninitialized):
   - `completion_contract.work_type` → Work type determined in Phase 0 ("NEW_FEATURE" | "MODIFY_FEATURE" | "BUG_FIX")
   - Load Base DoD corresponding to work_type from pipeline YAML `base_dod`
   - Read BRIEF §7, append Feature-Specific items (§7.1)
   - Record `completion_contract` section in CONTEXT.json
   - Fallback: If §7 absent → success_criteria → Base DoD only

2. **Automated Verification of Machine-Verifiable Items**:

   ```bash
   Bash: make q.check
   ```

   - Leverage existing Evidence Cache (30 min TTL)
   - Update status of each item to passed/failed
   - Record command results in evidence

3. **Verification of AI-Verifiable Items**:
   - Compliance check between SPEC §0 and implemented code
   - Verify presence of JSDoc comments (exported functions)
   - Record verification rationale in evidence

4. **Confirmation of Human-Verifiable Items** (if any):
   - Request user confirmation → transition to AwaitingUser

5. **Determine verdict**:
   - All passed → verdict = "passed" → transition to Done
   - Machine/AI failed items exist → verdict = "failed" → revert to implement
   - Human pending items only → verdict = "partial" → transition to AwaitingUser

6. **Recalculate summary + Update CONTEXT.json**:
   - Recalculate total / passed / failed / skipped / pass_rate in `completion_contract.summary`
   - Update `completion_contract.last_verified_at` to current timestamp
   - `current_state` → Done (when verdict = passed)
   - Add completion record to `history`
