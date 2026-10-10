---
name: contract-codegen
description: |
  Automatically generate Zod schemas, type-safe API clients, and MSW mock handlers from SPEC API definitions.

  **Key Features**:
  - Extract JSON Schema from api_endpoint blocks in SPEC 0.5
  - Convert JSON Schema → Zod + derive TypeScript types
  - Generate type-safe API clients + MSW mock handlers

  Triggered by requests such as "generate contract code", "contract codegen", "generate zod".
---

# contract-codegen (Contract Code Generation)

> **Core Concept**: "Automatically generate type-safe contract code from SPEC API definitions"

Analyzes the `api_endpoint` block defined in SPEC 0.5 to automatically generate Zod schemas, TypeScript types, type-safe API clients, and MSW mock handlers from the JSON Schema. Generated code is validated against the SPEC via Zod-to-JSON Schema reverse conversion.

---

## EXECUTION PROTOCOL (RECOMMENDED)

> This skill is not on `_esp-whitelist.json#enforced_skills` (advisory W3). Print and verify the checklists below anyway — they keep contract-test evidence traceable.

### Pre-flight Checklist (Required Before Execution)

Print and verify each item in the checklist below before skill execution:

> Update each item to `[x]` or `[!]` as you verify it; fix any `[!]` before moving on.

```markdown
## Pre-flight Checklist

|  #  | Item                                                     | Status | Notes |
| :-: | -------------------------------------------------------- | :----: | ----- |
|  1  | api_endpoint block must exist in SPEC.md 0.5             |  [ ]   |       |
|  2  | api_endpoint.schema.json must be loadable                |  [ ]   |       |

> Reprint this table after checking each item (update Status column to [x]/[!])
> All items [x]: Proceed with execution / Any item [!]: Halt immediately + report reason
```

### Model Routing Policy

Delegate lightweight scanning to a faster model and keep judgment work (trade-offs, experiment design, verdicts) on the session model.

### Evidence Policy (Cache Policy)

| Validation Type  | Validity | Invalidation Condition                          | Cache Key             |
| ---------------- | :------: | ----------------------------------------------- | --------------------- |
| contract_codegen |  30 min  | When SPEC*.md or contracts/**/* has changed     | contract_codegen_hash |

**Behavior**:

1. On validation request, check `CONTEXT.json > evidence_cache`
2. Valid cache exists → Skip + use cached result
3. Cache missing/expired → Execute + cache result

### Post-flight Checklist (Required After Execution)

Print and verify the checklist below before concluding the skill:

> Update each item to `[x]` or `[!]` as you verify it; fix any `[!]` before moving on.

```markdown
## Post-flight Checklist

|  #  | Item                                                | Status | Notes |
| :-: | --------------------------------------------------- | :----: | ----- |
|  1  | tsc --noEmit compilation passes                     |  [ ]   |       |
|  2  | Zod to JSON Schema reverse conversion matches SPEC  |  [ ]   |       |

> Reprint this table after checking each item (update Status column to [x]/[!])
> All items [x]: Report completion / Any item [!]: Fix and re-verify
```

### Violation Protocol

| Violation Type           | Severity | Action                                  |
| ------------------------ | :------: | --------------------------------------- |
| Pre-flight not printed   |   LOW    | Note the gap in the report and proceed  |
| Post-flight unverified   |   HIGH   | Run validation before completion report |
| Evidence cache ignored   |  MEDIUM  | Proceed after warning                   |

---

## Core Principles

1. **SPEC-Based**: All code generation uses the `api_endpoint` definition in SPEC 0.5 as its sole input.
2. **Reverse Conversion Validation**: Reverse-converts generated Zod schemas back to JSON Schema to guarantee full consistency with the original SPEC.
3. **Custom Code Preservation**: Code between `// @custom-start` / `// @custom-end` delimiters is preserved across regenerations.

---

## Key Features

### 1. JSON Schema → Zod Conversion

**Description**: Converts JSON Schema definitions from SPEC `api_endpoint` into Zod schemas.

**Conversion Rules Table**:

| JSON Schema             | Zod                       |
| ----------------------- | ------------------------- |
| `"type": "string"`      | `z.string()`              |
| `"minLength": N`        | `.min(N)`                 |
| `"maxLength": N`        | `.max(N)`                 |
| `"pattern": P`          | `.regex(new RegExp(P))`   |
| `"format": "uuid"`      | `.uuid()`                 |
| `"format": "date-time"` | `.datetime()`             |
| `"enum": [...]`         | `z.enum([...])`           |
| `"type": "integer"`     | `z.number().int()`        |
| `"minimum": N`          | `.min(N)`                 |
| `"maximum": N`          | `.max(N)`                 |
| `"type": "object"`      | `z.object({...})`         |
| `"type": "array"`       | `z.array(...)`            |
| `"default": V`          | `.default(V)`             |
| Not in required         | `.optional()`             |

### 2. TypeScript Type Derivation

**Description**: Automatically derives TypeScript types from Zod schemas using `z.infer<>`.

```typescript
// @generated - This file was automatically generated by contract-codegen
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;
```

### 3. Type-Safe API Client Generation

**Description**: Generates type-safe API clients utilizing the Zod schemas.

### 4. MSW Mock Handler Generation

**Description**: Generates MSW mock handlers corresponding to API endpoints.

### 5. Custom Code Preservation

**Description**: Preserves custom code during regeneration using `// @generated` markers and `// @custom-start` / `// @custom-end` delimiters.

```typescript
// @generated - This file was automatically generated by contract-codegen

// Automatically generated code
export const UserSchema = z.object({ ... });

// @custom-start
// Custom validation or extensions can be added here
export const UserWithRoleSchema = UserSchema.extend({
  role: z.enum(['admin', 'user']),
});
// @custom-end
```

---

## Execution Flow

```
Pre-flight Checklist output + verification
        | (all [x])
Phase 1: SPEC Analysis (sonnet)
  - Extract json:schema/api_endpoint block from SPEC 0.5
  - Validate structure with api_endpoint.schema.json meta-schema
        |
Phase 2: Schema Generation (sonnet)
  - JSON Schema → Zod conversion (based on conversion rules table)
  - Derive TypeScript types with z.infer<>
        |
Phase 3: Client/Mock Generation (sonnet)
  - Generate type-safe API client
  - Generate MSW mock handlers
        |
Phase 4: Validation (sonnet)
  - Reverse conversion Zod → JSON Schema → verify SPEC match
  - Verify compilation with tsc --noEmit
        |
Post-flight Checklist output + verification
        | (all [x])
Completion Report + Evidence Cache
```

---

## Constraints

| Constraint                          | Rationale                                            | On Violation                      |
| ----------------------------------- | ---------------------------------------------------- | --------------------------------- |
| SPEC 0.5 api_endpoint required      | Indispensable input for code generation              | Immediately halt at Pre-flight   |
| `// @generated` marker required     | Specifies scope for automated regeneration updates   | Manual edits may be overwritten   |
| Zod ↔ JSON Schema reverse match     | Prevents drift between SPEC and implementation       | Requires fix at Post-flight       |

---

## Output Format

### On Success

```markdown
# contract-codegen Execution Completed

> **Execution Time**: {TIMESTAMP}
> **Model Usage**: sonnet(parsing) + sonnet(generation)
> **Cache Utilization**: {CACHE_HIT_RATE}

## Summary

| Item                     | Result         |
| ------------------------ | :------------- |
| Zod Schema Generation    | {N} files      |
| API Client Generation    | {N} files      |
| MSW Mocks                | {N} files      |
| tsc --noEmit             | PASS           |
| Reverse Validation       | PASS           |

## Generated Files

- contracts/schemas/{feature}.schema.ts
- contracts/client/{feature}.client.ts
- contracts/mocks/{feature}.mock.ts

## Evidence Cache

| Validation       | Cache Key             | Expiration |
| ---------------- | --------------------- | ---------- |
| contract_codegen | contract_codegen_hash | +30 min    |
```

### On Failure

```markdown
# contract-codegen Execution Failed

> **Failure Point**: {FAILURE_POINT}
> **Failure Reason**: {FAILURE_REASON}

## Recommended Actions

1. Check the JSON Schema structure of the api_endpoint block in SPEC 0.5
2. Validate consistency against api_endpoint.schema.json meta-schema
```

---

## Usage Examples

```bash
# Basic execution
/contract-codegen F001

# Ignore cache (force re-run)
/contract-codegen F001 --force
```

## Not For / Boundaries

> Explicit non-targets of this skill (R-CM-018 Rule 4 — Preventing Missing Boundaries). Detailed boundaries use frontmatter description + body trigger clause as single source of truth.

- Areas outside the triggers specified in the frontmatter description are out of scope for this skill.
- Refer to the body or MANIFEST.json for related skills / invocation chains / dependencies.
- Limited to generating Zod schemas + type-safe clients + MSW mock handlers from SPEC 0.5 api_endpoint blocks — actual API implementation and backend routes are delegated to `feature-implementer`.
- Contract test generation and execution is delegated to `contract-tester` — this skill is limited to code generation (up to IMPLEMENT in DETECT → FETCH → IMPLEMENT → CITE).
- SPEC authoring and updating belongs to `feature-spec-generator` / `feature-spec-updater` — this skill assumes SPEC is already provided.

## Maintenance

- **Sources**: brief2dev internals (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` skill conventions). External references in body.
- **Last updated**: 2026-04-11
- **Known limits**: Explicit boundaries of this skill are documented in frontmatter description (`|...`) and body.
