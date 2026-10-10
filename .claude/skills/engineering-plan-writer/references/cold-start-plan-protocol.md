# Cold-Start Planning Protocol

> **Source**: ECC `blueprint/SKILL.md` + `commands/prp-plan.md` (PRPs-agentic-eng by Wirasm)
> **Transplant**: `tp-everything-claude-code-round2-20260402`, asset-R2-03 (inspired)

## Purpose

Ensures every task step embeds a **self-contained context brief**, allowing a fresh agent session to execute independently without parsing prior steps.

## The PRP Golden Rule

> **"If you would need to search the codebase during implementation, capture that knowledge NOW in the plan."**

When the plan is thorough, implementation becomes deterministic execution. When the plan is incomplete, implementation devolves into repetitive searching, wasting context windows and losing cross-session knowledge.

## Cold-Start Context Brief Template

Include the following 6 elements in every task step:

```markdown
### Task {N}: {Title}

**ACTION**: What is being done (Single clear sentence)
**IMPLEMENT**: Concrete code and logic (File path + exact edits)
**MIRROR**: Existing codebase pattern to replicate (File:line reference)
**IMPORTS**: Required import statements (Full absolute paths)
**GOTCHA**: Known pitfalls (Version quirks, hidden dependencies, edge cases)
**VALIDATE**: Verification commands (Test, build, lint)
```

### Example

```markdown
### Task 3: Add Payment Webhook Handler

**ACTION**: Create Stripe webhook POST endpoint
**IMPLEMENT**: Create POST handler in `src/features/payment/api/webhook.ts`.
  Verify signature → branch on event type → process `payment_intent.succeeded`.
**MIRROR**: `src/features/auth/api/callback.ts:15-40` — External service callback pattern
**IMPORTS**: `import { stripe } from '@/shared/lib/stripe-client'`
  `import { updatePaymentStatus } from '../repositories/payment-repository'`
**GOTCHA**: Stripe webhooks require raw body access — ensure `bodyParser: false` in Next.js config
**VALIDATE**: `npm run test -- --filter=webhook && npm run typecheck`
```

## 8-Category Codebase Exploration

Prior to generating plans, explore these 8 categories thoroughly. Findings directly populate `MIRROR`, `IMPORTS`, and `GOTCHA` blocks in each task.

| # | Category | Exploration Target |
|---|----------|--------------------|
| 1 | Similar Implementations | Existing components, functions, or endpoints solving analogous problems |
| 2 | Naming Conventions | Casing and naming standards for files, functions, variables, and exports |
| 3 | Error Handling | How analogous code paths catch, propagate, log, and format errors |
| 4 | Logging Patterns | What information is logged, at what severity level, and in what format |
| 5 | Type Definitions | Existing types, interfaces, schemas, and structural organization |
| 6 | Testing Patterns | Test structure, naming, fixtures, mocks, and assertion conventions |
| 7 | Configuration | Relevant config files, environment variables, and feature flags |
| 8 | Dependencies | Packages, libraries, and internal shared utilities used by similar modules |

### Unified Discovery Table

Compile exploration findings into a unified reference matrix:

| Category | File:Line | Pattern | Key Snippet |
|----------|-----------|---------|-------------|
| Naming | `src/features/auth/api/login.ts:1-5` | camelCase services, PascalCase types | `export class AuthService` |
| Error | `src/shared/lib/errors.ts:10-25` | Custom AppError class hierarchy | `throw new AppError(...)` |

## Execution Readiness Self-Audit

Pass these 4 checklists before finalizing a plan:

### 1. Context Completeness
- [ ] Have all relevant files been identified?
- [ ] Are hidden runtime dependencies and indirect imports accounted for?
- [ ] Are required environment variables and configs documented?

### 2. Implementation Readiness
- [ ] Does every task include ACTION / IMPLEMENT / MIRROR / VALIDATE blocks?
- [ ] Are code snippets grounded in actual codebase patterns rather than invented syntax?
- [ ] Are VALIDATE commands executable out of the box?

### 3. Pattern Fidelity
- [ ] Does the implementation adhere strictly to established codebase conventions?
- [ ] Is there explicit justification for introducing any new architectural pattern?
- [ ] Does naming align with existing project conventions?

### 4. Zero Prior Knowledge Test
> "Could a developer completely unfamiliar with this codebase implement this feature relying **exclusively** on this plan?"

If the plan fails this test, critical context is missing.

## Application in brief2dev

### Integration with `engineering-plan-writer`

`engineering-plan-writer` operates on a zero-context engineering philosophy. This protocol reinforces task breakdown with a **structured context brief**.

**Application Point**: `engineering-plan-writer` Step 2 (Task Breakdown)
- Standard: Task file paths + code snippets + test commands.
- Enhanced: + `MIRROR` (patterns to follow) + `GOTCHA` (pitfalls) + `IMPORTS` (complete paths).

### Synergy with Parallel Execution

Self-contained context briefs enable subagents to execute in **isolated parallel worktrees** without blocking on neighboring tasks.

### Complementary Relationship with `scope-challenge-framework`

- `scope-challenge-framework.md` — Prevents over-scoping (what to **exclude**).
- `cold-start-plan-protocol.md` — Ensures self-containment for retained tasks (what is **sufficient**).
