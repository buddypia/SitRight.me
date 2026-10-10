# Final Review Protocol Details

> Archive note: This file is an archive of the legacy full final-review protocol from `final-review/SKILL.md`.
> In standard operation, follow the execution contract in `SKILL.md`, and consult this file only when detailed axis rubrics, output templates, option examples, or phase procedures are needed.

# Final Review

> **Core Concept**: "Critically evaluate across 8 axes through the perspective of the most rigorous, meticulous Senior QA Engineer + Architecture Reviewer"

The **final quality gate** invoked upon implementation completion or immediately prior to commit/PR.
Automatically collects changes to verify process tracing, blast radius, logic defects, edge cases, security, performance, test sufficiency, rollback/operational risk, and long-term viability with Complexity ROI.

**Can be automatically invoked at feature-pilot Step 6.5** (when trigger criteria are met). Standalone invocation is also supported.

---

## Core Principles

1. **Adversarial Mindset**: Never assume the code is correct. First ask: "Why could this fail?"
2. **Evidence-Based**: Judge based on concrete code, diffs, and execution results rather than speculation.
3. **Read-Only**: Never modify code directly. Report findings only; delegate fixes to caller or user.
4. **Change-Centric Analysis**: Focus analysis on code written/edited in the current session and its immediate context. Inspect full files only when tracing blast radius.

---

## Adaptive Depth

Automatically regulates review depth based on change scale and characteristics.

### Depth Determination Matrix

```
After Phase 0 Scope Detection → Determine depth via following matrix
```

| Depth | Criteria | Executed Axes | Edge Cases | Quality Score |
| :---: | --- | :---: | :---: | :---: |
| **Quick** | 1-3 changed files AND 0 HIGH severity categories | Axes 1, 2, 3 | Min 3 | Computed |
| **Standard** | 4-15 changed files OR 1+ HIGH severity categories | All Axes 1-8 | Min 5 | Computed |
| **Deep** | 16+ changed files OR Core changes OR `--deep` flag | All Axes 1-8 + Parallel Subagents | Min 7 | Computed |

### Mandatory Standard+ Criteria (Quick Prohibited)

If any of the following apply, depth is **at least Standard**:

- Changes to `hooks/use*.ts` or `providers/*.ts`
- Changes to `src/**/types/` or `src/**/api/`
- Changes to `{SOURCE_ROOT}/api/` (framework-specific API directory)
- Changes to `{SHARED_DIR}/`
- Changes to `package.json` dependencies
- Changes to Zod schemas

### De-Sloppify Protocol (Deep Mode)

When change scale is large or shared code is touched, execute a 3-pass systematic inspection:

| Pass | Focus | Convergence Criteria |
| --- | --- | --- |
| Pass 1: Structural | File structure, import paths, types | 0 CRITICAL findings |
| Pass 2: Behavioral | Edge cases, async races | 0 new findings (max 2 iterations) |
| Pass 3: Contractual | Security, API contracts, test sufficiency | Quality Score computed |

Details: `references/de-sloppify-protocol.md`

### Deep Mode Parallelization

In Deep mode, split axes into 2 groups analyzed in parallel by subagents:

```
Lead: Phase 0 + Phase 1 + Phase 3 (Synthesis & Verdict)
+-- Agent A (opus): Axis 1 (Process Trace & Impact) + Axis 2 (Logic & Data Flow) + Axis 6 (Test Sufficiency & Evidence) + Axis 7 (Rollback & Operations)
+-- Agent B (opus): Axis 3 (Edge Cases & Failure Modes) + Axis 4 (Security & Privacy) + Axis 5 (Performance & Resources) + Axis 8 (Long-term Viability & Complexity ROI)
```

Each agent applies **Cognitive Pattern Lenses** in addition to 8-Axis quantitative evaluations:
- Agent A: Architecture Lens (#1-5) → Applied to Axes 1/7
- Agent B: Risk/Operations Lens (#11-15) → Applied to Axes 3/4/8
- Lead: Code Quality Lens (#6-10) → Applied to Phase 3 Synthesis

Reference: `references/eng-review-cognitive-patterns.md`

### Multi-Perspective Protocol Integration

In Deep mode or when `--multi-perspective` is enabled, run independent evaluations across **6 expert perspectives (PM / Developer / QE / Security / DevOps / UI-UX)** in addition to the 8-Axis review.

Details: `references/multi-perspective-protocol.md`
Reference: `references/pr-review-protocol.md` (R-CM-012 execution engine — GitHub CLI execution + 6-role weighted scoring)

**Activation Criteria**:
- Explicit `--multi-perspective` flag
- Deep mode auto-activation (16+ changed files or Core modifications)
- `--strict` mode (automatically activated)

**Consolidated Verdict**: Synthesize 6-role weighted average score + 8-Axis Quality Score for final Go/No-Go.
Rule: R-CM-012 (`rules/common/multi-perspective-review.md`)

**Santa Adversarial Dual-Review in Deep / `--strict` Mode**:
While multi-perspective covers **breadth** (6 roles), the Santa protocol covers **depth** (adversarial convergence) via 2 independent agents.
NICE (both pass) → Proceed to Go. NAUGHTY → Remediate and re-review (MAX 3 iterations).

Reference: `references/santa-adversarial-review-protocol.md`

**Developer Perspective Deepening**: Apply DX 3-mode methodology when evaluating the Developer role.
Reference: `references/devex-review-methodology.md` (DX TRIAGE/POLISH/EXPANSION 3-mode + 7 Persona archetypes + TTHW Benchmarks)

---

## EXECUTION PROTOCOL (MANDATORY)

### PATH CONTRACT (MANDATORY)

> **BINDING**: This skill uses dynamic path placeholders.
> The AI must resolve paths from `project-config.json` before analyzing files.
> Using literal paths is a **protocol violation**.

| Placeholder | Resolution Source | Default |
| --- | --- | --- |
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{SHARED_DIR}` | `project-config.paths.shared` | `src/shared` |

**Resolution**: `Read project-config.json → Resolve placeholders → Use resolved values`
**Fallback**: If project-config.json does not exist, use Default column

**FORBIDDEN**: Never use literal `src/features/` or `src/shared/` in analysis paths.

### Pre-flight Checklist (Mandatory Prior to Execution)

Output and verify the following checklist before executing the skill:

```markdown
## Pre-flight Verification

| # | Item | Status | Remarks |
| :-: | --- | :--: | --- |
| 1 | 1+ files Written/Edited within session | -- | Collected from conversation context |
| 2 | Review target scope is isolated | -- | Session-modified files only (no git diff) |
| 3 | `make q.lint` executable | -- | Check Makefile quality gate access |
| 4 | Adaptive Depth determined | -- | Quick / Standard / Deep |

→ Proceed after verifying all items
→ If Item 1 fails, halt immediately ("No changes detected")
```

### Model Routing Policy

| Task Type | Model | Rationale |
| --- | --- | --- |
| Scope Detection (Phase 0) | Lead (Self) | Context gathering + Read operations |
| Automated Gate (Phase 1) | Lead (Self) | Bash command execution |
| Critical Review (Phase 2, Standard) | Lead (Self, opus) | Deep code understanding + critical analysis |
| Critical Review (Phase 2, Deep) | Agent (opus) | Parallel analysis |
| Synthesis & Verdict (Phase 3) | Lead (Self) | Aggregation + Quality Score computation |

- **Default Model**: opus (Critical analysis requires highest-tier reasoning)
- **Fallback Chain**: opus → sonnet

### Evidence Policy (Cache Policy)

| Verification Type | TTL | Invalidation Condition | Cache Key |
| --- | :---: | --- | --- |
| lint | 30 mins | Modification to `src/**/*.ts` | `lint_result` |
| test | 30 mins | Modification to `tests/**/*.ts` | `test_result` |

### Post-flight Checklist (Mandatory Post-Execution)

```markdown
## Post-flight Completion Checklist

| # | Item | Status | Remarks |
| :-: | --- | :--: | --- |
| 1 | All review axes executed per Adaptive Depth | -- | Quick=3 axes, Standard/Deep=8 axes |
| 2 | Explicit warnings displayed on CRITICAL findings | -- | |
| 3 | Lint results included | -- | |
| 4 | Test results included | -- | |
| 5 | Quality Score computation completed | -- | |
| 6 | Final Go/No-Go verdict output | -- | |

→ Report completion upon verifying all items
→ If any item fails, remediate and re-verify
```

### Self-Review Bias Check

> When an AI reviews code it authored, **Confirmation Bias** arises.
> The AI tends to unconsciously validate its own design decisions.

**Mandatory Requirements** (When review target was authored by AI in the current session):

1. **Counter-factual Questions**: Explicitly pose at least 1 "What if I am wrong?" question on each axis.
2. **Alternative Proposals**: Cite at least 1 alternative approach for major design decisions.
3. **Bias Notice**: Display "Self-Review: Review target was authored by AI within the same session" warning at the top.
4. **Fundamental Questions**: Explicitly answer the following 4 self-reflection questions at the end of the report:
   - Was this change truly necessary? Could existing code solve it?
   - Were simpler alternatives evaluated?
   - Does any added code have zero impact on functionality if deleted?
   - Did the AI question its own core premises and assumptions?

**Note**: This section does not apply when reviewing code authored by external developers or from prior sessions.

### Violation Protocol

| Violation Type | Severity | Action |
| --- | :---: | --- |
| Pre-flight not output | CRITICAL | Halt immediately, restart from beginning |
| Missing review axes (Below depth requirement) | HIGH | Execute missing axes and update report |
| Attempting code modifications | CRITICAL | Halt immediately, warn of Read-Only violation |
| Post-flight unverified | HIGH | Execute verification prior to completion report |

---

## Execution Flow

```
Output Pre-flight Checklist + Verify
        v (All verified)
Phase 0: Scope Detection + Adaptive Depth Determination
  Gather session Write/Edit → Classify files → Decide depth
        v
Phase 1: Automated Quality Gate
  make q.lint + make q.test + Architecture checks
        v (Upon pass)
Phase 2: 8-Axis Critical Review
  Quick=Axes 1,2,3 / Standard,Deep=Axes 1~8
        v
Phase 3: Synthesis + Quality Score + Report Generation
  Compute Quality Score → Go / Conditional Go / No-Go
        v
Output Post-flight Checklist + Verify
        v (All verified)
Completion Report
```

---

## Phase 0: Scope Detection & Depth Determination

**Goal**: Automatically isolate review targets, comprehend the full change picture, and decide Adaptive Depth.

### Gathering Method -- Session-Scoped

> **Principle**: Review targets consist **strictly of files Written/Edited by the AI within this chat session**.
> Never use `git diff` or `git status`, which may pull unrelated changes from other sessions.

**Gathering Procedure**:

1. Extract all `file_path`s from **Write/Edit tool calls executed by the AI** in conversational context.
2. Deduplicate to establish the review target file list.
3. Read the current contents of each file to understand changes.

**Fallback** (When context history is lost to compaction):
- Prompt user to confirm the target file list.

### File Classification

Automatically classify modified files into the following categories:

| Category | Path Pattern | Priority |
| --- | --- | :---: |
| **API Routes** | `{SOURCE_ROOT}/api/` (framework-specific API dir) | HIGH |
| **Hooks** | `src/**/hooks/use*.ts` | HIGH |
| **Types/Schema** | `src/**/types/`, `*.schema.ts` | HIGH |
| **Components** | `src/**/components/*.tsx` | MEDIUM |
| **Shared/Core** | `{SHARED_DIR}/`, `src/config/` | HIGH |
| **Features** | `{FEATURES_DIR}/*/` | MEDIUM |
| **Test** | `tests/` | MEDIUM |
| **Config** | `package.json`, `tsconfig.json`, `.claude/` | LOW |
| **Docs** | `docs/`, `*.md` | LOW |

### Depth Determination

Apply the Adaptive Depth matrix based on file classification to decide Quick / Standard / Deep. Record result in PF-004.

### CONTEXT.json Integration (Optional)

When `--feature <feature-id>` is provided or when invoked from `feature-pilot`:

1. Read `docs/features/{feature-id}/CONTEXT.json`.
2. Cross-check `references.related_code` against actual modified files.
3. Compare implementation against FR (Functional Requirement) list in `SPEC.md` → Feed into Axis 6 (Test Sufficiency).

---

## Phase 1: Automated Quality Gate

Verify mechanically testable items prior to analytical review.

```bash
# 1. Static Analysis
make q.lint

# 2. Test Execution
make q.test

# 3. Architecture Dependency Verification
make q.check-architecture
```

**Evaluation Criteria**:

| Gate | Pass Condition | On Failure |
| --- | --- | --- |
| `make q.lint` | Warnings allowed, 0 errors | **No-Go** (Phase 2 aborted) |
| `make q.test` | All tests pass | **No-Go** (Report failed test list) |
| `architecture` | 0 violations (excluding Known Debt) | Warning (Analyzed further in Axis 1) |

**CLAUDE.md Coding Rule Compliance Check**:

Mechanically detect CLAUDE.md forbidden patterns in modified `.ts`/`.tsx` files:

| # | Forbidden Pattern | Severity |
| :-: | --- | :---: |
| 1 | `console.log` usage (except in tests) | HIGH |
| 2 | Overuse of `any` type | HIGH |
| 3 | Hardcoded UI strings | HIGH |
| 4 | Ignored errors `catch (e) {}` | HIGH |
| 5 | Direct `innerHTML` manipulation | HIGH |
| 6 | Use of `responseSchema` (Gemini proprietary format) | HIGH |
| 7 | Overuse of `as` type assertions | MEDIUM |
| 8 | Missing `/** */` JSDoc comments on new public functions | LOW |
| 9 | Architectural import violations (`shared` → `feature`) | CRITICAL |
| 10 | Mutable global state | HIGH |

**Method**: Read each modified file to search for these patterns. Add findings to Phase 2 aggregated results.

> **On Automated Gate Failure**: Halt immediately without proceeding to Phase 2; report failure + set Quality Score = 0.
> Mechanically detectable failures do not require human or AI cognitive review.

> **`--skip-gate` Option**: When already validated in feature-pilot Step 6, Phase 1 can be skipped.
> Note "Validated in Step 6" in Post-flight checks POF-003 and POF-004.

---

## Phase 2: 8-Axis Critical Review

> Quick mode: Executes Axes 1, 2, 3 only
> Standard / Deep mode: Executes all Axes 1-8

### Axis 1: Process Trace & Impact Analysis

> "Did this change originate from agreed intent, and is the blast radius across other systems traced?"

**Checklist**:

| Perspective | Check Items |
| --- | --- |
| **Requirements Link** | Are mappings between SPEC/BRIEF/Acceptance Criteria and modified files clear? |
| **Process Sequence** | Is the sequence of Requirements → Design → Implementation → Tests unbroken? |
| **Component Impact** | Trace all components consuming modified Hooks. Risk of UI breakage? |
| **API Impact** | When API Route interfaces change, do client call sites match contracts? |
| **Data Impact** | When schemas/types change, is data backward-compatible? Migration required? |
| **External APIs** | Changes to external API (Gemini) invocation patterns? Rate limit impact? |
| **Cross-Feature** | Feature dependency violations? Missing indirect dependencies? |
| **Shared Models** | Changes to `{SHARED_DIR}/types/` impacting downstream feature consumers? |

**Method**: Trace `import` graphs backward for every modified file to generate an impact map.

**Impact Map Format**:

```
Modified File A
  <- Imported by: File B
  <- Imported by: File C
    <- Imported by: File D  <- Secondary Impact
```

### Axis 2: Logic & Data Flow

> "Is the logic of this code internally consistent?"

**Checklist**:

| Perspective | Check Items |
| --- | --- |
| **State Transitions** | Do React Hook state transitions cover all branches? |
| **Branching Logic** | Are there unhandled cases in `if-else` / `switch` blocks (especially union types)? |
| **Data Flow** | Is data unintentionally lost or corrupted during input → transform → output? |
| **Timing & Race** | Is async invocation order correct? Risk of race conditions? |
| **Null Propagation** | Are nullable values propagated into non-null contexts? |
| **Type Integrity** | Do Zod schemas and TypeScript types align consistently? |
| **Dead Code** | Did changes introduce unused code (unreferenced imports, uncalled methods)? |

**React Hooks Anti-Pattern Detection**:

Detect runtime anti-patterns in React Hooks that escape static analysis:

| # | Anti-Pattern | Detection Method | Risk |
| :-: | --- | --- | :---: |
| 1 | Missing `useEffect` dependencies | Variables used in `useEffect` omitted from dependency array | HIGH |
| 2 | Conditional Hook invocation | Hooks called inside `if` statements or after early returns | CRITICAL |
| 3 | Unnecessary `useState` re-renders | Recreating new objects/arrays inside state setters every render | MEDIUM |
| 4 | `useCallback`/`useMemo` dependency mismatch | Variables missing from memoization dependency arrays | HIGH |
| 5 | Using `useRef.current` in dependency arrays | `ref.current` is not tracked by React reactivity | MEDIUM |
| 6 | Missing cleanup functions | Missing unbinds for event listeners or subscriptions | HIGH |

### Axis 3: Edge Cases & Failure Modes

> "How does this code behave under extreme conditions outside the happy path?"

Minimum edge cases required: Quick=3, Standard=5, Deep=7

**Discovery Framework**:

| Category | Investigation Direction |
| --- | --- |
| **Empty Data** | 0 list items, null responses, empty strings |
| **Huge Payloads** | 10,000 items, extremely long text, massive JSON payloads |
| **Concurrency** | Concurrent browser tabs, duplicate submissions, rapid clicks |
| **Network** | Offline states, timeouts, partial streams, degraded bandwidth |
| **State Desync** | Operations during auth token expiration, sessionless access |
| **Anomalous Inputs** | Special characters, emojis, RTL text, SQL/JS injection vectors |
| **Browser Environment** | Chrome/Safari/Firefox quirks, viewport scaling, dark mode, a11y |
| **Time Boundaries** | Midnight boundaries, timezone mutations, DST transitions, past/future dates |

For each edge case:

```
- **Scenario**: [Concrete description of situation]
- **Current Behavior**: [Expected code reaction with citing file:line]
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Remediation**: [Concrete fix proposal]
```

### Axis 4: Security & Privacy

> "Does this change widen the attack surface?"

**Checklist**:

| Perspective | Check Items |
| --- | --- |
| **Input Validation** | Is user input validated prior to server transmission? |
| **Auth & Authz** | Are protected resources reachable without auth validation? |
| **Data Exposure** | Are secrets (API keys, PII) printed to logs? |
| **XSS / Injection** | Is unsanitized user input rendered to the DOM? |
| **API Routes** | Do Route Handlers enforce appropriate authentication and schema validation? |
| **API Key Management** | Are secrets hardcoded? Are env vars properly utilized? |
| **Dependencies** | Are known CVEs present in newly introduced packages? |
| **Privacy & PII** | Are PII, tokens, or tenant data exposed in logs, responses, or client state? |

### Axis 5: Performance & Resources

> "Does this change degrade perceived performance for users?"

**Checklist**:

| Perspective | Check Items |
| --- | --- |
| **Re-renders** | Are unnecessary re-renders triggered? Is `useMemo`/`useCallback` needed? |
| **Memory** | Are listeners and subscriptions cleaned up? Memory leaks? |
| **Network** | Duplicate API calls? Is caching strategy appropriate? |
| **Rendering** | Is virtualization applied to large lists? |
| **Bundle Size** | Are heavy libraries imported unnecessarily? Tree-shakeable? |
| **Images** | Optimized image assets? `next/image` used? Large file handling? |
| **Async Flow** | Are independent calls serialized with redundant `await`s? Use `Promise.all()`? |

**Resource Cleanup & Exception Safety**:

| # | Inspection Item | Verification Method | Risk |
| :-: | --- | --- | :---: |
| 1 | **Missing cleanup** | Are resources released in `useEffect` return functions? | HIGH |
| 2 | **AbortController** | Are cancellation signals applied to fetch requests? | MEDIUM |
| 3 | **Timer leaks** | Are all timers cleared with `clearTimeout`/`clearInterval`? | HIGH |
| 4 | **EventListener leaks** | Does every `addEventListener` have a matching `removeEventListener`? | HIGH |
| 5 | **Async cleanup** | Does cleanup perform async operations requiring synchronization? | MEDIUM |

### Axis 6: Test Sufficiency & Evidence

> "Do written tests genuinely assert the modified behavior?"

Passing `commands.test` is meaningless **if tests covering the changed code do not exist**.
Doc-only and config-only changes must record exemption justifications alongside alternative regression test evidence.

**Checklist**:

| Perspective | Check Items |
| --- | --- |
| **Changed Code Coverage** | Do corresponding `tests/` files exist for modified `src/` files? |
| **New Public Functions** | Are tests present for newly added public functions? |
| **New Branches** | Do tests cover newly added `if`/`switch` branches? |
| **Modified Behaviors** | Are regression tests updated for altered method behaviors? |
| **Hook Tests** | Do unit tests exist for new Hooks? |
| **Error Paths** | Are error handling paths inside `try-catch` blocks tested? |
| **SPEC FR Mapping** | Does each FR in `SPEC.md`/`CONTEXT.json` have corresponding tests? |

**Coverage Mapping Table**:

```markdown
| Modified File | Corresponding Test | Coverage Status |
| --- | --- | :---: |
| {FEATURES_DIR}/code-sandbox/hooks/use-terminal.ts | tests/unit/features/code-sandbox/use-terminal.test.ts | OK |
| {SHARED_DIR}/lib/ai-client.ts | (None) | NG |
```

### Axis 7: Rollback & Operations

> "Can this change be safely rolled back if issues emerge post-deployment?"

**Risk Matrix**:

| Change Type | Reversibility | Risk Tier |
| --- | :---: | :---: |
| UI only (Components, styling) | High | LOW |
| Hook logic | High | LOW |
| Schema field addition (Backward compatible) | High | MEDIUM |
| Schema field deletion/modification (Breaking) | Low | HIGH |
| API Route interface changes | Low | HIGH |
| `package.json` dependency additions/removals | Moderate | MEDIUM |

**Checklist**:

| Perspective | Check Items |
| --- | --- |
| **Data Compatibility** | Did persistent data structures change? Compatible with existing records? |
| **API Compatibility** | Did response payloads mutate? Compatible with running clients? |
| **Feature Flags** | Are high-risk modifications wrapped in Feature Flags? |
| **Cache Invalidation** | Is cached data compatible with the new schema? |
| **Operational Telemetry**| Do logs, error metrics, and diagnostic paths exist to catch failures? |

### Axis 8: Long-term Viability & Complexity ROI

> "Is this solution maintainable 3-5 years into the future?"

**Checklist**:

| Perspective | Check Items |
| --- | --- |
| **Root Cause vs Hack** | Did this solve the root cause, or merely mask symptoms? |
| **Technical Debt** | Are new TODOs/FIXMEs/HACKs introduced? Recorded in Known Debt? |
| **Scalability** | Does the design hold if data, users, or throughput scale 10x? |
| **Pattern Consistency**| Adherence to project standards (Feature-First, React Hooks, Zod)? |
| **Testability** | Is added code testable? Dependency-injected where appropriate? |
| **Readability** | Can another engineer (or AI) comprehend this in 6 months? |
| **Ease of Deletion** | Can this code be cleanly decoupled if deprecated in the future? |
| **Framework Migration**| Compatibility risks during major Next.js/React framework upgrades? |

**Overengineering & YAGNI Detection**:

| # | Pattern | Guiding Question | Risk |
| :-: | --- | --- | :---: |
| 1 | Unnecessary Abstraction | Was an interface/abstract class created with only 1 implementation? | HIGH |
| 2 | Excessive File Splitting | Was code separated into distinct files where inline logic suffices? | MEDIUM |
| 3 | Reinventing Existing Utils | Was a utility written from scratch when `shared/lib/` already contains it? | HIGH |
| 4 | Out-of-Scope Scope Creep | Were unrequested features or infrastructure layers added? | HIGH |
| 5 | Infrastructure Anchoring | Did adherence to legacy infra prevent selecting simpler alternatives? | MEDIUM |
| 6 | Premature Speculation | Was unused code added because "we might need it someday"? | MEDIUM |

---

## Phase 3: Synthesis & Verdict

### Severity Classification

Classify all findings into the following severities:

| Severity | Definition | Penalty | Action |
| :---: | --- | :---: | --- |
| **CRITICAL** | Data loss, security vulnerability, runtime crash | -25 | **Mandatory fix before commit** |
| **HIGH** | Functional defect, severe performance drop, missing tests | -10 | **Strongly recommended fix** |
| **MEDIUM** | Unhandled edge case, maintainability degradation | -3 | Fix in current or subsequent sprint |
| **LOW** | Minor polish suggestion, style enhancement | -1 | Optional fix |

### Quality Score (0-100)

```
Quality Score = 100 - (CRITICAL x 25) - (HIGH x 10) - (MEDIUM x 3) - (LOW x 1)
Floor: 0 (No negative scores)
```

| Score Range | Grade | Meaning |
| :---: | :---: | --- |
| 90-100 | A | Excellent -- Production Ready |
| 75-89 | B | Good -- Minor Improvements Recommended |
| 60-74 | C | Fair -- Remediations Required |
| 40-59 | D | Poor -- Major Fixes Required |
| 0-39 | F | Failing -- Overhaul Required |

### Go/No-Go Verdict Criteria

| Verdict | Conditions |
| --- | --- |
| **Go** | CRITICAL=0, HIGH=0, Score >= 80, Automated Gates passed |
| **Conditional Go** | CRITICAL=0, HIGH<=2, Score >= 60, Trackable via separate issues |
| **No-Go** | CRITICAL>=1 OR HIGH>=3 OR Score < 60 OR Automated Gates failed |

### `--strict` Mode

Conditional Go is prohibited. Only Go or No-Go.

- Go Requirement: CRITICAL=0, HIGH=0, Quality Score >= 90
- Supplemental Adversarial Review executed → Compared against standard 8-Axis review in Cross-Model format. +10% weighting on adversarial-only findings.

Reference: `references/cross-model-review-format.md`

### Phase 3.5: Auto-Fix Suggestion

When **1+ CRITICAL or HIGH findings exist** post-report, prompt the user for approval:

```markdown
> **Discovered {N} CRITICAL / {M} HIGH findings.**
> Would you like to proceed with automated remediation?
```

Execute remediation only after receiving explicit approval via `AskUserQuestion`.

**Remediation Scope Constraints**:

- Automatically fix CRITICAL and HIGH findings only (MEDIUM/LOW are suggestions only)
- Re-run `commands.lint` + relevant tests post-fix (skip if null)
- Verify fixes do not introduce new regressions

**When Auto-Fix is Impossible**: Present concrete code snippets and delegate manual remediation to the user.

> **Note**: Phase 3.5 is a **distinct post-review step**. The objectivity of the review report remains independent of whether fixes are executed.

---

## Options

| Option | Description | Default |
| --- | --- | --- |
| `--feature <id>` | Analyze integration with specific feature's `CONTEXT.json`/`SPEC.md` | Auto-detected |
| `--skip-gate` | Skip Phase 1 Automated Gate (when already executed in feature-pilot Step 6) | false |
| `--focus <axis>` | Focus review exclusively on specified axis (1-8) | Depth-dependent |
| `--strict` | Disallow Conditional Go (Go or No-Go only, Score >= 90 required) | false |
| `--deep` | Force Deep mode (Parallel subagent analysis) | Auto-detected |
| `--quick` | Force Quick mode (Axes 1, 2, 3 only, ignoring mandatory Standard rules) | Auto-detected |

---

## feature-pilot Integration (Step 6.5)

### Trigger Criteria

Automatically invoked post-Step 6 (Reviewing, `make q.check` passed) if **any** of the following apply:

| Condition | Rationale |
| --- | --- |
| 6+ modified files | Medium+ changes exceed mechanical gate reliability |
| Modified Hook files | State management changes carry wide blast radius |
| Modified Zod schemas | Data contract changes affect multiple consumers |
| Modified API Routes | Server/client contract mutations |
| Modified `{SHARED_DIR}/` | Shared code changes impact all features |

### Invocation Parameters

```
/final-review --skip-gate --feature {current_feature_id}
```

- `--skip-gate`: Avoids redundant execution since `make q.lint` and `make q.test` passed in Step 6.
- `--feature`: Passes feature ID to enable automated `SPEC.md` FR mapping.

### Transition Matrix

| final-review Verdict | feature-pilot Transition |
| :---: | :---: |
| **Go** | Proceed to Step 7 (`feature-status-sync`) |
| **Conditional Go** | Display warnings + Proceed to Step 7 (Record findings in separate issues) |
| **No-Go** | Revert to `Implementing` (Remediate and re-execute Step 6) |

---

## Constraints

| Constraint | Rationale | On Violation |
| --- | --- | --- |
| **Read-Only** | Reviewers do not modify code directly | Halt immediately + warn on edit attempts |
| **Change Scope Boundary** | Code outside session Write/Edit is out of scope (blast radius tracing allowed) | Explicit out-of-scope notice |
| **Evidence Mandatory** | All findings must cite concrete code locations and reasoning | Unsubstantiated concerns omitted |
| **Quick Mode Limits** | Quick mode executes Axes 1, 2, 3 only | Explicitly note remaining axes as "Unanalyzed" |

---

## Output Format

### Report Template

```markdown
# Final Review Report

> **Scope**: {N} files ({Added / Modified / Deleted} summary)
> **Depth**: Quick / Standard / Deep
> **Quality Score**: {Score}/100 ({Grade})
> **Verdict**: Go / Conditional Go / No-Go

---

## Phase 0: Scope Detection & Depth Determination

| Category | File Count | Priority | Primary Files |
| --- | :---: | :---: | --- |
| API Routes | N | HIGH | ... |
| Hooks | N | HIGH | ... |
| Components | N | MEDIUM | ... |

**Adaptive Depth**: {Determination Rationale}

---

## Phase 1: Automated Quality Gate

| Gate | Result |
| --- | :---: |
| make q.lint | OK / NG / skip |
| make q.test | OK / NG ({Passed}/{Total}) / skip |
| architecture check | OK / Warning |

---

## Phase 2: 8-Axis Critical Review

### Axis 1: Process Trace & Impact -- {N Findings}
{Impact Map + Findings}

### Axis 2: Logic & Data Flow -- {N Findings}
{Findings + Dead Code Detection}

### Axis 3: Edge Cases & Failure Modes -- {N Findings}
| # | Scenario | Severity | Current Behavior | Remediation |
| :-: | --- | :---: | --- | --- |
| 1 | ... | HIGH | ... | ... |

### Axis 4: Security & Privacy -- {N Findings}
{Findings}

### Axis 5: Performance & Resources -- {N Findings}
{Findings}

### Axis 6: Test Sufficiency & Evidence -- {N Findings}
| Modified File | Corresponding Test | Coverage Status |
| --- | --- | :---: |
| src/a.ts | tests/a.test.ts | OK |
| src/b.ts | (None) | NG |

### Axis 7: Rollback & Operations -- {Grade}
| Change Type | Impacted Files | Risk |
| --- | --- | :---: |
| ... | ... | MEDIUM |

**Rollback Scenario**: {Actions required to safely revert this change}

### Axis 8: Long-term Viability & Complexity ROI -- {N Findings}
{Findings}

---

## Findings Summary

| # | Severity | Axis | File:Line | Description | Remediation |
| :-: | :---: | :-: | --- | --- | --- |
| 1 | CRITICAL | 4 | `src/x.ts:42` | ... | ... |
| 2 | HIGH | 1 | `src/y.ts:88` | ... | ... |

### Statistics & Quality Score

| Severity | Count | Penalty |
| :---: | :---: | :---: |
| CRITICAL | 0 | 0 |
| HIGH | 0 | 0 |
| MEDIUM | 0 | 0 |
| LOW | 0 | 0 |
| **Total** | **0** | **0** |

**Quality Score**: 100 - 0 = **100/100 (A)**

---

## Final Verdict

| Item | Result |
| --- | :---: |
| Automated Gate | OK / NG |
| Quality Score | {Score}/100 ({Grade}) |
| CRITICAL Findings | 0 |
| HIGH Findings | 0 |
| Rollback Risk | LOW / MEDIUM / HIGH |
| **Verdict** | **Go** |

{1-2 sentence verdict rationale}

## Self-Review Fundamental Reflection (When reviewing AI-authored code)

| # | Question | Answer |
| :-: | --- | --- |
| 1 | Was this change truly necessary? Could existing code solve it? | {Answer} |
| 2 | Were simpler alternatives evaluated? | {Answer} |
| 3 | Does any added code have zero impact on functionality if deleted? | {Answer} |
| 4 | Did the AI question its own core premises and assumptions? | {Answer} |
```

---

## Usage Examples

```bash
# Standard execution (Full check of current changes, auto-adaptive depth)
/final-review

# Feature integration analysis (SPEC FR cross-check + test sufficiency)
/final-review --feature dashboard

# Focus on Security axis only
/final-review --focus 4

# Strict mode (Go or No-Go only, Score >= 90 required)
/final-review --strict

# Skip Phase 1 (Already passed in feature-pilot)
/final-review --skip-gate

# Force Deep mode (Parallel subagents)
/final-review --deep

# Force Quick mode (Axes 1, 2, 3 only)
/final-review --quick
```

---

## Not For / Boundaries

- Direct code implementations prohibited — Performs review only
- Evaluating business requirement validity out of scope (verifies SPEC existence, not business decisions)
- Applying Deep mode tools (cognitive patterns, Santa protocol, Cross-Model) in Quick mode prohibited
- Cannot post GitHub comments without `--pr <number>`
- Does not replace internal feature-pilot validation gates (`pre-quality-gate`, `verification-loop`)

## Maintenance

- **Sources**: R-CM-012 (multi-perspective-review), R-CM-018 (skill-authoring-discipline)
- **Last updated**: 2026-04-05
- **Known limits**: Deep mode parallel subagents require Agent tools; Santa protocol context isolation requires fresh Agent executions; Cross-Model comparisons without external LLMs approximate multi-model review via adversarial prompts.
