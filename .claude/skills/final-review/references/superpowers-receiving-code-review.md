# Receiving Code Review Feedback (final-review Supplement)

> **Source**: `oss/superpowers/skills/receiving-code-review/SKILL.md` (Pattern Track adapted)
> **Adaptation**: Stripped raw frontmatter. 'CLAUDE.md violation' phrasing mapped to brief2dev R-CM-016 (Anti-Sycophancy) violation. Forbidden Responses catalog aligns with R-CM-016 #1 forbidden phrases.
> **Loaded by**: Immediately after receiving code review feedback, or during the final-review feedback acceptance phase.

---

## Core Principle

> "Code review requires technical evaluation, not emotional performance."
>
> "Verify before implementing. Ask before assuming. Technical correctness over social comfort."

Prioritize technical verification. Performative agreement is prohibited.

---

## Response Pattern (6-Step)

```
WHEN receiving code review feedback:

1. READ       — Complete feedback without reacting
2. UNDERSTAND — Restate requirement in own words (or ask)
3. VERIFY     — Check against codebase reality
4. EVALUATE   — Technically sound for THIS codebase?
5. RESPOND    — Technical acknowledgment or reasoned pushback
6. IMPLEMENT  — One item at a time, test each
```

Skipping any step leads to erroneous implementations or pointless churn.

---

## Forbidden Responses (Aligned with R-CM-016 #1)

### Strictly Forbidden

| Forbidden Response | Rationale |
| --- | --- |
| "You're absolutely right!" | R-CM-016 #1 forbidden phrase (avoids critical analysis) |
| "Great point!" / "Excellent feedback!" | Performative agreement (lacks technical verification) |
| "Let me implement that now" (prior to verification) | Skips VERIFY step → risk of wrong implementation |
| "Good catch, fixing it" (prior to verification) | Identical pattern, risks immediate unverified changes |

### Use Instead

| Instead | Example |
| --- | --- |
| Restate technical requirement | "I understand the reviewer requires X, whereas the current implementation uses Y, causing a conflict. Is that accurate?" |
| Clarifying question | "Should this change also cover case Z?" |
| Reasoned pushback | "Pattern A is the established standard across this codebase. Switching to B incurs impact C. I recommend retaining A." |
| Simply begin work | (Quietly commit the verified changes) |

---

## Handling Unclear Feedback

```
IF any feedback item is unclear:
  STOP — do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be interrelated. Partial understanding = wrong implementation.
```

### Example

```
Reviewer: "Refactor the auth flow"

Author response (✗ Forbidden):
  "Got it, refactoring now"

Author response (✓ Correct):
  "The auth flow comprises three distinct areas: (a) login session management,
   (b) token refresh, and (c) logout cleanup. Which area requires refactoring,
   or does this apply to all three?"
```

---

## Verification First

### Enforcing Codebase Reality Checks

Before accepting reviewer feedback:

1. **Cite Check**: Does the cited file:line accurately reflect reality?
2. **Pattern Check**: Does the proposed change conflict with patterns elsewhere in the codebase?
3. **Constraint Check**: Does it violate SPEC or core rules (R-CM-*)?
4. **Test Impact**: Could existing tests be broken?

→ If ANY check fails, push back with technical rationale.

### Standard Pushback Format

```
"I verified reviewer suggestion X with the following findings:
- Codebase pattern in practice: A (citing file:line)
- Impact of proposed change: B
- SPEC requirement: C
Synthesizing these, I propose [retaining current / partial adoption / alternative approach]. Thoughts?"
```

Accompany pushbacks with technical reasoning. Emotional pushback ("I don't feel like doing it") is prohibited.

---

## Implementation Discipline

### One Item at a Time

```
DON'T:
  Implement 5 feedback items simultaneously → Impossible to isolate which caused regressions.

DO:
  Implement 1 item → Test → Proceed to next.
  If tests break, roll back that single item.
```

### Test Each

After implementing each item:
- Run existing test suites (regression check)
- Add new test cases (asserting the feedback invariant)
- Enforce R-CM-010 (verification-before-completion)

---

## brief2dev R-CM-016 Integration

The Forbidden Responses in this guide directly mirror R-CM-016 (Anti-Sycophancy) #1.

| R-CM-016 #1 | This Guide |
| --- | --- |
| Prohibits "That's an interesting approach" | Prohibits "Great point!" |
| Prohibits "There are many ways to think about this" | Prohibits "Let me consider..." |
| Prohibits "You might want to consider..." | Prohibits "I should probably..." |
| Prohibits "I can see why you'd think that" | Prohibits "You're absolutely right!" |

This guide applies R-CM-016 to the **review-specific context**.

### Relationship with R-CM-010 (verification-before-completion)

| R-CM-010 | This Guide |
| --- | --- |
| Iron Law: Never claim completion without verification evidence | Enforces VERIFY step |
| Red Flags: Prohibits "should pass" | Prohibits "Let me implement that now" |
| Adversarial Self-Check (Rule 7) | Standard Pushback Format |

The VERIFY step in this guide is the direct application of R-CM-010 Iron Law when receiving reviews.

---

## Anti-Patterns

| Anti-Pattern | Impact |
| --- | --- |
| Instantly agreeing to all feedback → Implement | Performative agreement, wrong implementation |
| Immediate defensive posturing upon review → No implementation | Defensive posture, lost learning opportunity |
| Guesswork implementation on unclear feedback | Partial understanding = incorrect fix |
| Implementing multiple feedback items concurrently | Cannot isolate regression origins |
| Silent acquiescence when reviewer is technically incorrect | Steers codebase in wrong direction, sets bad precedent |

---

## Maintenance

- **Sources**:
  - Original: `oss/superpowers/skills/receiving-code-review/SKILL.md`
  - Origin: Superpowers OSS by Jesse Vincent / Prime Radiant
  - Transplant Plan: `.brief2dev/transplants/superpowers/batch3-pattern/transplant-plan.json`
- **Last updated**: 2026-04-25
- **Adaptation type**: `adapted` (Preserves Forbidden Responses + 6-step pattern + cross-references brief2dev R-CM-016/010)
- **Known limits**:
  - 'CLAUDE.md violation' phrasing mapped to R-CM-016 #1 violation.
  - Verification step intentionally reinforced in review-specific context.
