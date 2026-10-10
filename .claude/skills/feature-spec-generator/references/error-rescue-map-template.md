# Error & Rescue Map Template

> **Purpose**: Predefine error scenarios during SPEC authoring to prevent missed error handling in the implementation phase
> **When**: feature-spec-generator references this template when generating SPEC.md to include Error & Rescue Map sections

---

## Overview

Predefine failure scenarios for every API endpoint and component.
Decide the error UX during the design phase by explicitly specifying "what the user sees".

---

## Error & Rescue Map Table

Construct the following table for each API endpoint or major function in SPEC.md.

```markdown
### Error & Rescue Map: {endpoint/function name}

| Method/Path | Failure | Exception | Rescued? | Test? | User Sees |
|------------|---------|-----------|:--------:|:-----:|-----------|
| POST /api/search | DB connection timeout | DatabaseTimeoutError | Y | Y | "Search service temporarily unavailable. Please try again shortly." |
| POST /api/search | Invalid query param | ValidationError | Y | Y | Inline field error message |
| POST /api/search | Rate limit exceeded | RateLimitError | Y | N | "Too many requests. Please retry in 1 minute." |
| POST /api/search | Elasticsearch down | ServiceUnavailableError | N | N | **500 — Silent failure** |
| GET /api/search/:id | Not found | NotFoundError | Y | Y | 404 Page |
| GET /api/search/:id | Unauthorized | AuthError | Y | Y | Redirect to login page |
```

---

## CRITICAL GAP Automatic Flagging Rules

The following combination is automatically flagged as a **CRITICAL GAP**:

```
IF Rescued = N AND Test = N AND User Sees = "Silent" or empty
THEN → CRITICAL GAP: Silent unhandled failure may occur for user
```

### Severity Matrix

| Rescued | Test | User Sees | Verdict |
|:-------:|:----:|-----------|------|
| Y | Y | Clear message | OK |
| Y | N | Clear message | MEDIUM — Test required |
| N | Y | Silent | HIGH — Rescue implementation required |
| N | N | Silent/Empty | **CRITICAL** — Resolve immediately |
| Y | Y | Generic "An error occurred" | LOW — UX improvement recommended |

---

## Authoring Guide

### Failure Scenario Identification Checklist

Consider failures across the following categories for each endpoint/function:

1. **Network**: Timeouts, DNS resolution failures, connection refused
2. **Auth & Authorization**: Expired tokens, insufficient permissions, session timeout
3. **Validation**: Missing required fields, format errors, out-of-range values
4. **Data**: Record not found, duplicate keys, referential integrity violations
5. **External Services**: API down, response schema drift, rate limiting
6. **Resources**: Disk full, out of memory, file lock contention
7. **Concurrency**: Race conditions, optimistic locking failures, deadlocks

### "User Sees" Authoring Rules

- Write concrete, descriptive messages (avoid generic "An error occurred")
- Include user next steps / actions (retry, fallback method, contact support)
- Silent failures must always be flagged as CRITICAL

---

## SPEC.md Integration

When feature-spec-generator generates SPEC.md:

1. Include an Error & Rescue Map subsection in each `api_endpoint` block
2. Include error state scenarios for each major UI interaction
3. If 1 or more CRITICAL GAPs exist, output a SPEC completeness warning

---

## Platform Agnostic

This template applies to all application frameworks (Web / Mobile / Desktop).
Exception class names and HTTP status codes should be adapted according to the specific framework.
