# Scope Challenge Framework

> **Purpose**: Prevents over-scoping through 6 structured checks before generating execution plans.
> **Used by**: `engineering-plan-writer` Step 1 (Scope Check) extension.

## 6-Check Scope Challenge

When converting a SPEC into an execution plan, execute these 6 checks **prior to** task breakdown. If complexity smells are detected, propose scope reductions to the user.

### Check 1: Code Reuse Search

> "Does existing code already solve this problem partially or entirely?"

- Can outputs from existing workflows be repurposed?
- Do shared utilities (`{SHARED_DIR}`) already provide this functionality?
- Does an analogous feature exist elsewhere in the codebase?

**Action**: Prioritize reusing existing code over introducing new abstractions.

### Check 2: Minimum Change Set

> "What is the absolute minimum set of changes required to achieve the objective?"

- Defer all non-essential enhancements that do not block core goals.
- Actively flag scope creep: decouple opportunistic refactoring into separate initiatives.

**Principle**: Include only what is essential for the immediate goal.

### Check 3: Complexity Smell Detection

> "Flag a complexity smell if the plan touches 8+ files or introduces 2+ new classes/services."

| Metric | Threshold | Action |
|--------|-----------|--------|
| Modified File Count | > 8 files | Propose scope reduction |
| New Classes / Services | > 2 new abstractions | Challenge whether fewer components suffice |
| New Third-Party Dependencies | > 1 package | Evaluate replacing with existing dependencies |

**Action**: Ask the user: "Can this goal be achieved with fewer moving parts?" If the user insists on the broader scope, log the decision and proceed.

### Check 4: Framework Built-in Search

> "For every proposed pattern or infrastructure component: Does the framework provide a built-in solution?"

For each architectural pattern, infrastructure layer, or concurrency approach:

1. Search: `{framework} {pattern} built-in` — Is it native to the runtime?
2. Search: `{pattern} best practice {current year}` — Is this standard industry practice?
3. Search: `{framework} {pattern} pitfalls` — Are there known caveats?

**Action**: If a native framework built-in exists, replace custom code with the built-in feature.

### Check 5: Completeness Assessment

> "Does the plan deliver a complete implementation (100% test coverage, all edge cases), or does it take shortcuts?"

In AI-assisted engineering, when the incremental cost of full implementation over a shortcut is only a few minutes, **always recommend complete implementation**.

| Classification | Definition | Decision |
|---|---|---|
| Lake | 100% test coverage, comprehensive edge cases, robust error handling | Execute completely |
| Ocean | Massive cross-system rewrite, multi-quarter migration | Flag as out of scope |

**Action**: If shortcuts are proposed, challenge: "Given that full implementation takes only minutes with AI assistance, why choose a shortcut?"

### Check 6: Distribution Check

> "If introducing a new artifact (CLI, library, container, application), does the plan include the build/distribution pipeline?"

- Is a CI/CD workflow defined?
- Are target runtime platforms specified?
- Is the installation/distribution pathway documented?

**Action**: If introducing an artifact without a release pipeline, mandate its explicit exclusion under the "NOT in scope" section.

---

## Application Workflow

```
engineering-plan-writer Protocol:
  Step 1: Scope Check (Enhanced)
    → Apply 6-Check Scope Challenge
    → Propose scope reductions upon detecting smells
    → Proceed to Step 2 upon user approval
  Step 2: File Structure Mapping
  Step 3: Bite-Sized Task Breakdown
```

## Scope Challenge Output Format

```
SCOPE CHALLENGE RESULTS:
  Check 1 (Reuse): {PASS | N reuse candidates identified}
  Check 2 (Min Change Set): {PASS | N items deferred}
  Check 3 (Complexity): {PASS | Smells detected: N files / M new classes}
  Check 4 (Built-in): {PASS | N built-in alternatives available}
  Check 5 (Completeness): {Lake (Full) | Ocean (Out of Scope)}
  Check 6 (Distribution): {PASS | Distribution pipeline omitted}
```

## Maintenance

- **Last updated**: 2026-03-27
- **Known limits**: Framework built-in searches (Check 4) depend on model knowledge; complement with WebSearch for cutting-edge runtime updates.
