# UI Approval Gate — Review Templates

> SKILL.md Tier 2 reference. Phase 4 user review presentation templates (NEW_FEATURE + MODIFY_FEATURE) + Approve/Revise/Reject output formats.

## Phase 4: User Review — NEW_FEATURE Template

```markdown
---

# This will be implemented as follows. Do you approve?

> **Feature**: {feature-id} - {title}
> **Work Type**: New Feature Development
> **Revision Count**: {revision_count}/3

---

## 1. Pipeline Progress

{Phase 2 Diagram}

## 2. User Flow

{Phase 3A Flowchart}

## 3. Screen Layouts

### Screen: {screen_1_name}

{ASCII UI Layout}

### Screen: {screen_2_name}

{ASCII UI Layout}

## 4. State Variations

### Loading State

{ASCII UI}

### Empty State

{ASCII UI}

---

## Review Verdict

Please review the design above and provide your verdict:

- **Approve**: Proceed with implementation using the above design.
- **Request Revision**: Provide specific feedback (up to {3 - revision_count} revisions remaining).
- **Reject**: Halt the pipeline and revisit requirements from the SPEC.

---
```

## Phase 4: User Review — MODIFY_FEATURE Template

```markdown
---

# This will be modified as follows. Do you approve?

> **Feature**: {feature-id} - {title}
> **Work Type**: Existing Feature Modification
> **Revision Count**: {revision_count}/3
> **Modified FRs**: {modified_fr_list}

---

## 1. Pipeline Progress

{Phase 2 Diagram}

## 2. User Flow Changes

{Phase 3A Flowchart — Highlighting Changed Branches}

## 3. UI Change Comparison

{Phase 3C Before/After Comparison}

## 4. Impact Summary

| Impact Scope              | Details              |
| :------------------------ | :------------------- |
| Affected Screens          | {screen_list}        |
| Newly Added Elements      | {new_elements}       |
| Modified/Removed Elements | {modified_elements}  |
| Impact on Existing Flows  | {impact_description} |

---

## Review Verdict

Please review the changes above and provide your verdict:

- **Approve**: Proceed with implementation reflecting the proposed changes.
- **Request Revision**: Provide specific feedback (up to {3 - revision_count} revisions remaining).
- **Reject**: Halt the pipeline and revisit requirements from the SPEC.

---
```

## Output Format — Approval Report

```markdown
# UI Approval Gate - Approved

> **Feature**: {feature-id} - {title}
> **Approved At**: {YYYY-MM-DD HH:MM}
> **Revision Count**: {revision_count}/3

## Wireframe Storage Locations

- Document: `docs/wireframes/feature-{id}-wireframe.md`
- Flow SVG: `docs/wireframes/feature-{id}-flow.svg`

## Next Steps

→ Proceeding to Readiness Gate validation → Implementation stage (`feature-implementer`).
```

## Output Format — Revision Request Report

```markdown
# UI Approval Gate - Revision Requested

> **Feature**: {feature-id} - {title}
> **Revision Count**: {revision_count}/3

## Feedback Details

{User Feedback}

## Next Action

→ Regenerating wireframes incorporating user feedback.
```

## Output Format — Rejection Report

```markdown
# UI Approval Gate - Rejected

> **Feature**: {feature-id} - {title}
> **Rejection Reason**: {reason}

## Next Action

→ Pipeline halted.
→ Recommended action: Revisit SPEC requirements before re-running.
```

## Enforced Decision (After 3 Revisions)

```markdown
Revision Limit Reached (3/3)

Further revisions are inefficient. Please select a final decision:

- **Approve Current Version**: Proceed with the current wireframe design.
- **Halt Pipeline**: Re-examine SPEC requirements and restart from scratch.
```
