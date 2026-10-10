# {NNN}: {Feature Name}

> **Status**: {STATUS} ({PROGRESS}%) | **Priority**: {PRIORITY} | **Last Updated**: {DATE}
> **SPEC Version**: v3.5 (2026-01-28) - §0.2 State & Architecture reorganization (prescriptive → principle-based), enhanced AI design autonomy
> **Tier**: {1/2/3} - {High/Med/Low Risk} | **Feature Type**: {UI-Only / API-Integrated / AI-Powered / Billing}
>
> ⚡ **Quick Reference**: See [matrix at bottom of document](#tier-selection-matrix) for mandatory sections per Tier/Feature Type

---

## 0. AI Implementation Contract (Mandatory)

> **Purpose**: Provide core information AI needs before starting implementation at a single glance
> **Principle**: Information AI must "guess" = 0

### 0.0 Project Context (v3.1 Lightweight)

> **SSOT**: [docs/technical/project-context.md](../../technical/project-context.md)
> **Principle**: Refer to the above document for shared conventions; document **only diffs (overrides unique to this feature)** in this SPEC

#### 0.0.1 Shared Convention Compliance Verification

<!-- Verify against shared conventions before writing -->

- [ ] Naming: Follow [project-context.md §1](../../technical/project-context.md#1-naming-conventions)
- [ ] Provider: Refer to [project-context.md §2](../../technical/project-context.md#2-provider-specifications)
- [ ] Error Handling: Follow [project-context.md §3](../../technical/project-context.md#3-error-handling)
- [ ] Design Tokens: Use [project-context.md §4](../../technical/project-context.md#4-design-tokens)

#### 0.0.2 Feature-Specific Overrides

<!-- Document only differences from shared conventions. If none, state "Follows shared conventions verbatim" -->

| Item | Override vs Shared Convention | Rationale |
| ---- | ----------------------------- | --------- |
| {Item} | {Override content} | {Why different} |

**Follows shared conventions verbatim**: {If no overrides, keep only this line and remove table above}

#### 0.0.3 Feature-Specific Glossary

> **Global Glossary**: [docs/glossary.md](../glossary.md)
> Below defines only terms **newly introduced or uniquely used** in this feature

| Term | Definition | Code Representation |
| ---- | ---------- | ------------------- |
| {Term1} | {Definition} | `{ClassName}` |

<!-- If no unique terms, note "N/A - Refer to global glossary" -->

> ℹ️ When adding terms: Register in glossary.md first → reference from SPEC

### 0.1 Target Files (v3.1 Scope-Based)

> **v3.1 Change**: Use **Glob patterns** instead of hardcoded specific file paths
> **SSOT**: CONTEXT.json `references.related_code` manages the active file list
> **Purpose**: Flexible scope definition + conditional file support

| Layer | Scope (Glob) | Action | Condition | Notes |
| ----- | ------------ | :----: | --------- | ----- |
| Type | `src/features/{feature}/types/**` | 🆕 | - | TypeScript interface + Zod schema |
| Hook | `src/features/{feature}/hooks/**` | 🆕 | - | Custom Hook (state management) |
| API | `src/features/{feature}/api/**` | 🆕 | - | Data fetch / API calls |
| Component | `src/features/{feature}/components/**` | 🆕 | - | UI Components (.tsx) |
| Test | `tests/unit/features/{feature}/**` | 🆕 | - | Unit tests (Vitest) |
| API Route | `{API_ROUTES_DIR}/{name}/**` | ⚡ | When API needed | Conditional |

**Action Types**: 🆕 Create New / 🔄 Modify Existing / ⚡ Conditional

#### 0.1.1 Traceability Matrix

> **Verification**: Every FR-ID must connect to at least 1 implementation file and 1 test file
> **Post-Implementation**: Auto-extraction from CONTEXT.json references recommended upon completion

| FR-ID | Implementation Files (within Glob) | Test Files | Verification Status |
| :---: | ---------------------------------- | ---------- | :-----------------: |
| FR-{NNN}01 | `{file1}`, `{file2}` | `{test1}` | ⬜ |
| FR-{NNN}02 | `{file3}` | `{test2}` | ⬜ |

<!--
Traceability Rules:
- Every FR connects to at least 1 implementation file
- Every FR connects to at least 1 test (except Tier 3)
- When modifying implementation files, annotate related FR-ID: // FR-{NNN}XX
- Detailed file list is managed in CONTEXT.json references (SSOT)
-->

### 0.2 State & Architecture (v3.5 Reorganized)

> **v3.5 Change**: Prescriptive Provider list → Principle-based guidelines
> **Reference**: [spec-sections.md §0.2](../_templates/../.claude/skills/feature-spec-generator/references/spec-sections.md)

#### 0.2.1 Core State (Mandatory)

> **Purpose**: Define core state elements AI must manage
> **Principle**: State structure is explicit, but implementation file count is decided by AI via SRP

| State Element | Type | Required | Purpose | Initial Value |
| ------------- | ---- | :------: | ------- | ------------- |
| `items` | `{Entity}[]` | ✅ | Data catalog / list | `[]` |
| `status` | `ScreenStatus` | ✅ | Idle/Loading/Data/Empty/Error | `'idle'` |
| `error` | `Error \| null` | ⚪ | Error information | `null` |
| `{filter}` | `{FilterType} \| null` | ⚪ | Filter condition | `null` |

**State Type Definitions**:

```typescript
type ScreenStatus = 'idle' | 'loading' | 'data' | 'empty' | 'error';
```

**Derived State (if applicable)**:
| Derived State | Formula | Purpose |
|----------|--------|------|
| `hasData` | `status == data && items.isNotEmpty` | Data display condition |
| `filteredItems` | `filter?.apply(items) ?? items` | Filtered list |

#### 0.2.2 Architecture Guidance (Guidelines)

> **Purpose**: Guide AI to autonomously separate files based on SRP
> **Core**: Provide separation criteria and naming conventions instead of a rigid file list

**Custom Hook Separation Criteria** (Details: spec-sections.md §0.2.2):

| Condition | Recommended Approach |
| --------- | -------------------- |
| Single screen, simple CRUD | Single Custom Hook |
| 2+ screens (List/Detail) | Screen-specific Custom Hook separation |
| Complex form validation | Dedicated Form Custom Hook |
| State shared across screens | State Management Provider pattern (e.g. React Context) |

**Service Separation Criteria**:

| Condition | Recommended Approach |
| --------- | -------------------- |
| Simple DB CRUD | 1 Service |
| External API integration (Email, AI, etc.) | Service separation per external API |
| Complex business logic | Domain Service separation |

**Naming Conventions (Mandatory)**:

| Target | Pattern | Example |
| ------ | ------- | ------- |
| Hook (List) | `use{Feature}List` | `useReportList` |
| Hook (Detail) | `use{Feature}Detail` | `useReportDetail` |
| Hook (Single) | `use{Feature}` | `useReport` |
| API Function | `{feature}-api.ts` | `report-api.ts` |
| Component | `{Feature}Panel.tsx` | `ReportPanel.tsx` |

**Hooks Guidelines**:

| Scenario | Recommended Pattern |
| -------- | ------------------- |
| Per-screen state (Default) | `useState` / `useReducer` (local) |
| App-wide global state (Filter, Settings) | State Management Provider pattern (e.g. React Context) |
| Detail screen (with parameters) | `useParams` + custom hook |

<!-- For Tier 3, replace with:
**§0.2 State & Architecture**: Reuse existing `use{Feature}`, modify only {layer} (maintain single Hook)
-->

#### 0.2.3 State Transitions (v3.0 New)

```
┌─────────┐     {Event}      ┌─────────┐
│ Initial │ ───────────────> │ Loading │
└─────────┘                  └────┬────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │ Success           │ Failure           │ Cancel
              ▼                   ▼                   ▼
        ┌─────────┐         ┌─────────┐         ┌─────────┐
        │  Data   │         │  Error  │         │ Initial │
        └─────────┘         └─────────┘         └─────────┘
```

<!-- For Tier 3, replace with:
**N/A** - State transition diagram omitted for Tier 3 feature
-->

### 0.3 Error Handling Policy (v3.0 Enhanced)

#### 0.3.1 Error Classification

| Error Type | Code | HTTP | Cause |
| ---------- | :--: | :--: | ----- |
| `NetworkError` | `E001` | - | Connection failure / timeout |
| `AuthError` | `E002` | 401 | JWT expired / invalid |
| `ValidationError` | `E003` | 400 | Input validation failure |
| `NotFoundError` | `E004` | 404 | Resource not found |
| `RateLimitError` | `E005` | 429 | Rate limit exceeded |
| `ServerError` | `E006` | 500 | Internal server error |

#### 0.3.2 User-Facing Messages

| Error Type | UI Presentation | Message (Message Key) | Retry |
| ---------- | --------------- | --------------------- | :---: |
| `NetworkError` | SnackBar + Retry | `error_networkRetry` | ✅ |
| `AuthError` | Dialog → LoginPage | `error_sessionExpired` | ❌ |
| `ValidationError` | Inline (below field) | `error_invalidInput` | ❌ |
| `NotFoundError` | EmptyState component | `error_notFound` | ❌ |
| `RateLimitError` | SnackBar | `error_tooManyRequests` | ✅ (after 30s) |
| `ServerError` | SnackBar + Retry | `error_serverError` | ✅ (max 2 retries) |

#### 0.3.3 Recovery Paths

| Error Type | Recovery Route | Preserve State |
| ---------- | -------------- | :------------: |
| `NetworkError` | Retry button → Re-invoke same API | ✅ |
| `AuthError` | Redirect to LoginPage | ❌ |
| `ValidationError` | Focus field + show error | ✅ |

#### 0.3.4 Logging Rules

| Item | Logged | Masked | Notes |
| ---- | :----: | :----: | ----- |
| Error Code / Message | ✅ | ❌ | |
| Request Parameters | ✅ | Partial | Exclude sensitive info |
| `access_token` | ❌ | - | Never log |
| `email`, `phone` | ❌ | - | PII |
| `user_id` | ✅ | ❌ | |

### 0.4 Data Schema & Security (Mandatory)

> **SSOT**: `{API_ROUTES_DIR}/` is the source of truth; this section is summary + intent record.

#### 0.4.1 TypeScript Type Definitions + Zod

> **Human Summary** (Quick Reference)

| Model | Field / Type | Nullable | Notes |
| ----- | ------------ | :------: | ----- |
| `{Model}` | `id: string` | ❌ | UUID |
| | `{field}: {type}` | ⭕/❌ | {Description} |

**Machine-Verifiable JSON Schema** (spec-validator target):

<!-- The json:schema block below is automatically extracted and validated by spec-validator -->

```json:schema/typescript_type
{
  "name": "{Model}",
  "description": "{Model description}",
  "file_path": "src/features/{feature}/types/{model}.ts",
  "fields": [
    {
      "name": "id",
      "type": "string",
      "nullable": false,
      "comment": "UUID identifier"
    },
    {
      "name": "{field}",
      "type": "{Type}",
      "nullable": false,
      "json_key": "{snake_case_key}",
      "comment": "{Description}"
    }
  ],
  "zod_schema": true
}
```

> ℹ️ **Meta Schema**: [schemas/typescript_type.schema.json](./schemas/typescript_type.schema.json)

#### 0.4.2 Backend Schema

> **Human Summary** (Quick Reference)

##### Entity: `{entity_name}`

| Field | Type | Nullable | Default | Constraints |
| ----- | ---- | :------: | ------- | ----------- |
| `id` | string | ❌ | UUID | PK |
| `userId` | string | ❌ | - | FK, INDEX |
| `{field}` | {type} | ⭕/❌ | {default} | {constraints} |
| `createdAt` | Date | ❌ | `now()` | INDEX |
| `updatedAt` | Date | ❌ | `now()` | |

**Machine-Verifiable JSON Schema** (spec-validator target):

<!-- The json:schema block below is automatically extracted and validated by spec-validator -->

```json:schema/backend_entity
{
  "entity": "{entity_name}",
  "description": "{Entity description}",
  "fields": [
    {
      "name": "id",
      "type": "string",
      "nullable": false,
      "default": "UUID",
      "constraints": ["PK"]
    },
    {
      "name": "userId",
      "type": "string",
      "nullable": false,
      "constraints": ["FK", "INDEX"]
    },
    {
      "name": "{field}",
      "type": "{type}",
      "nullable": false,
      "default": "{default}",
      "constraints": ["{constraint}"],
      "comment": "{Description}"
    },
    {
      "name": "createdAt",
      "type": "Date",
      "nullable": false,
      "default": "now()",
      "constraints": ["INDEX"]
    },
    {
      "name": "updatedAt",
      "type": "Date",
      "nullable": false,
      "default": "now()"
    }
  ]
}
> ℹ️ **Meta Schema**: [schemas/backend_entity.schema.json](./schemas/backend_entity.schema.json)

#### 0.4.3 Authorization Policy

##### Authorization: `{entity_name}`

| Action | Policy Name | Condition | Notes |
| ------ | ----------- | --------- | ----- |
| READ | `user_can_read_own` | `session.userId === record.userId` | Own data only |
| CREATE | `user_can_create_own` | `session.userId === input.userId` | |
| UPDATE | `user_can_update_own` | `session.userId === record.userId` | |
| DELETE | `user_can_delete_own` | `session.userId === record.userId` | |

**Security Considerations**:

- PII Inclusion: ❌ None / ⭕ Present → {Encryption policy}

### 0.4.5 Write Operations (v3.4 New)

> **Purpose**: Specify how each API/event mutates data (CQRS Command perspective)
> **SSOT**: §0.5 API Contract + §0.4.2 DB Schema touchpoints

<!-- For UI-Only features without write operations, replace with:
**N/A** - Read-only feature (no write operations)
-->

#### 0.4.5.1 Operation Mapping (API → DB Mutation)

| API / Event | Action | Table | Mutated Fields | Condition | Side Effects |
| ----------- | :----: | ----- | -------------- | --------- | ------------ |
| `{API endpoint}` | INSERT | `{table}` | `{fields}` | - | {Side effects} |
| `{API endpoint}` | UPDATE | `{table}` | `{fields}` | RLS Passed | - |
| `{API endpoint}` | SOFT DELETE | `{table}` | `deleted_at` | RLS Passed | {Cleanup action} |

**Operation Type Examples**:

| Action | Description |
| :----: | ----------- |
| INSERT | Create new record |
| UPDATE | Modify existing record |
| UPSERT | Update if exists, insert if not |
| SOFT DELETE | Logical delete (set `deleted_at`) |
| HARD DELETE | Physical delete |

#### 0.4.5.2 Transaction Boundaries

| Operation Group | Included Operations | Transaction Scope | Isolation Level |
| --------------- | ------------------- | :---------------: | --------------- |
| {Op 1} | {Operation list} | Single / Batch | READ COMMITTED |
| {Op 2} + {Op 3} | {Operation list} | **Single Transaction** | {Isolation Level} |

**Rollback Conditions**:

| Transaction | Rollback Trigger | Rollback Scope | User Message |
| ----------- | ---------------- | -------------- | ------------ |
| {Op Group} | {Condition} | Full / Partial | {Message or Message Key} |

**Partial Failure Strategy**:

- [ ] All-or-Nothing: Rollback entire transaction if any operation fails
- [ ] Best-Effort: Commit successful operations, rollback failed only
- [ ] Compensating: Recover via compensating transaction

#### 0.4.5.3 Idempotency Guarantee

| API | Idempotency | Strategy | Key |
| --- | :---------: | -------- | --- |
| `GET {endpoint}` | ✅ Naturally Idempotent | - | - |
| `POST {endpoint}` | ⚠️ Non-Idempotent | Idempotency Key | `X-Idempotency-Key` |
| `PATCH {endpoint}` | ✅ Idempotent | - | `id` (path param) |
| `DELETE {endpoint}` | ✅ Idempotent | - | `id` (path param) |

#### 0.4.5.4 Audit Policy

| Operation Type | Audit Log | Preserved Info | Retention Period |
| -------------- | :-------: | -------------- | ---------------- |
| CREATE | ⭕/❌ | `user_id`, `table`, `record_id`, `new_value` | {Period} |
| UPDATE | ⭕/❌ | Above items + `old_value` | {Period} |
| DELETE | ⭕/❌ | Above items + `deletion_reason` | {Period} |

**Sensitive Data Handling**:

| Field Type | Handling Method |
| ---------- | --------------- |
| PII (Personal Data) | Masked: `j***@example.com` |
| Passwords / Tokens | Not stored: `[REDACTED]` |
| General Data | Preserved verbatim |

**Machine-Verifiable JSON Schema** (spec-validator target):

```json:schema/write_operations
{
  "feature_id": "{NNN}",
  "operations": [
    {
      "api": "{METHOD} {path}",
      "action": "{INSERT|UPDATE|UPSERT|SOFT_DELETE|HARD_DELETE}",
      "table": "{table_name}",
      "fields": ["{field1}", "{field2}"],
      "condition": "{RLS condition or null}",
      "side_effects": ["{side effect 1}", "{side effect 2}"]
    }
  ],
  "transactions": [
    {
      "name": "{transaction group name}",
      "operations": ["{op1}", "{op2}"],
      "isolation_level": "READ_COMMITTED",
      "rollback_triggers": ["{condition1}"],
      "rollback_scope": "ALL|PARTIAL",
      "partial_failure_strategy": "ALL_OR_NOTHING|BEST_EFFORT|COMPENSATING"
    }
  ],
  "idempotency": {
    "non_idempotent_apis": ["{POST endpoint}"],
    "strategy": "IDEMPOTENCY_KEY|UPSERT|NONE",
    "key_header": "X-Idempotency-Key",
    "ttl_hours": 24
  },
  "audit": {
    "enabled": true,
    "operations": ["CREATE", "UPDATE", "DELETE"],
    "retention_days": 90,
    "pii_masking": true
  }
}
```

> ℹ️ **Meta Schema**: [schemas/write_operations.schema.json](./schemas/write_operations.schema.json)

### 0.5 API Contract (Mandatory)

> **SSOT**: `{API_ROUTES_DIR}/{name}/route.{LANG_EXT}` `responseSchema` is the source of truth
> **Separation Criteria**: 3+ endpoints or section > 100 lines → Separate into standalone `API-{NNN}.md`

#### Endpoint Catalog (Human Summary)

| ID | Method | Path | Auth | Description |
| -- | ------ | ---- | :--: | ----------- |
| API-{NNN}-01 | POST | `/api/{name}` | ✅ | {Description} |

#### API-{NNN}-01: {name}

**Request Schema**:

```json
{
  "type": "object",
  "required": ["field1"],
  "properties": {
    "field1": { "type": "string", "description": "{Description}" },
    "field2": { "type": "integer", "description": "{Description}" }
  }
}
```

**Response Schema**:

```json
{
  "type": "object",
  "required": ["status"],
  "properties": {
    "status": { "type": "string", "enum": ["ok", "error"] },
    "data": { "type": "object", "description": "{Description}" },
    "error": {
      "type": "object",
      "properties": {
        "code": { "type": "string" },
        "message": { "type": "string" }
      }
    }
  }
}
```

**Error Codes**:

| HTTP | Code | Condition | Client Action |
| :--: | ---- | --------- | ------------- |
| 400 | `INVALID_INPUT` | Required field missing | Show input validation |
| 401 | `UNAUTHENTICATED` | JWT missing / expired | Prompt re-login |
| 403 | `FORBIDDEN` | RLS violation | Show permission error |
| 429 | `RATE_LIMITED` | Rate limit exceeded | Backoff and retry |
| 500 | `INTERNAL_ERROR` | Server error | Retry (max 2 times) |

**Machine-Verifiable JSON Schema** (spec-validator target):

```json:schema/api_endpoint
{
  "id": "API-{NNN}-01",
  "method": "POST",
  "path": "/api/{name}",
  "description": "{API Description}",
  "auth": true,
  "request": {
    "type": "object",
    "required": ["field1"],
    "properties": {
      "field1": { "type": "string", "description": "{Description}" },
      "field2": { "type": "integer", "description": "{Description}" }
    }
  },
  "response": {
    "type": "object",
    "required": ["status"],
    "properties": {
      "status": { "type": "string", "enum": ["ok", "error"] },
      "data": { "type": "object" },
      "error": {
        "type": "object",
        "properties": {
          "code": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    }
  },
  "errors": [
    { "http": 400, "code": "INVALID_INPUT", "condition": "Required field missing", "client_action": "Show input validation" },
    { "http": 401, "code": "UNAUTHENTICATED", "condition": "JWT missing / expired", "client_action": "Prompt re-login" },
    { "http": 403, "code": "FORBIDDEN", "condition": "RLS violation", "client_action": "Show permission error" },
    { "http": 429, "code": "RATE_LIMITED", "condition": "Rate limit exceeded", "client_action": "Backoff and retry" },
    { "http": 500, "code": "INTERNAL_ERROR", "condition": "Server error", "client_action": "Retry (max 2 times)" }
  ],
  "rate_limit": {
    "requests_per_minute": 30,
    "requests_per_day": 1000,
    "tier": "all"
  }
}
```

> ℹ️ **Meta Schema**: [schemas/api_endpoint.schema.json](./schemas/api_endpoint.schema.json)
> ℹ️ **API Route Mandatory**: Use `responseMimeType: "application/json"` + `responseSchema`

### 0.6 NFR (Non-Functional Requirements) - Mandatory

> **Purpose**: Provide explicit targets so AI can implement to quality standards

#### Performance

| Metric | Target | Measurement Method |
| ------ | ------ | ------------------ |
| **Initial Response Time** | < {N}ms | API call → first byte |
| **Total Response Time** | < {N}s (P95) | API call → complete |
| **Streaming Start** | < {N}s | (Streaming only) First chunk |

#### Concurrency

| Item | Expected Value | Notes |
| ---- | -------------- | ----- |
| **Concurrent Users** | ~{N} users | {Baseline} |
| **Per-User Frequency** | {N} req / {hour} | Average |

#### Reliability

| Item | Policy | Notes | Item | Policy | Notes |
| ---- | ------ | ----- | ---- | ------ | ----- |
| **Retries** | Max {N} times, {strategy} | {Target} | **Timeout** | {N}s | Client side |

#### Cost - AI Features Only

| Item | Ceiling | Notes |
| ---- | ------- | ----- |
| **LLM Invocations** | {N} calls / user / day | {Plan} |
| **Tokens** | Input {N}K, Output {N}K | Per request |
| **Monthly Cost** | ${N} | Total aggregate |

<!-- When AI unused, replace with:
**N/A** - AI/LLM not used
-->

#### Observability

| Item | Content |
| ---- | ------- |
| **Log Fields** | `{field1}`, `{field2}`, `{field3}` |
| **Metrics** | `{metric_name}` |
| **Alert Conditions** | {Condition} |

<!-- When only basic logging needed:
**Standard Logging Applied** - LogUtils default config
-->

### 0.7 AI Logic & Prompts (AI Features Mandatory)

> **Purpose**: Provide prompt and schema specifications so AI can implement LLM calling logic accurately
> **Applicability**: Author only for features that invoke LLMs in API Routes (if unused, note "N/A")

<!-- When AI unused, replace with 1 line below:
**N/A** - This feature does not use LLM/AI invocations
-->

#### 0.7.1 AI Role Definition

| Role | Purpose | Model |
| ---- | ------- | ----- |
| `{role_name}` | {Role description} | {model_name} |

#### 0.7.2 System Prompt

**Role: {role_name}**

```
You are {Role definition}.

## Context
- User L1: {{l1_language}}
- Learning Level: {{level}}
- {Additional context}

## Rules
1. {Rule 1}
2. {Rule 2}
3. {Rule 3}

## Output Format
Respond strictly in JSON. No conversational filler or explanatory prose.
```

#### 0.7.3 Response Schema (JSON Schema)

```json
{
  "type": "object",
  "required": ["field1", "field2"],
  "properties": {
    "field1": {
      "type": "string",
      "description": "{field description}"
    },
    "field2": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sub_field": { "type": "string" }
        }
      }
    }
  }
}
```

#### 0.7.4 Variable Injection

| Variable | Source | Example |
| -------- | ------ | ------- |
| `{{l1_language}}` | User profile | `"ja"`, `"en"` |
| `{{level}}` | User settings | `"level1"`, `"level3"` |
| `{{user_input}}` | Request parameters | User input string |

### 0.8 Safety & Guardrails (AI Features Mandatory)

> **Purpose**: Validation rules to guarantee output quality and safety
> **Applicability**: Author only for features with §0.7 AI Logic (if unused, note "N/A")

<!-- When AI unused, replace with 1 line below:
**N/A** - This feature does not use AI/LLM
-->

#### 0.8.1 Input Validation

| Validation Item | Rule | Action on Failure |
| --------------- | ---- | ----------------- |
| Input Length | Max {N} chars | 400 error + message |
| Blocklist Filter | {Pattern / list} | Reject request |
| Rate Limit | {N} req / {hour} / user | 429 error |

#### 0.8.2 Output Validation

| Validation Item | Rule | Action on Failure |
| --------------- | ---- | ----------------- |
| JSON Parse | Schema compliant | Retry (max 2 times) → Fallback |
| Required Fields | {Field list} | Fallback response |
| Content Filter | {Prohibited patterns} | Filter then return |

#### 0.8.3 Fallback Strategy

| Failure Type | Fallback | User Message |
| ------------ | -------- | ------------ |
| LLM Timeout | {Alternative logic} | {Message} |
| Parse Failure | {Alternative response} | {Message} |
| Rate Limit | {Queue / Reject} | {Message} |

#### 0.8.4 Cost Control

| Item | Limit | On Exceeded |
| ---- | ----- | ----------- |
| Daily Invocations | {N} calls / user | {Action} |
| Token Ceiling | Input {N}K, Output {N}K | Reject request |
| Monthly Budget | ${N} | Alert + {Action} |

### 0.9 Design Tokens (v3.0 Mandatory)

> **SSOT**: `{SOURCE_ROOT}/globals.css` (Tailwind CSS 4), `docs/development/base-ui-theme-guide.md`
> **Principle**: Never hardcode colors or raw magic numbers → Always reference Tailwind tokens

#### 0.9.1 Color References

| Purpose | Tailwind Class | Prohibited Direct Value |
| ------- | -------------- | ----------------------- |
| Default Background | `bg-background` | `bg-[#0b1120]` |
| Default Text | `text-foreground` | `text-[#e2e8f0]` |
| Error | `text-destructive` | `text-red-500` |
| Primary | `text-primary` | `text-[#3b82f6]` |
| Surface | `bg-card` | `bg-[rgba(...)]` |

#### 0.9.2 Typography

| Purpose | Tailwind Class | Size |
| ------- | -------------- | ---- |
| Title | `text-2xl font-semibold` | 24px |
| Body | `text-base` | 16px |
| Caption | `text-sm` | 14px |
| Button | `text-sm font-medium` | 14px |

#### 0.9.3 Spacing

| Tailwind Class | Value | Purpose |
| -------------- | :---: | ------- |
| `p-1` | 4px | Icon-text spacing |
| `p-2` | 8px | Component internal padding |
| `p-3` | 12px | Card padding |
| `p-4` | 16px | Section spacing |
| `p-6` | 24px | Page padding |

#### 0.9.4 Common Components

| Component | Usage | Example |
| --------- | ----- | ------- |
| `PrimaryButton` | Primary Action | Submit, Start |
| `SecondaryButton` | Secondary Action | Cancel, Back |
| `ErrorText` | Error Message | Below field |
| `LoadingSpinner` | Loading | Centered |

### 0.10 Eventing & Async Processing (v3.5 New, Tier 2+ Mandatory)

> **Purpose**: Specify events, async processing pipelines, and delivery guarantees
> **Applicability**: Mandatory for Tier 2+ features involving DB triggers, API Route chains, or offline sync

<!-- When eventing/async unused, replace with 1 line below:
**N/A** - Synchronous processing only (no DB triggers / API Route chains)
-->

#### 0.10.1 DB Event Sources (PostgreSQL Trigger/Function)

| Trigger Name | Table | Event | Target Function | Trigger Timing |
| ------------ | ----- | ----- | --------------- | -------------- |
| `{trigger_name}` | `{table}` | `{INSERT/UPDATE/DELETE}` | `{function_name}()` | `{Condition}` |

> **Reference**: Backend trigger definitions

#### 0.10.2 Event Payload Definitions

| Field | Type | Required | Description |
| ----- | ---- | :------: | ----------- |
| `user_id` | `UUID` | ✓ | User ID |
| `{field}` | `{type}` | ✓/- | {Description} |

**JSON Schema**:

```json
{
  "type": "object",
  "required": ["{field1}", "{field2}"],
  "properties": {
    "{field1}": { "type": "string", "format": "uuid" },
    "{field2}": { "type": "string", "format": "date-time" }
  }
}
```

#### 0.10.3 API Route Call Chain

```
┌────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────┐
│ Client │────>│ API Route 1  │────>│ API Route 2  │────>│   DB   │
└────────┘     └──────────────┘     └──────────────┘     └────────┘
```

| Step | Caller | Callee | Method | Purpose |
| :--: | ------ | ------ | :----: | ------- |
| 1 | {Caller} | `{Callee}` | {POST/GET} | {Purpose} |

#### 0.10.4 Delivery Guarantee

| Segment | Guarantee Level | Implementation Pattern | Action on Failure |
| ------- | :-------------: | ---------------------- | ----------------- |
| Client → API Route | At least once | Client retry | Show error UI |
| API Route → Database | Exactly once | Transaction | Rollback |
| Trigger → Webhook | At least once | Webhook retry | Dead Letter Queue (DLQ) |

**Idempotency Guarantee**:

- `idempotency_key` Header Support: ⭕/❌
- Duplicate Request Detection Criteria: `{Criteria}`

#### 0.10.5 Offline Sync & Conflict Resolution

**Sync Architecture**: Server-driven / Client-driven

| Data Type | Sync Direction | Conflict Resolution Strategy |
| --------- | -------------- | ---------------------------- |
| {Type} | Client → Server | Last-Write-Wins / Server-Wins / Client-Wins |

<!-- When offline sync not supported, replace with:
**N/A** - Online-only feature
-->

#### 0.10.6 Realtime Subscriptions

| Channel Name | Target Table | Event Type | Filter Condition |
| ------------ | ------------ | ---------- | ---------------- |
| `{channel}` | `{table}` | {INSERT/UPDATE/DELETE} | `{Condition}` |

**Current Status**: [ ] Realtime enabled / [✓] Polling enabled ({N}s interval)

#### 0.10.7 Dead Letter Queue & Recovery

| DLQ Target | Storage Location | Retention Period | Reprocessing Strategy |
| ---------- | ---------------- | ---------------- | --------------------- |
| {Target} | `{table}` | {N} days | {Strategy} |

<!-- When DLQ not required, replace with:
**N/A** - DLQ omitted for MVP scope
-->

### 0.11 Infrastructure Requirements

> **Purpose**: Specify infrastructure requirements for deployment and operations
> **References**: `docs/architecture/infrastructure-contract.json` (Project-wide), `docs/architecture/service-mapping.md` (Service mapping table)

<!-- When infrastructure requirements not applicable (e.g. frontend-only), replace with 1 line below:
**N/A** - Frontend-only, no additional infrastructure needed
-->

#### 0.11.1 Compute Requirements

| Item | Value | Notes |
| ---- | ----- | ----- |
| CPU | {0.25vCPU} | {Rationale} |
| Memory | {256MB} | {Rationale} |
| Min Instances | {0} | {Scale-to-zero setting} |
| Max Instances | {4} | {Peak estimate} |

#### 0.11.2 Database Requirements

| Item | Value | Notes |
| ---- | ----- | ----- |
| Engine | {postgresql} | {Selection rationale} |
| Size | {small} | {Estimated data volume} |
| HA | {true / false} | {Availability requirements} |

#### 0.11.3 External Service Dependencies

| Service Name | Purpose | Required | Fallback Strategy |
| ------------ | ------- | :------: | ----------------- |
| {Service Name} | {Purpose} | ✓ | {Fallback strategy} |

#### 0.11.4 Environment Variables

| Name | Description | Required | Secret |
| ---- | ----------- | :------: | :----: |
| `{ENV_VAR}` | {Description} | ✓ | ✓ |

#### 0.11.5 Infrastructure Requirements Schema

```json:schema/infrastructure_requirements
{
  "compute": {
    "cpu": "{0.25vCPU}",
    "memory": "{256MB}",
    "instances": { "min": 0, "max": 4 }
  },
  "database": {
    "engine": "{postgresql}",
    "size": "{small}",
    "ha": false
  },
  "external_services": [
    { "name": "{service}", "purpose": "{purpose}", "required": true }
  ],
  "env_vars": [
    { "name": "{ENV_VAR}", "description": "{desc}", "required": true, "secret": false }
  ]
}
```

---

## 1. Overview

### 1.1 Goal (WHY)

{1-2 sentences explaining business rationale and user value}

### 1.2 User Story

```
AS A {user role}
I WANT TO {desired action}
SO THAT {expected value}
```

### 1.3 MVP Scope

| In Scope | Out of Scope |
| -------- | ------------ |
| {Core MVP feature} | {Post-MVP feature} |

### 1.4 Goals / Non-Goals (Mandatory)

> **Purpose**: Ensure AI accurately understands implementation scope to prevent scope creep

#### Goals (What this SPEC achieves)

1. **{Goal 1}**: {Concrete description}
2. **{Goal 2}**: {Concrete description}
3. **{Goal 3}**: {Concrete description}

#### Non-Goals (What this SPEC will NOT do)

| Item | Rationale | Alternative / Timeline |
| ---- | --------- | ---------------------- |
| {Non-Goal 1} | {Exclusion rationale} | {Post-MVP / Separate SPEC} |
| {Non-Goal 2} | {Exclusion rationale} | {Alternative or future plan} |
| {Non-Goal 3} | {Exclusion rationale} | {Not applicable / Unnecessary} |

> ⚠️ **AI Warning**: Do not implement features listed in Non-Goals. Quote this section if related requests are made.

### 1.5 UI Flow Contract (v4.0 Overhaul, Tier 1-2 Mandatory)

> **Purpose**: Declare SPA state-driven panel visibility contract and ensure consistency with `docs/ui-flow/ui-flow.json` (SSOT)
>
> **SSOT Reference**: `docs/ui-flow/ui-flow.json` — Source of truth for all panels, states, and SSE mappings

<!-- For Tier 3 (backend_feature), replace with:
**N/A** - Backend-only feature; UI Flow Contract omitted
-->

#### 1.5.1 Panel Declarations

> Declare panels added or modified by this feature

| Panel Name | Operation | Feature | Visibility Type | Visibility Condition |
| ---------- | --------- | ------- | --------------- | -------------------- |
| {PanelName}Panel | new | {feature-id} | state_based | `status === '{state}'` |
| {PanelName}Panel | modify | {feature-id} | data_based | `{data} !== null && {condition}` |

Operations: `new` = Add new panel to ui-flow.json / `modify` = Change condition on existing panel / `reference` = No change (dependency only)

#### 1.5.2 SSE Event Mapping

> Catalog of SSE events used by this feature

| SSE Event | → SessionStatus | Target Panel | Status Change |
| --------- | --------------- | ------------ | :-----------: |
| {event} | {status} | {PanelName}Panel | Yes |

#### 1.5.3 Phase Integration

> Specifies which phase displays each panel

| Phase | Added Panel | Layout | Auto Scroll |
| ----- | ----------- | ------ | ----------- |
| {phase} | {PanelName}Panel | grid-2col | {scrollRef} |

#### 1.5.4 State Transitions (Scope relevant to this feature)

```
{fromState} ──{EVENT}──▶ {toState}
```

<!-- json:schema/ui_flow_contract — Machine-readable block (readiness_gate validation target) -->

```json
{
  "$schema": "ui_flow_contract",
  "panels": [
    {
      "name": "{PanelName}Panel",
      "operation": "new|modify|reference",
      "feature": "{feature-id}",
      "visibility": {
        "type": "state_based|data_based|flag_based",
        "condition": "{condition expression}"
      }
    }
  ],
  "sse_events": [
    {
      "event": "{event-name}",
      "target_status": "{SessionStatus}",
      "target_panel": "{PanelName}Panel",
      "changes_status": true
    }
  ],
  "phases": [
    {
      "phase": "{phase-name}",
      "added_panels": ["{PanelName}Panel"],
      "auto_scroll_ref": "{refName|null}"
    }
  ]
}
```

> **AI Warning**: `panels[].name` in `json:schema/ui_flow_contract` must match `panels` keys in `docs/ui-flow/ui-flow.json`. For `operation: "new"`, addition to `ui-flow.json` is required upon completion (verified in feature-wiring Phase 2.3).

---

## 2. Functional Requirements (WHAT)

> 💡 **Single Source of Truth**: Implementation files, status, and tests are recorded here only

### FR-{NNN}01: {Feature Name}

| Item | Details |
| ---- | ------- |
| **Description** | {Feature description} |
| **Implementation File** | `src/features/{feature}/components/{Name}Panel.tsx` |
| **Test File** | `tests/unit/features/{feature}/{name}.test.ts` |
| **State Transition** | {e.g. Loading → Data, Error → Retry} |
| **Status** | ⬜ Not Started / 🔄 In Progress / ✅ Completed |

**Acceptance Criteria (AC)** - BDD 6-column (v3.1 Quantification Enhanced):

> ⚠️ **Quantification Required**: The Then column must include **measurable metrics / thresholds**
> Example: "Displayed" ❌ → "Displayed within 500ms" ✅

| AC | Given (Precondition) | When (Action) | Then (Expected Result + Measurable Metric) | Observation Point | Test ID |
| :-: | -------------------- | ------------- | ------------------------------------------ | ----------------- | :-----: |
| AC1 | {Precondition} | {Action} | {Expected Result} **[Within {N}ms / {N} items / {N}%+]** | {Verification Variable} | T-{NNN}01 |
| AC2 | {Precondition} | {Action} | {Expected Result} **[Measurable Metric]** | {Verification Variable} | T-{NNN}02 |

<!--
Quantification Guide:
- Time: "< 500ms", "Within 3s"
- Count: "Max 10", "Exactly 5"
- Ratio: "90%+", "Error rate < 1%"
- State: "isLoading = false", "items.length > 0"
- Qualitative → Quantitative conversion examples:
  - "Fast" → "< 1s"
  - "Many" → "> 100"
  - "Accurate" → "100% match"
-->

**Edge Cases (EC)**:

- EC1: {Exception situation} → {Handling method}
- EC2: {Exception situation} → {Handling method}

**Exception Flows (EF)**:

| EF | Trigger | System Behavior | User Feedback | Recovery Route |
| :-: | ------- | --------------- | ------------- | -------------- |
| EF1 | {Error condition} | {Logging / State change} | {Toast / Dialog} | {Retry / Cancel / Navigate} |
| EF2 | {Timeout} | {Cancel / Fallback} | {Message} | {Retry button} |

**Logic (v3.0, Tier 1-2 Mandatory)** - pseudocode / formulas:

<!-- For Tier 3, replace with:
**N/A** - Simple CRUD; detailed logic omitted
-->

```pseudocode
FUNCTION {functionName}(param1: Type, param2: Type) -> ReturnType:
    # 1. Input validation
    IF param1 is invalid:
        THROW ValidationError

    # 2. Business logic
    result = {calculation / processing}

    # 3. Store / Return
    RETURN result
```

**Formula (if applicable)**:

- `{variable} = {formula}`

**Boundary Values**:
| Condition | Result |
| --------- | ------ |
| {Condition 1} | {Result 1} |
| {Condition 2} | {Result 2} |

**AI Implementation Hints**:

```typescript
// Reference pattern: src/features/{feature}/components/SimilarPanel.tsx
// Used Hook: UI Component + use{Feature}() Hook
```

---

### FR-{NNN}02: {Feature Name}

| Item | Details |
| ---- | ------- |
| **Description** | {Feature description} |
| **Implementation File** | `src/features/{feature}/api/{name}-api.ts` |
| **Test File** | `tests/unit/features/{feature}/{name}-api.test.ts` |
| **State Transition** | {e.g. Loading → Data, Error → Retry} |
| **Status** | ⬜ Not Started |

**Acceptance Criteria (AC)** - Quantification Required:

| AC | Given (Precondition) | When (Action) | Then (Expected Result + Measurable Metric) | Observation Point | Test ID |
| :-: | -------------------- | ------------- | ------------------------------------------ | ----------------- | :-----: |
| AC1 | {Precondition} | {Action} | {Expected Result} **[Measurable Metric]** | {Verification Variable} | T-{NNN}XX |

**Edge Cases (EC)**:

- EC1: {Exception situation} → {Handling method}

**Exception Flows (EF)**:

| EF | Trigger | System Behavior | User Feedback | Recovery Route |
| :-: | ------- | --------------- | ------------- | -------------- |
| EF1 | {Error condition} | {Action} | {Feedback} | {Recovery} |

---

### 2.X Business Rules (v3.0 New)

> **Purpose**: Centralize specification of complex business logic

#### BR-01: {Business Rule Name}

| Item | Details |
| ---- | ------- |
| **Applies To** | {Which FRs it applies to} |
| **Rule Description** | {Natural language description} |

**Logic (Pseudocode)**:

```pseudocode
FUNCTION {ruleName}(inputs) -> output:
    # {Step-by-step logic}
```

**Formulas**:

- `{output} = {formula}`

**Boundary Values**:
| Input Range | Output |
| ----------- | ------ |
| {Range 1} | {Result 1} |
| {Range 2} | {Result 2} |

---

## 3. Dependencies & Risks (HOW)

### 3.1 Prerequisite Dependencies

| Dependency Target | Required Item | Status |
| ----------------- | ------------- | :----: |
| SPEC-{XXX} | {Feature} | ✅ / ⏳ |
| DB Table | `{table_name}` | ✅ / ⏳ |

### 3.2 Top 3 Risks

| Risk | Impact | Mitigation |
| ---- | :----: | ---------- |
| {Risk 1} | High / Med / Low | {Mitigation strategy} |
| {Risk 2} | High / Med / Low | {Mitigation strategy} |
| {Risk 3} | High / Med / Low | {Mitigation strategy} |

### 3.3 External Dependencies (v3.0 New)

> **Purpose**: External system integration detailed specifications

| External System | Purpose | API / SDK | On Failure |
| --------------- | ------- | --------- | ---------- |
| {System 1} | {Purpose} | {Version / Endpoint} | {Fallback} |

### 3.4 Sequence Diagram (Tier 1-2 Mandatory)

> **Purpose**: Visualize call flows between components so AI implements exact integration
> **Applicability**: Mandatory for Tier 1-2, optional for Tier 3

<!-- For Tier 3, replace with:
**N/A** - Sequence diagram omitted for Tier 3 feature
-->

#### 3.4.1 {Primary Flow Name} (e.g. AI Tutor Conversation)

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌────────┐
│   User   │     │   Hook   │     │ API Route │     │   LLM  │
└────┬─────┘     └────┬─────┘     └─────┬─────┘     └───┬────┘
     │                 │                  │                │
     │  1. {Action}    │                  │                │
     │────────────────>│                  │                │
     │                 │                  │                │
     │                 │  2. {API Call}   │                │
     │                 │─────────────────>│                │
     │                 │                  │                │
     │                 │                  │ 3. {LLM Req}   │
     │                 │                  │───────────────>│
     │                 │                  │                │
     │                 │                  │ 4. {Response}  │
     │                 │                  │<───────────────│
     │                 │                  │                │
     │                 │  5. {Return}     │                │
     │                 │<─────────────────│                │
     │                 │                  │                │
     │  6. {Update UI} │                  │                │
     │<────────────────│                  │                │
     │                 │                  │                │
```

**Step Descriptions**:

| # | Component | Action | Data |
| :-: | --------- | ------ | ---- |
| 1 | User → Hook | {Description} | `{Data}` |
| 2 | Hook → API | {Description} | `{Request}` |
| 3 | API → LLM | {Description} | `{Prompt}` |
| 4 | LLM → API | {Description} | `{Response}` |
| 5 | API → Hook | {Description} | `{Result}` |
| 6 | Hook → User | {Description} | `{UI State}` |

#### 3.4.2 {Error Flow Name} (Optional)

```
{Error scenario diagram}
```

---

## 4. Screen Documents

> Refer to standalone Screen documents for UI details

| Screen ID | Screen Name | Document | Status |
| --------- | ----------- | -------- | :----: |
| SCR-{NNN}-001 | {Screen Name} | [screens/{name}.md](./screens/{name}.md) | ⬜ |

---

## 4.5 Runbook (Operations, Conditional)

<!-- If operational procedures are not required, this section can be deleted -->

- Operations Document: [RUNBOOK-{NNN}-{name}.md](./RUNBOOK-{NNN}-{name}.md)
- Target Scope: Include only for features requiring failure response or operational procedures

---

## 5. Verification & Testing (v3.0 New)

> **Purpose**: Guide AI to write accurate tests using realistic test data

### 5.1 Test Strategy

| Layer | Test Type | Target Coverage |
| ----- | --------- | :-------------: |
| Custom Hook | Unit | 80%+ |
| Service | Unit | 90%+ |
| UI | Component | Key Flows |
| Integration | Integration Test | Happy Path |

### 5.2 Test Fixtures

> **Purpose**: Standardize mock data to ensure test consistency

#### API Response Sample: `{API endpoint}`

**Success (200)**:

```json
{
  "status": "ok",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "field1": "value1",
    "createdAt": "2026-01-28T00:00:00Z"
  }
}
```

**Error (401)**:

```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "JWT expired"
  }
}
```

#### Boundary Value Test Data

| Case | Input | Expected Result |
| ---- | ----- | --------------- |
| Empty response | `items: []` | Show EmptyState |
| Max length | `title: "A" * 200` | Truncate / Ellipsis |
| Null field | `field: null` | Use default value |

### 5.3 Acceptance Checklist

- [ ] All AC Then conditions met
- [ ] All EF recovery routes operational
- [ ] No sensitive info leaked on error
- [ ] Appropriate fallback when offline
- [ ] No missing message constants

---

## 6. Message Constants (v3.0 New)

> **Purpose**: Prevent string hardcoding and ensure message key consistency
> **SSOT**: `src/shared/constants/messages.ts`

### 6.1 Message Key Naming Conventions

| Pattern | Example | Purpose |
| ------- | ------- | ------- |
| `{feature}_{element}` | `lesson_title` | Screen element |
| `{feature}_{action}Button` | `lesson_startButton` | Button / Action |
| `error_{type}` | `error_networkRetry` | Error message |
| `common_{element}` | `common_cancel` | Common element |

### 6.2 Keys Required for This Feature

| Message Key | Text | Purpose |
| ----------- | ---- | ------- |
| `{feature}_{element1}` | {Text} | {Purpose} |
| `{feature}_{element2}` | {Text} | {Purpose} |
| `error_{type}` | {Text} | {Purpose} |

> **Rule**: If the above keys do not exist in `messages.ts`, they must be added before implementation

---

## 7. Revision History

| Date | Version | Changes | Basis |
| ---- | ------- | ------- | ----- |
| {DATE} | v1.0 | Initial draft | Based on BRIEF |

---

<!--
Status Legend: ✅ Completed | 🔄 In Progress | ⬜ Not Started | ❌ Blocked
Priority: P0 (MVP) | P1 (MVP Supporting) | P2 (Post-MVP)

═══════════════════════════════════════════════════════════════
Tier Selection Criteria (v3.0 Mandatory - Referenced by all AI/authors)
═══════════════════════════════════════════════════════════════

## Tier Classification Reference Table

| Tier | Risk Level | Applicable Feature Type | Example |
| :--: | ---------- | ----------------------- | ------- |
| **1** | High Risk | AI/LLM calls, Payment/Subscription, Auth/Permissions, Complex Algorithms, External API Integration | AI Tutor, Subscription Billing, SRS Algorithm, OAuth |
| **2** | Medium Risk | Standard CRUD, Standard UI Flow, DB Integration, State Management | Dashboard Management, Profile Edit, Activity Logging |
| **3** | Low Risk | Static Content, Settings Toggle, Simple Display, Info Pages | FAQ, About, App Settings, Announcements |

## Tier Selection Decision Tree

```
Q1: Does it make AI/LLM calls?
├─ YES → Tier 1
└─ NO → Q2

Q2: Does it involve Payments / Auth / External API Integration?
├─ YES → Tier 1
└─ NO → Q3

Q3: Does it contain complex business logic (algorithms, formulas)?
├─ YES → Tier 1
└─ NO → Q4

Q4: Does it involve DB CRUD or State Management?
├─ YES → Tier 2
└─ NO → Q5

Q5: Are there 2 or more screen transitions?
├─ YES → Tier 2
└─ NO → Tier 3
```

## Mandatory Sections Matrix by Feature Type

| Section | UI-Only | API-Integrated | AI-Powered | Billing |
| ------- | :-----: | :------------: | :--------: | :-----: |
| §0.0 Project Context | ✅ | ✅ | ✅ | ✅ |
| §0.2.2 Provider Specs | ⚪ Optional | ✅ Basic | ✅ Detailed | ✅ Detailed |
| §0.3 Error Handling | ⚪ Basic | ✅ Major | ✅ Full | ✅ Full |
| §0.4 Data Schema | ❌ | ✅ | ✅ | ✅ |
| §0.5 API Contract | ❌ | ✅ | ✅ | ✅ |
| §0.6 NFR | ⚪ Basic | ✅ | ✅ Detailed | ✅ Detailed |
| §0.7 AI Logic | ❌ | ❌ | ✅ Mandatory | ❌ |
| §0.8 Safety & Guardrails | ❌ | ⚪ Optional | ✅ Mandatory | ✅ Mandatory |
| §0.9 Design Tokens | ✅ | ✅ | ✅ | ✅ |
| §0.10 Eventing & Async | ❌ | ✅ When Applicable | ✅ | ✅ |
| §1.5 UI Flow | ⚪ Optional | ✅ | ✅ | ✅ |
| §2.X Business Rules | ❌ | ⚪ When Complex | ✅ | ✅ |
| §3.4 Sequence Diagram | ❌ | ✅ | ✅ | ✅ |
| §5 Test Fixtures | ⚪ Optional | ✅ Major | ✅ Full | ✅ Full |
| §6 Message Constants | ✅ | ✅ | ✅ | ✅ |

═══════════════════════════════════════════════════════════════

SPEC v3.5 Mandatory Sections (2026-01-28):
- §0.0 Project Context: Naming + Glossary references (Mandatory)
- §0.2.1 Core State: Core state element definitions (Mandatory)
- §0.2.2 Architecture Guidance: SRP-based separation criteria + naming rules (Guidelines)
- §0.3 Error Handling: Classification + UX + Recovery + Logging (Enhanced)
- §0.4 Data Schema & Security: TypeScript type definitions + Zod + Authorization policies (Mandatory)
- §0.5 API Contract: Mandatory (Explicitly state "N/A" if no API)
- §0.6 NFR: Mandatory (Explicitly state "N/A" for non-applicable items)
- §0.7 AI Logic & Prompts: Mandatory for AI features (Explicitly state "N/A" if unused)
- §0.8 Safety & Guardrails: Mandatory for AI features (Explicitly state "N/A" if unused)
- §0.9 Design Tokens: UI style reference rules (Mandatory)
- §0.10 Eventing & Async Processing: DB triggers + API Route chains + Delivery guarantees (v3.5 New, Tier 2+ Mandatory)
- §1.4 Goals / Non-Goals: Mandatory for all features
- §1.5 UI Flow: Screen transition diagram (Tier 1-2 Mandatory)
- §2 FR Logic: Pseudocode / Formulas (Tier 1-2 Mandatory)
- §2.X Business Rules: Complex business logic (As needed)
- §3.4 Sequence Diagram: Tier 1-2 Mandatory (Tier 3 Optional)
- §5 Verification & Testing: Test fixtures + Checklist (Tier 1-2 Mandatory)
- §6 Message Constants: Message key rules + Required key list (Mandatory)

Tier-Based Applicability Matrix:
| Section | Tier 1 | Tier 2 | Tier 3 |
| ------- | :----: | :----: | :----: |
| §0.0 Project Context | ✅ | ✅ | ✅ |
| §0.2.2 Provider Specs | ✅ Detailed | ✅ Basic | ⚪ Optional |
| §0.3 Error Handling | ✅ Full | ✅ Major | ⚪ Basic |
| §0.9 Design Tokens | ✅ | ✅ | ⚪ Reference |
| §0.10 Eventing & Async | ✅ | ✅ When Applicable | ❌ |
| §1.5 UI Flow | ✅ Full | ✅ Major | ⚪ Optional |
| §2.X Logic Pseudocode | ✅ | ⚪ When Complex | ❌ |
| §3.4 Sequence Diagram | ✅ | ✅ | ⚪ Optional |
| §5 Test Fixtures | ✅ Full | ✅ Major | ⚪ Optional |
| §6 Message Constants | ✅ | ✅ | ✅ |

═══════════════════════════════════════════════════════════════
MVS (Minimum Viable SPEC) Gate - Mandatory AI Pre-Implementation Check
═══════════════════════════════════════════════════════════════

## MVS Checklist (All 5 items mandatory ✅)

[ ] §0.0.2 Naming Conventions - File/class/variable naming rules defined
[ ] §0.1 Target Files - Scope (Glob) + conditional files explicitly specified
[ ] §1.4 Goals / Non-Goals - Implementation scope and excluded items clarified
[ ] §2 FR with AC (Min 1) - Functional requirements + acceptance criteria
[ ] §6.2 Required Message Constants - List of required message keys

## Policy When MVS Not Met

| Situation | Permitted Actions | Prohibited Actions |
| --------- | ----------------- | ------------------ |
| MVS Not Met | Spike / exploratory code | Production implementation |
| MVS Met, Tier Not Met | Implement only required items for Tier | Tier higher-level elements |
| Fully Met | Full implementation | - |

> ⚠️ **AI Implementation Gate**: If an implementation request is received for a SPEC that fails MVS,
> AI must respond: "Cannot implement: MVS checklist not met. The following items must be supplemented: [Unmet items]".

## MVS Validation Command

```bash
# Run SPEC validator (Scheduled for P2 implementation)
make spec.validate SPEC=docs/features/XXX/SPEC-XXX.md
```

═══════════════════════════════════════════════════════════════

SSOT Principles:
- API: `{API_ROUTES_DIR}/*/route.{LANG_EXT}` responseSchema
- Glossary: `docs/glossary.md`
- Theme: `{SOURCE_ROOT}/globals.css` + `docs/development/base-ui-theme-guide.md`
- SPEC summarizes these and records design intent

AI Implementation Checklist:
1. §0.0 Check → Verify naming conventions compliance
2. Goals Check → Perform only work within scope
3. Non-Goals Check → Do NOT implement explicitly excluded items
4. §0.7 Check → Copy System Prompt + Response Schema verbatim
5. §0.8 Check → Implement input/output validation + Fallback
6. §0.9 Check → Use design tokens, never hardcode values
7. EF Check → Handle all exception flows
8. Sequence Diagram Check → Follow invocation ordering
9. §6 Check → Verify all required message keys exist
