# Standard Prompt for Requesting Code Review (final-review Supplement)

> **Source**: `oss/superpowers/skills/requesting-code-review/SKILL.md` (Pattern Track adapted)
> **Adaptation**: Stripped raw frontmatter. Maps the superpowers Task tool model to brief2dev's multi-perspective protocol in `final-review`. The "no session history inheritance" principle aligns directly with brief2dev's subagent isolation model.
> **Loaded by**: When `final-review` or callers require a standard prompt format for dispatching code reviews.

---

## Core Principle

> "Review early, review often."
>
> "The reviewer gets precisely crafted context for evaluation — never your session's history."

Inheriting session context is strictly prohibited. Reviewers must focus exclusively on the work product to block confirmation and thought process bias.

---

## When to Request Review

**Mandatory**:
- After completing each task (Subagent-driven development)
- After completing a major feature
- Prior to merging into main

**Optional but Valuable**:
- When stuck or experiencing cognitive fatigue (fresh perspective)
- Prior to refactoring (baseline validation)
- After resolving complex bugs

---

## Standard Review Request Prompt

### 1. Extract Git SHAs

```bash
BASE_SHA=$(git rev-parse HEAD~1)   # Or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

### 2. Dispatch Reviewer Subagent

Dispatch to brief2dev `final-review` or `code-reviewer` agent, populating the following placeholders:

| Placeholder | Content | Example |
| --- | --- | --- |
| `{WHAT_WAS_IMPLEMENTED}` | What was implemented | "API endpoint /users with rate limit" |
| `{PLAN_OR_REQUIREMENTS}` | What was expected | "SPEC.md FR-007 + 100 req/min" |
| `{BASE_SHA}` | Start commit | `e9acd1b` |
| `{HEAD_SHA}` | End commit | `52944f7` |
| `{DESCRIPTION}` | Summary | "user CRUD + rate limiting middleware" |

### 3. Standard Prompt Format

```
Review the following changes:

What was implemented: {WHAT_WAS_IMPLEMENTED}
Plan/Requirements: {PLAN_OR_REQUIREMENTS}
Base: {BASE_SHA}
Head: {HEAD_SHA}
Description: {DESCRIPTION}

Required output format:
- Critical: [issues that must be fixed]
- Important: [issues that should be fixed before merge]
- Minor: [issues to note for later]

Constraints:
- Verify against codebase, not your assumptions
- Cite specific file:line for each issue
- Push back on author wrongly if reviewer has higher confidence
```

---

## Severity Classification

### Critical (Fix Immediately)
- Security vulnerabilities (XSS, SQL injection, secret leak)
- Data corruption risks
- Production crash risks
- Unfulfilled explicit spec requirements

### Important (Fix Before Merge)
- Performance degradations (>2x latency increase)
- Missing test coverage
- Error handling gaps
- Evident anti-patterns

### Minor (Note for Later)
- Naming inconsistencies
- Missing docstrings/comments
- Refactoring opportunities
- Minor styling issues (auto-fixable)

---

## Processing Feedback

This guide covers the review **request** side. For handling received feedback, consult `superpowers-receiving-code-review.md`.

| Step | Action |
| --- | --- |
| 1 | Fix Critical issues immediately (halt other work) |
| 2 | Fix Important issues (before merge) |
| 3 | Record Minor notes (TODO comments or tracking issues) |
| 4 | If reviewer is technically incorrect, push back with reasoning |

---

## brief2dev final-review Integration

### Relationship with Multi-Perspective Protocol

This guide establishes the standard prompt for **single-shot reviews**, complementing the 6-role multi-perspective protocol (PM/Developer/QE/Security/DevOps/UI-UX) in `final-review`:

| Mode | This Guide | brief2dev final-review |
| --- | --- | --- |
| Light Review | ✓ Standard prompt | (Single reviewer) |
| Deep Review (16+ files) | (Extended) | ✓ Multi-perspective 6 roles |
| `--strict` Mode | (Included) | ✓ Multi-perspective auto-activation |

The standard prompt template can also be applied when dispatching individual roles within the multi-perspective protocol.

### Relationship with R-CM-012 (Multi-Perspective Review)

| R-CM-012 Item | Mapping in this Guide |
| --- | --- |
| 6 Roles Mandatory | (Applied in deep mode) |
| Evidence-Based | "Cite specific file:line" in Constraints |
| Future is Now | Severity breakdown (Critical / Important / Minor) |
| Weighted Average Score | (Managed by multi-perspective synthesis) |

---

## Anti-Patterns

| Anti-Pattern | Impact |
| --- | --- |
| Dispatching with raw session history | Reviewer inherits author confirmation bias → Flat review |
| Unpopulated placeholders ("alright, review this") | Vague context → Low signal review |
| Omitting BASE_SHA / HEAD_SHA | Reviewer guesses scope → Misses or over-reviews |
| Requesting reviews without severity levels | All issues weighted equally → Triage failure |
| Author pre-judging review ("verify this is correct") | Confirmation bias → Useless review |

---

## Maintenance

- **Sources**:
  - Original: `oss/superpowers/skills/requesting-code-review/SKILL.md`
  - Origin: Superpowers OSS by Jesse Vincent / Prime Radiant
  - Transplant Plan: `.brief2dev/transplants/superpowers/batch3-pattern/transplant-plan.json`
- **Last updated**: 2026-04-25
- **Adaptation type**: `adapted` (Preserves standard review prompt + cross-references brief2dev final-review/multi-perspective protocols)
- **Known limits**: Single review prompt covers single-reviewer flows; multi-perspective flows apply this format per dispatched role.
