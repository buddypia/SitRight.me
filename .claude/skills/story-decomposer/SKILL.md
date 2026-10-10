---
name: story-decomposer
description: |
  Tier 2 Delivery skill for decomposing target project SPEC.md files into implementable User Stories and Job Stories.
  Applies INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
  to generate backlog items complete with Acceptance Criteria.

  **Core Capabilities**:
  - SPEC.md → User Stories decomposition ("As a... I want to... so that...")
  - SPEC.md → Job Stories decomposition ("When... I want to... so I can...")
  - Automated INVEST validation
  - Acceptance Criteria generation (Given-When-Then)
  - Dependency graphing + implementation sequencing

  Triggered by requests like "story decompose", "decompose story", "user story", "job story", or "backlog".
---

# Story Decomposer

> **Core Concept**: "A good story can be implemented and verified within one day" — INVEST Principle

Decomposes functional specifications in `SPEC.md` into granular stories that developers can implement immediately.

---

## EXECUTION PROTOCOL (MANDATORY)

### Pre-flight Checklist

```markdown
## Pre-flight Checklist

| # | Item | Status | Remarks |
| :-: | --- | :--: | --- |
| 1 | Target SPEC.md confirmed | ⬜ | |
| 2 | BRIEF.md persona info confirmed | ⬜ | |
| 3 | Story format selected (user/job) | ⬜ | |
| 4 | project-config.json paths resolved | ⬜ | |
```

### Model Routing Policy

Delegate lightweight scanning to a faster model and keep judgment work (trade-offs, experiment design, verdicts) on the session model.

### Post-flight Checklist

```markdown
## Post-flight Checklist

| # | Item | Status | Remarks |
| :-: | --- | :--: | --- |
| 1 | Minimum 3 stories generated | ⬜ | |
| 2 | Each story passes INVEST criteria | ⬜ | |
| 3 | 3+ Acceptance Criteria per story (Given-When-Then) | ⬜ | |
| 4 | Dependency graph created | ⬜ | |
| 5 | Implementation sequence proposed | ⬜ | |
```

---

## Core Principles

1. **INVEST Mandatory**: All stories must pass all 6 INVEST criteria.
2. **Testable**: Every story must have concrete Given-When-Then Acceptance Criteria.
3. **One-Day Scope**: Each story must be small enough to implement and verify within 1 day.

---

## 2 Story Formats

### User Story (Role-Based)

```
As a <role>,
I want to <action>,
so that <benefit/value>.
```

- Best for: Well-defined user roles (B2B, multi-user apps)
- Example: "As a project manager, I want to see progress by team member at a glance, so that I can quickly identify bottlenecks."

### Job Story (Situation-Based)

```
When <situation>,
I want to <motivation>,
so I can <expected outcome>.
```

- Best for: Context- and trigger-driven workflows (B2C, single-user apps)
- Example: "When search results are overwhelming, I want to filter by category, so I can find relevant items quickly."

---

## INVEST Validation Matrix

| Criterion | Question | Pass Condition |
| --- | --- | --- |
| **I**ndependent | Can it be implemented without other stories? | Dependencies minimized |
| **N**egotiable | Is the implementation approach open? | Describes WHAT, not rigid HOW |
| **V**aluable | Does it deliver direct value to users? | Not merely an internal tech task |
| **E**stimable | Can effort be accurately estimated? | Low uncertainty |
| **S**mall | Can it be completed within 1 day? | Flagged for decomposition if larger |
| **T**estable | Can it be verified via Acceptance Criteria? | Given-When-Then authorable |

---

## Acceptance Criteria

Formulated in Given-When-Then format with 3–6 ACs per story:

```markdown
### AC-1: Basic Filtering
- **Given** 20+ search results are displayed
- **When** the user selects a "Category" filter
- **Then** only results from that category appear, and result count updates

### AC-2: Clear Filter
- **Given** a category filter is actively applied
- **When** the user clicks the "All" button
- **Then** the filter is cleared and all results reappear

### AC-3: Empty Result Handling
- **Given** no results exist for the selected category
- **When** the filter is applied
- **Then** a "No results found. Try another category" message is displayed
```

---

## Output Format

```markdown
# Story Decomposition: <Feature Name>

> **Source**: docs/features/<name>/SPEC.md
> **Format**: User Story / Job Story
> **INVEST Validation**: All Passed

## Stories

### US-001: <Story Title>
> As a <role>, I want to <action>, so that <value>.

**INVEST**: I✅ N✅ V✅ E✅ S✅ T✅
**Estimated Effort**: 0.5 day
**Dependencies**: None

#### Acceptance Criteria
1. **Given** ... **When** ... **Then** ...
2. **Given** ... **When** ... **Then** ...
3. **Given** ... **When** ... **Then** ...

---

### US-002: <Story Title>
...

## Dependency Graph

```
US-001 (Independent)
  ↓
US-002 → US-003
  ↓
US-004 (After US-002)
```

## Recommended Implementation Sequence

| Order | Story | Rationale | Estimated Effort |
| :---: | --- | --- | :---: |
| 1 | US-001 | Independent core functionality | 0.5 day |
| 2 | US-002 | Extends US-001 foundation | 1 day |
| 3 | US-003 | Parallelizable with US-002 | 0.5 day |
```

---

## Related Skills

| Direction | Skill | Relationship |
| --- | --- | --- |
| Input | `feature-spec-generator` | Decomposes generated `SPEC.md` |
| Input | `feature-architect` | Ingests `BRIEF.md` persona details |
| Downstream | `feature-implementer` | Implements stories via TDD |

---

## Usage Examples

```bash
# Decompose in User Story format
/story-decomposer "Search Feature"

# Decompose in Job Story format
/story-decomposer --format job "Search Feature"

# Decompose from specific SPEC path
/story-decomposer --spec docs/features/search/SPEC.md

# Generate Acceptance Criteria only (for existing stories)
/story-decomposer --ac-only "Search Feature"
```

## Not For / Boundaries

> Explicit non-targets for this skill (R-CM-018 Rule 4 — Missing Boundaries prevention). Frontmatter description + trigger clauses serve as the SSOT for boundaries.

- Areas outside explicit triggers in frontmatter description are out of scope.
- Consult skill body or `MANIFEST.json` for call chains and dependencies.
- Decomposes user/job stories to implementation-ready backlog size. Technical engineering step breakdowns belong to `engineering-plan-writer`.
- SPEC authoring and code implementation belong to `feature-spec-generator` and `feature-implementer`.
- Prioritizing decomposed stories belongs to `prioritize` and `betting-table`.

## Maintenance

- **Sources**: brief2dev internals (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` conventions).
- **Last updated**: 2026-04-11
- **Known limits**: Explicit boundaries defined in frontmatter description (`|...`) and skill body.
