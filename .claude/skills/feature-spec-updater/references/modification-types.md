# Detailed Modification Examples by Type (FR / Zod / API / Prompts / EF / SD)

> Reference material migrated directly from the main `SKILL.md` body (R-CM-019 4.2 Tier separation).
> Consult this file as needed when editing specific sections.

## Detailed Guidance by Modification Type

### Adding an FR

```markdown
## New FR Addition Template

### FR-XXXNN: [Feature Name]

**Priority**: P0/P1/P2
**Complexity**: Low/Medium/High

#### Description

[Feature description]

#### Acceptance Criteria (5-Column BDD Table)

| AC | Given (Precondition) | When (Action) | Then (Expected Outcome) | Verification Observation |
| :-: | --- | --- | --- | --- |
| AC1 | {Precondition} | {Action} | {Expected Outcome} | {Variable / State to Verify} |
| AC2 | {Precondition} | {Action} | {Expected Outcome} | {Variable / State to Verify} |

#### Edge Cases

- EC1: [Exceptional scenario] -> [Handling strategy]

#### AI Implementation Hint

- Target: `{FEATURES_DIR}/...`
- Pattern: [Existing code reference]
```

### Modifying an FR

1. Read existing FR section.
2. Edit only modified components (use Edit tools).
3. Record entry in Revision History.

### Deleting an FR

1. Identify FR to be deleted.
2. Check for dependent downstream FRs.
3. **Do not renumber remaining FRs** (preserve gap numbering).
4. Record "Deleted" entry in Revision History.

### Modifying Zod Schemas (§0.4)

1. Read existing §0.4 type definitions.
2. Display modified fields via diff.
3. **Verify completeness of Zod validation rules**.
4. Synchronize corresponding Custom Hooks.

```markdown
## Zod Schema Modification Example

### §0.4 Update

```diff
export const reviewItemSchema = z.object({
+   boxLevel: z.number().int().min(1).max(5),  // New
-   intervalDays: z.number().int(),             // Deprecated / Deleted
});
```

> Relevant file: Update `{FEATURES_DIR}/review/types/index.ts`
```

### Modifying API Contracts (§0.5)

1. Read existing §0.5 Request/Response schemas.
2. Display modified fields via diff.
3. **Verify completeness of Error Codes** (for new failure modes).
4. Verify synchronization against API Route code.

```markdown
## API Contract Modification Example

### Response Schema Update

```diff
{
  "data": {
-   "interval_days": { "type": "integer" },
+   "box_level": { "type": "integer", "minimum": 1, "maximum": 5 },
+   "next_review_at": { "type": "string", "format": "date-time" }
  }
}
```

> API Route sync required: Framework API Route file (e.g., `{SOURCE_ROOT}/app/api/payment-process/route.ts`)
```

### Modifying NFRs (§0.6)

1. Read existing §0.6 performance/cost targets.
2. Update modified metrics only.
3. **Maintain consistent measurement methodologies**.

### Modifying AI Logic & Prompts (§0.7)

> When modifying prompts or response schemas in AI features

1. Read existing §0.7 sections.
2. **Specify full modified prompt text** (summaries prohibited).
3. If Response Schema changes, synchronize with API Route code.
4. Update variable injection table.

```markdown
## AI Prompt Modification Example

### §0.7.2 System Prompt Update

**Coach Prompt** (Modified):
```diff
- ## Feedback Rules
- 1. Be encouraging, not critical
+ ## Feedback Rules
+ 1. Be encouraging but direct
+ 2. Always provide the grammar rule name
```

> API Route sync required: Framework API Route file (e.g., `{SOURCE_ROOT}/app/api/notification-send/route.ts`)
```

### Modifying Safety & Guardrails (§0.8)

> When modifying Rate Limits, validation guardrails, or fallback strategies

1. Read existing §0.8 sections.
2. Display modified parameters via diff.
3. **Maintain policy consistency**.

```markdown
## Rate Limit Modification Example

### §0.8.3 Rate Limiting Update

```diff
| Constraint | Free Tier | Paid Tier | On Exceeded |
- | AI Calls/Day | 50 | 500 | Daily limit notification |
+ | AI Calls/Day | 30 | 300 | Daily limit alert + upgrade CTA |
```

> Client + API Route synchronization required
```

### Modifying Goals / Non-Goals (§1.4)

> When expanding or contracting feature scope

1. Read existing §1.4 sections.
2. When adding/deleting Goals, verify alignment with associated FRs.
3. **When adding Non-Goals, specify the explicit "why excluded" rationale**.

```markdown
## Non-Goals Addition Example

### §1.4 Non-Goals Update

```diff
| Excluded Item | Rationale | Alternative |
| Data Sharing | Exceeds MVP scope | Phase 2 |
+ | AI Auto-Translation | Unresolved licensing risks | User manual entry |
```

> Direct users to Non-Goals when related out-of-scope FR requests arise
```

### Adding / Modifying Exception Flows (§2 EF)

> When modifying error handling flows

1. Read the target FR's EF table.
2. Add new exception conditions or update existing error flows.
3. **Declare explicit recovery paths**.

```markdown
## Exception Flow Modification Example

### FR-00101 EF Update

```diff
| EF | Trigger Condition | System Reaction | User Copy | Recovery Path |
| EF3 | Auth Expired | Refresh token | (Transparent) | Redirect to login on fail |
+ | EF6 | Storage Full | Error state | "Storage quota exceeded" | Cache clearing guidance |
```
```

### Modifying Sequence Diagrams (§3.4)

> When modifying component communication flows (Tier 1-2)

1. Read existing §3.4 diagrams.
2. Display modified steps via diff.
3. **Synchronize responsibility allocation table + timeout policies**.

```markdown
## Sequence Diagram Modification Example

### SD-001 Update (Adding New Step)

```diff
User          UI/Page           Custom Hook        API Route
 |               |                  |                 |
 |--[1] Input Word->|                  |                 |
 |               |--[2] addWord()-->|                 |
+|               |                  |--[2.5] aiValidate()->|
+|               |                  |<-[2.6] Validation Res-|
 |               |                  |--[3] POST /api/words->|
```

**Responsibility Allocation Table Update**:
| Step | Component | Responsibility |
| 2.5-2.6 | API Route | AI-based word validation (New) |
```
