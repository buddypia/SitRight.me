# API-{NNN}: {Feature Name} API Contract

> **Status**: {STATUS} | **Version**: v{N} | **Last Updated**: {DATE}
> **SPEC Version**: v3.1 (Hybrid Format)

---

## 1. Overview

### 1.1 Scope

{Overview of API / API Routes covered in this document}

### 1.2 Single Source of Truth (SSOT)

| Item | SSOT Location | Role |
| ---- | ------------- | ---- |
| **Request/Response Schema** | Schema tables in this document | Type/constraint definitions |
| **Implementation** | `{API_ROUTES_DIR}/{name}/index.{LANG_EXT}` | `responseSchema` code |
| **Example** | Example sections in this document | Reference (validation target) |

> **Conflict Resolution Priority**: Code > Schema Table > Example
>
> Schema tables reflect code, and examples reflect schemas.
> In case of discrepancy, `spec-validator` will trigger warnings.

---

## 2. Endpoint Catalog

| ID | Method | Path | Auth | Idempotent | Description |
| -- | ------ | ---- | :--: | :--------: | ----------- |
| API-{NNN}-01 | POST | `/functions/v1/{name}` | ✅ | ❌ | {Description} |
| API-{NNN}-02 | GET  | `/functions/v1/{name}` | ✅ | ✅ | {Description} |

---

## 3. API-{NNN}-01: {Endpoint Name}

> **SSOT**: `{API_ROUTES_DIR}/{name}/index.{LANG_EXT}`

### 3.1 Request

#### Request Schema (SSOT)

| Field | Type | Required | Constraints | Description | Example |
| ----- | ---- | :------: | ----------- | ----------- | ------- |
| `action` | string | ✅ | enum: `add`, `update`, `delete` | Action to execute | `"add"` |
| `data` | object | ✅ | - | Action payload | `{}` |
| `data.word` | string | ✅ | minLength: 1, maxLength: 100 | Target word | `"example-data"` |
| `data.meaning` | string | ✅ | maxLength: 500 | Translated meaning | `"Descriptive meaning text"` |
| `data.level` | integer | ⚪ | min: 1, max: 6, default: 1 | Difficulty level | `1` |
| `data.example` | string | ⚪ | maxLength: 1000 | Example sentence | `"example-data, other-data"` |

#### Request Example

```json
{
  "action": "add",
  "data": {
    "word": "example-data",
    "meaning": "Descriptive meaning text",
    "level": 1,
    "example": "example-data, other-data"
  }
}
```

### 3.2 Response

#### Response Schema (SSOT)

| Field | Type | Required | Constraints | Description | Example |
| ----- | ---- | :------: | ----------- | ----------- | ------- |
| `status` | string | ✅ | enum: `ok`, `error` | Processing result | `"ok"` |
| `data` | object | ⚪ | - | Result payload on success | `{}` |
| `data.id` | string | ⚪ | format: uuid | Created/modified item ID | `"550e8400-e29b-41d4-a716-446655440000"` |
| `data.created_at` | string | ⚪ | format: date-time (ISO 8601) | Creation timestamp | `"2026-01-28T10:30:00Z"` |
| `error` | object | ⚪ | Required when status=error | Error payload | `{}` |
| `error.code` | string | ⚪ | UPPER_SNAKE_CASE | Error code | `"INVALID_INPUT"` |
| `error.message` | string | ⚪ | - | Human-readable message | `"Word is required"` |
| `error.details` | object | ⚪ | - | Additional error details | `{}` |

#### Success Response Example (200 OK)

```json
{
  "status": "ok",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-28T10:30:00Z"
  }
}
```

### 3.3 Error Response

#### Error Codes

| HTTP | Code | Condition | User Message | Client Action |
| :--: | ---- | --------- | ------------ | ------------- |
| 400 | `INVALID_INPUT` | Missing required fields or formatting errors | "Please check your input" | Display inline validation error |
| 400 | `DUPLICATE_ENTRY` | Duplicate entry exists | "Already registered" | Display duplicate notice |
| 401 | `UNAUTHENTICATED` | Missing JWT or token expired | "Login required" | Redirect to login screen |
| 403 | `FORBIDDEN` | RLS policy violation | "Access denied" | Redirect to home screen |
| 429 | `RATE_LIMITED` | Request quota exceeded | "Please try again shortly" | Retry with exponential backoff |
| 500 | `INTERNAL_ERROR` | Internal server error | "An error occurred" | Retry (up to 2 times) |
| 503 | `SERVICE_UNAVAILABLE` | External dependency failure | "Service temporarily unavailable" | Advise user to retry later |

#### Error Response Examples

**400 Bad Request - INVALID_INPUT**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_INPUT",
    "message": "Word is required",
    "details": {
      "field": "data.word",
      "reason": "required"
    }
  }
}
```

**400 Bad Request - DUPLICATE_ENTRY**

```json
{
  "status": "error",
  "error": {
    "code": "DUPLICATE_ENTRY",
    "message": "Already registered",
    "details": {
      "existing_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

**401 Unauthorized**

```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Login required"
  }
}
```

**429 Too Many Requests**

```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Please try again shortly",
    "details": {
      "retry_after_seconds": 60
    }
  }
}
```

**500 Internal Server Error**

```json
{
  "status": "error",
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An error occurred"
  }
}
```

---

## 4. Rate Limiting (Optional)

> For APIs without rate limits, mark this section as "N/A"

| Tier | Requests/Min | Requests/Day | Burst Limit |
| ---- | :----------: | :----------: | :---------: |
| Free | 10 | 100 | 5 |
| Premium | 60 | 10,000 | 20 |

**Behavior on Exceeded Limits**:

- Return 429 response
- Include wait time (seconds) in `Retry-After` header
- Client applies exponential backoff

---

## 5. Compatibility Policy

| Change Type | Compatibility | Handling Strategy |
| ----------- | :-----------: | ----------------- |
| Add optional field | ✅ Backward compatible | Maintain current version |
| Remove field | ❌ Breaking change | Major version bump |
| Change type | ❌ Breaking change | Major version bump |
| Add enum value | ⚠️ Caution | Recommend client update |
| Relax constraints | ✅ Backward compatible | Maintain current version |
| Tighten constraints | ❌ Breaking change | Major version bump |

**Deprecation Policy**:

- Minimum 2-week warning period prior to field removal
- Explicitly mark with `@deprecated` tag in documentation
- Optionally include `X-Deprecated-Fields` header in response

---

## 6. Revision History

| Date | Version | Description | Rationale |
| ---- | ------- | ----------- | --------- |
| {DATE} | v1.0 | Initial authoring | Based on SPEC-{NNN} |

---

## Appendix A: JSON Schema (Machine Validation)

> `spec-validator` automatically extracts and validates this block.

```json:schema/api_endpoint
{
  "id": "API-{NNN}-01",
  "method": "POST",
  "path": "/functions/v1/{name}",
  "auth": true,
  "request": {
    "type": "object",
    "required": ["action", "data"],
    "properties": {
      "action": {
        "type": "string",
        "enum": ["add", "update", "delete"]
      },
      "data": {
        "type": "object",
        "required": ["word", "meaning"],
        "properties": {
          "word": { "type": "string", "minLength": 1, "maxLength": 100 },
          "meaning": { "type": "string", "maxLength": 500 },
          "level": { "type": "integer", "minimum": 1, "maximum": 6, "default": 1 },
          "example": { "type": "string", "maxLength": 1000 }
        }
      }
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
          "message": { "type": "string" },
          "details": { "type": "object" }
        }
      }
    }
  },
  "request_example": {
    "action": "add",
    "data": {
      "word": "example-data",
      "meaning": "Descriptive meaning text",
      "level": 1
    }
  },
  "response_example": {
    "status": "ok",
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-01-28T10:30:00Z"
    }
  },
  "errors": [
    {
      "http": 400,
      "code": "INVALID_INPUT",
      "condition": "Missing required fields or formatting errors",
      "client_action": "Display input validation message"
    },
    {
      "http": 401,
      "code": "UNAUTHENTICATED",
      "condition": "Missing JWT or token expired",
      "client_action": "Prompt re-authentication"
    },
    {
      "http": 429,
      "code": "RATE_LIMITED",
      "condition": "Request quota exceeded",
      "client_action": "Retry with backoff"
    },
    {
      "http": 500,
      "code": "INTERNAL_ERROR",
      "condition": "Internal server error",
      "client_action": "Retry (max 2 attempts)"
    }
  ]
}
```

---

## Appendix B: Verification Checklist

> Verification items before pull request

- [ ] **Schema Table Completeness**
  - [ ] All fields have type, required indicator, and example documented
  - [ ] Constraints specify min/max/enum restrictions where applicable
- [ ] **Example Consistency**
  - [ ] Request example matches request schema
  - [ ] Response example matches response schema
  - [ ] Error example matches error code catalog
- [ ] **SSOT Alignment**
  - [ ] API Route `responseSchema` matches this document
  - [ ] Passes `spec-validator`
- [ ] **Error Completeness**
  - [ ] All error codes include user-facing messages
  - [ ] Client recovery actions are concrete and actionable

