# Bug Fix Special Cases (Case 0-4)

> Reference material moved from `SKILL.md` (R-CM-019 4.2 Tier separation).
> `SKILL.md` retains only the execution contract; read this file on-demand.

## Special Case Handling

### Case 0: GitHub Issue-Based Bug Fix

When a GitHub issue URL or issue number is provided, follow the 7-step fix workflow.

> Reference: `references/fix-github-issue-protocol.md` — Detailed protocol for GitHub issue-linked bug fixing

### Case 1: When Error Logs are Available

```markdown
## Error Log Analysis

**Error Type**: [Exception / Error type]
**Location**: [Extracted from stack trace]
**Trigger Condition**: [Conditions identified from log]
```

### Case 2: When Bug is Hard to Reproduce

1. **Enhance Logging**: Add loggers at suspected code paths
2. **Narrow Down Conditions**: Test candidate conditions one by one
3. **Search Similar Cases**: Inspect other code following the same pattern
4. **When Manual Human Reproduction is Required**: If automated reproduction is impossible, guide the human tester through a structured reproduction loop via `references/hitl-loop-guide.md` + `references/hitl-loop.template.sh`.

### Case 3: When Multiple Compound Causes Exist

1. **Isolate**: Decompose into discrete individual causes
2. **Prioritize**: Fix the highest-impact cause first
3. **Sequential Fix**: Implement fixes one by one with intermediate verification

### Case 4: Bugs Originating from SPEC

When a bug originates from an error in the SPEC itself:

```markdown
SPEC Update Required

**Problem**: The behavior specified in [Section] of the SPEC conflicts with actual requirements

**Proposal**:

1. Update SPEC: `/feature-spec-updater <feature-id>`
2. Proceed with bug fix afterwards
```
