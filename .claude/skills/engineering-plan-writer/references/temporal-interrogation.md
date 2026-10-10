# Temporal Interrogation — Proactively Resolving Time-Horizon Decisions

> **Purpose**: A temporal framework predicting and answering questions upfront during planning that implementers would otherwise face during development.
> **Used by**: `engineering-plan-writer` (during SPEC → bite-sized task breakdown).

## Purpose

**"We'll decide that during implementation"** is the most common failure pattern in engineering planning. This framework **predicts the exact questions** that emerge at each phase of development and resolves them upfront during planning. It is complementary to `scope-challenge-framework.md` (scope defines horizontal boundaries; temporal interrogation defines vertical execution horizons).

## The Iron Law

> **If the questions an implementer will face at HOUR N are not resolved at HOUR 0, they will be decided improvisationally at HOUR N. Improvisational decisions are undocumented, unreviewed, and structurally inconsistent.**

## The 4 Time Horizons

| Horizon | Human Team | CC + brief2dev | Nature of Decisions Required |
|---------|------------|----------------|------------------------------|
| **HOUR 1** | Foundations | ~5–10 min | What the implementer must know **before typing** |
| **HOUR 2–3** | Core Logic | ~10–20 min | Ambiguities the implementer will encounter during core development |
| **HOUR 4–5** | Integration | ~20–30 min | Surprises and integration friction that emerge when connecting systems |
| **HOUR 6+** | Polish / Observability | ~30–60 min | Things we wish we had planned upfront prior to release |

**Compression Factor**: CC + brief2dev delivers a **10–20x time compression** over human baseline teams. The required decisions remain invariant, but execution speed accelerates dramatically. Plans must always display **both scales**.

## HOUR 1 — Foundations

> What the implementer must know **before starting to type**

**Predictable Questions**:
- Which file receives the new code? (Extending existing patterns vs. new module)
- What config and environment variables are required? What are their default values?
- How are external API credentials accessed? Is there a local development mock/bypass?
- What are the import paths for existing utilities? Are new package dependencies required?
- Is a database migration needed? What is the execution sequence (schema vs. seed)?
- What is the initial TDD test file, test name, and expected failure assertion?

**Output Format in `engineering-plan-writer`**:
```markdown
### Task 1: Foundations (HUMAN: ~1h / CC: ~10min)
- File: `src/features/scheduler/service.ts` (New)
- Config: `SCHEDULER_MAX_SLOTS=5` (default: 3)
- Secret: `SUPABASE_SERVICE_KEY` (Already in environment)
- Dependencies: None (Reuse existing client)
- Migration: Apply `0012_add_scheduler_table.sql` first
- First Test: `service.test.ts > createSlot > should return slot id`
```

## HOUR 2–3 — Core Logic

> Ambiguities the implementer will encounter **while writing main business logic**

**Predictable Questions**:
- The happy path is clear, but how do **edge cases** behave? (nil, empty values, boundaries)
- How are concurrent requests sequenced? Are race conditions possible?
- What is the retry and backoff strategy when external APIs fail?
- Where is the trust boundary for input validation?
- What is the return signature convention: `{data, error}` vs. throwing exceptions?
- What is the logging standard: entry/exit logging, structured JSON format?
- State machines: how are invalid transitions blocked deterministically?

**Output Format in `engineering-plan-writer`**:
```markdown
### Task 2: Core Logic (HUMAN: ~3h / CC: ~15min)
- Happy Path: input validation → create entity → persist → return ID
- Edge Cases:
  - nil/empty title → throw ValidationError
  - duplicate slot → return existing ID (idempotent)
  - DB connection failure → throw ConnectionError (rescued at caller)
- Concurrency: Slot ID generation uses DB sequence (not application-level counter)
- Validation: Zod schema validation at service entry (R-CM-003)
- Return Format: `{ data, error }` (Project convention, R-CM-005)
- Logging: Structured logging, entry + exit at service boundary
```

## HOUR 4–5 — Integration

> Surprises that will **trip up the implementer** when integrating with neighboring systems

**Predictable Questions**:
- What is the coupling with existing modules? Are there circular import risks?
- Who invokes this feature? (REST endpoint / UI action / cron worker)
- Does this conflict with existing auth or row-level security (RLS) policies?
- What is the cache invalidation strategy?
- How are external dependencies mocked in integration tests? (MSW / fixtures / test containers)
- What are the start and end boundaries of the E2E test scenario?
- Backward compatibility: do existing API callers break? Is versioning required?

**Output Format in `engineering-plan-writer`**:
```markdown
### Task 3: Integration (HUMAN: ~2h / CC: ~20min)
- Trigger: POST `/api/scheduler/slots` (New endpoint)
- Auth: Requires RLS policy based on `user_id` (Extend existing policies)
- Caller: Dashboard UI `<SlotPicker>` component
- Caching: None (Real-time slot queries)
- Test Mocks: MSW handler at `test/handlers/scheduler.ts`
- E2E: `e2e/scheduler.spec.ts` — login → navigate → create slot → verify
- Backward Compatibility: New endpoint, zero impact on legacy callers
```

## HOUR 6+ — Polish & Observability

> Things we **wish we had planned upfront** to avoid release-day panics

**Predictable Questions**:
- How are loading, empty, and error UI states rendered?
- Accessibility: focus traps, screen reader labels, contrast compliance?
- Mobile responsiveness: how does the layout collapse on narrow screens?
- User-facing error copy: are technical stack traces shielded from users?
- Observability: what metric immediately indicates this feature is degraded?
- Rollback: if this breaks in production, what is the exact rollback sequence?
- Documentation: which sections in `README.md` or `CLAUDE.md` need updates?
- Should this capability be shielded behind a feature flag?

**Output Format in `engineering-plan-writer`**:
```markdown
### Task 4: Polish & Observability (HUMAN: ~2h / CC: ~30min)
- UI States: Loading skeleton, empty "No slots available" state, error retry CTA
- Accessibility: Focus trap on modal, aria-label on action buttons, contrast ≥ 4.5:1
- Mobile: `<SlotPicker>` stacks vertically on viewports < 640px
- Error UX: "Please try again shortly" (No raw stack traces exposed)
- Metrics: `scheduler.slot.create.count` + `scheduler.slot.create.duration_ms`
- Rollback: Feature flag `enable_scheduler` (Default off; monitor 10 mins post-toggle)
- Docs: Document new endpoint in API Routes section of `CLAUDE.md`
```

## Effort Notation (Always Display Both Scales)

Plans produced by `engineering-plan-writer` **always present both time scales side by side**. The SSOT for exact compression figures per task type is the "AI Effort Compression Table" in `SKILL.md`.

**Why Both Scales Are Displayed**:
1. Users often reason in human-team timelines based on past organizational experience.
2. The CC + brief2dev scale provides the realistic delivery ETA.
3. The compression ratio validates whether a task is small enough for complete implementation.

## When a Horizon Has "No Open Questions"

If a horizon appears to have no open questions, they have not been uncovered yet:

- HOUR 1: Virtually all features require config or environment awareness. Verify environment differences.
- HOUR 2–3: Pure happy-path implementations indicate unexamined edge cases. Re-examine nil/empty boundaries.
- HOUR 4–5: If there are no integration points, is this feature truly connected to anything?
- HOUR 6+: If polish is omitted, what does the end user see when the first error occurs?

A "None" entry is permitted at most once; consecutive "None" entries indicate superficial analysis.

## Integration Workflow

```
[SPEC.md Input]
      ↓
[Apply scope-challenge-framework — Constrain horizontal scope]
      ↓
[Apply temporal-interrogation — Resolve vertical horizon questions]
      ├─ HOUR 1 Tasks (Foundations)
      ├─ HOUR 2–3 Tasks (Core Logic)
      ├─ HOUR 4–5 Tasks (Integration)
      └─ HOUR 6+ Tasks (Polish & Observability)
      ↓
[Bite-Sized Task Breakdown — Dual Human/CC scale per task]
      ↓
[Engineering Plan Output]
```

## Anti-Patterns

- ❌ "We will decide during implementation" — Unresolved decisions undermine plan integrity.
- ❌ Displaying only human scale (obscures AI velocity advantages).
- ❌ Displaying only CC scale (loses baseline engineering context).
- ❌ Detailing only HOUR 1 while glossing over HOUR 4–5 (integration surprises cause major rework).
- ❌ "Polish later" — Skipping HOUR 6+ causes release bottlenecks.
- ❌ Vague task titles ("Build scheduler") — Without temporal interrogation, tasks remain ambiguous.

## Completeness Validation

Classify answers across each horizon as "complete" vs. "shortcut":

- **Complete**: Decisions are unambiguous; implementers require no additional clarification.
- **Shortcut**: Contains deferrals like "decide later" or "basic implementation for now".

If 2+ shortcuts remain, the plan is **not ready for execution**. Resolve remaining shortcuts before finalizing the plan.
