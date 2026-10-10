# Multi-Perspective Review Protocol

> **Core Principle**: "Future is Now" — Resolve all findings immediately. Never defer to future sprints.

---

## Overview

When `final-review` is run in Deep mode or with `--multi-perspective` enabled, code is evaluated **independently** from 6 expert perspectives.

Each perspective runs in parallel via subagents, and the Lead synthesizes the findings to render an overall verdict.

---

## 6 Reviewer Roles

### Role 1: PM Reviewer (Product Manager)

> "Does this change deliver the correct value to the user?"

| Evaluation Area | Guiding Questions |
| --- | --- |
| **Requirements Alignment** | Does it satisfy all FRs (Functional Requirements) in `SPEC.md`/`BRIEF.md`? |
| **User Value** | Does this change solve the user's Job-to-be-Done? |
| **Scope Creep** | Were extraneous features added beyond requested scope? |
| **Acceptance Criteria** | Do all Acceptance Criteria (Given-When-Then) pass? |
| **Edge Case Coverage** | Are realistic real-world user scenarios accounted for? |

**Verdict**: SPEC FR fulfillment < 80% → CRITICAL

### Role 2: Developer Reviewer (Senior Engineer)

> "Is this code structured for long-term maintainability?"

| Evaluation Area | Guiding Questions |
| --- | --- |
| **Architecture Compliance** | Feature-First structure, dependency direction (`features` → `shared` OK, `shared` → `features` NG)? |
| **Code Quality** | DRY, SOLID compliance? Acceptable cyclomatic complexity? |
| **Pattern Consistency** | Adherence to existing project patterns (Hooks, Zod, Repositories)? |
| **Type Safety** | Use of `any`, `as` type casting, or `!` non-null assertions? |
| **Naming** | Do functions, variables, and filenames clearly convey intent? |
| **Dead Code** | Unused imports, unreachable code, unreferenced functions? |

**Verdict**: Use of `any` or architectural violations → HIGH

### Role 3: QE Reviewer (Quality Engineer)

> "Is every behavior of this change verified by tests?"

| Evaluation Area | Guiding Questions |
| --- | --- |
| **Test Existence** | Corresponding tests present for all new public functions/Hooks? |
| **Boundary Tests** | Empty arrays, null, 0, MAX_INT, empty strings tested? |
| **Error Paths** | `try-catch`, Error Boundaries, network failure scenarios tested? |
| **Async Tests** | Race conditions, timeouts, concurrent invocation scenarios? |
| **Regression Tests** | Preexisting functionality verified against breakage? |
| **Coverage State** | Line/branch coverage of changed code? |

**Verdict**: Missing tests for new public functions → HIGH

### Role 4: Security Reviewer (Security Engineer)

> "Does this change widen the attack surface?"

| Evaluation Area | Guiding Questions |
| --- | --- |
| **Input Validation** | All user inputs validated via Zod / validators? |
| **Auth & Authz** | Auth middleware applied to protected resources? |
| **Secret Management** | Hardcoded API keys, unreferenced env vars? |
| **XSS & Injection** | `dangerouslySetInnerHTML`, raw SQL, `eval()`? |
| **CORS Configuration** | Wildcard origins used in production? |
| **Dependencies** | Known vulnerabilities in new packages? |
| **Data Exposure** | Sensitive data (PII, tokens) printed in logs? |

**Verdict**: Hardcoded secrets or missing auth → CRITICAL

### Role 5: DevOps Reviewer (Platform Engineer)

> "Can this change be safely deployed and operated?"

| Evaluation Area | Guiding Questions |
| --- | --- |
| **Deployment Safety** | Backward compatibility? Cache/data compatibility? |
| **Rollback Capability** | Can it be safely rolled back to the previous version upon incident? |
| **Environment Variables** | Documentation + `.env.example` updated for new env vars? |
| **Resource Utilization** | Memory leaks, infinite loops, unbounded large file processing? |
| **Logging & Observability** | Traceable errors? Appropriate log levels? |
| **Performance Impact** | Bundle size inflation? N+1 queries? Unnecessary re-renders? |

**Verdict**: Backward incompatibility + un-rollbackable → CRITICAL

### Role 6: UI/UX Reviewer (Design Engineer)

> "Does this change deliver a consistent, accessible user experience?"

| Evaluation Area | Guiding Questions |
| --- | --- |
| **Accessibility** | WCAG 2.1 AA compliant? ARIA labels, keyboard navigation? |
| **Responsiveness** | Desktop (1440px), Tablet (768px), Mobile (375px) responsive? |
| **Loading States** | Loading indicators, skeletons for async operations? |
| **Error States** | User-friendly error copy? Recovery paths provided? |
| **Empty States** | Empty state UI present when data is absent? |
| **Consistency** | Design tokens (colors, spacing, typography) followed? |
| **Interactions** | Hover, focus, active state feedback present? |

**Verdict**: Accessibility violations (keyboard traps, insufficient contrast) → HIGH

---

## Execution Protocol

### Parallel Execution Structure

```
Lead (opus): Phase 0 gathering + Phase 3 synthesized verdict
  ├─ Agent A (sonnet): PM + QE Reviewer
  ├─ Agent B (sonnet): Developer + DevOps Reviewer
  └─ Agent C (sonnet): Security + UI/UX Reviewer
```

### Agent Output Format

```markdown
## [Role Name] Review

### Findings

| # | Severity | File:Line | Evaluation Area | Description | Immediate Remediation |
|---|---|---|---|---|---|
| 1 | CRITICAL | src/x.ts:42 | Secret Management | Hardcoded API key | Move to environment variable |

### Role Score: {0-100}
### Go/No-Go: {Go | No-Go}
```

### Synthesis Verdict Matrix

| Condition | Overall Verdict |
| --- | --- |
| All 6 roles Go | **Go** |
| 1-2 roles No-Go (0 CRITICAL) | **Conditional Go** |
| 1+ CRITICAL | **No-Go** |
| 3+ roles No-Go | **No-Go** |

### Enforcing "Future is Now"

- All HIGH+ findings must include concrete remediation steps in the **Immediate Remediation** column.
- Phrases like "next sprint", "later", or "in a separate issue" are **prohibited**.
- MEDIUM findings are recommended for immediate remediation in the current session; LOW findings are optional.

---

## Activation Criteria

| Trigger | Description |
| --- | --- |
| `--multi-perspective` flag | Explicitly activated |
| Deep mode auto-activation | Automatically activated for 16+ modified files or Core modifications |
| `--strict` mode | Automatically activates multi-perspective in strict mode |

---

## feature-pilot Integration

```
feature-pilot Step 6.5 (final-review)
  └─ If activation criteria met
     └─ Execute Multi-Perspective Protocol
        └─ 6-Role parallel evaluation
           └─ Calculate composite Quality Score
              └─ Render Go / Conditional Go / No-Go verdict
```

In Multi-Perspective mode, Quality Score is the **weighted average** of the 6 role scores:

| Role | Weight | Rationale |
| --- | :---: | --- |
| Security | 1.5x | Security defects carry the highest remediation cost |
| Developer | 1.2x | Long-term maintenance cost |
| QE | 1.2x | Missing tests introduce future regressions |
| PM | 1.0x | Requirements alignment |
| DevOps | 1.0x | Deployment and operational stability |
| UI/UX | 0.8x | Relatively lower risk ceiling compared to functionality/security |

```
Weighted Score = Σ(role_score × weight) / Σ(weight)
```
