# 4-Phase Debugging Protocol (systematic-debugging Reference Guide)

> **Source**: `oss/superpowers/skills/systematic-debugging/SKILL.md` (Pattern Track adapted)
> **Adaptation**: Stripped original frontmatter. Normalized "your human partner" → "user". Mapped superpowers cross-references (`test-driven-development`, `verification-before-completion`) to brief2dev `tdd-guide` agent and R-CM-010. Preserved language-neutral boundary instrumentation examples.
> **Loaded by**: Invoked when `systematic-debugging` requires strict 4-phase sequencing and multi-tier boundary instrumentation.

---

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Do not enter Phase 2 without completing Phase 1. Speculative fix attempts are prohibited.

---

## Strict 4-Phase Sequencing

Complete each phase fully before advancing.

### Phase 1: Root Cause Investigation

1. **Read Error Messages Carefully** — Inspect full stack traces; note exact line numbers, file paths, and error codes.
2. **Reproduce Consistently** — Is it reproducible? Does it trigger 100% of the time? If not, gather telemetry rather than guessing.
3. **Check Recent Changes** — Review git diffs, recent commits, dependency upgrades, and config changes.
4. **Gather Evidence in Multi-Component Systems** — Insert boundary instrumentation across component seams (see below).
5. **Trace Data Flow** — Trace invalid data back to its origin and remediate at the source, not the symptom.

### Phase 2: Pattern Analysis

1. **Find Working Examples** — Locate functioning, analogous implementations within the codebase.
2. **Compare Against References** — Read reference implementations completely without skimming.
3. **Identify Differences** — Enumerate all discrepancies between working and broken execution paths.
4. **Understand Dependencies** — Map required modules, configurations, environment variables, and hidden assumptions.

### Phase 3: Hypothesis and Testing

1. **Formulate a Single Falsifiable Hypothesis** — State: "X is the root cause because Y; disproven if Z is observed."
2. **Test Minimally** — Test exactly one variable at a time; never bundle multiple speculative fixes.
3. **Verify Before Continuing** — If proven → advance to Phase 4. If disproven → form a new hypothesis (never stack fixes on fixes).
4. **Acknowledge Uncertainty** — Explicitly state "I do not understand X." Ask the user or gather more data.

### Phase 4: Implementation

1. **Create a Failing Test Case** — Mandatory failing test prior to fix (leverage `tdd-guide` agent).
2. **Implement a Single Targeted Fix** — Fix only the root cause; avoid opportunistic refactoring.
3. **Verify the Fix** — Ensure tests pass, regressions are absent, and original symptoms are eliminated.
4. **If Fix Fails** — STOP immediately. Count attempts. If < 3 → re-enter Phase 1. If ≥ 3 → advance to Step 5.
5. **If 3+ Fixes Fail: Question the Architecture** — When each fix causes new issues elsewhere, the underlying architecture is flawed. Discuss fundamental trade-offs with the user (aligned with R-CM-017 3-Strike Escalation).

---

## Multi-Component Boundary Instrumentation

In multi-tier systems (CI → Build → Signing, API → Service → Database), add diagnostics **before** proposing fixes:

```
For EACH component boundary:
  - Log data entering the component
  - Log data exiting the component
  - Verify environment and configuration propagation
  - Inspect internal state at each layer

Run once to collect empirical proof of WHERE the failure originates
THEN analyze to identify the failing component
THEN investigate that specific component deeply
```

### Example (4-Layer Code Signing Pipeline)

```bash
# Layer 1: Workflow Environment
echo "=== Secrets available in workflow: ==="
echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

# Layer 2: Build Script Environment
echo "=== Env vars in build script: ==="
env | grep IDENTITY || echo "IDENTITY not in environment"

# Layer 3: Keyring State
echo "=== Keychain state: ==="
security list-keychains
security find-identity -v

# Layer 4: Signing Execution
codesign --sign "$IDENTITY" --verbose=4 "$APP"
```

→ Exposes the exact boundary failure point (e.g., secrets → workflow ✓, workflow → build ✗).

---

## Red Flags — STOP Immediately

If any of these thoughts occur, return immediately to Phase 1:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the automated test; I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand why, but this might work"
- "Pattern says X, but I'll adapt it differently"
- "Here are the main problems: [list of fixes without prior investigation]"
- **"One more fix attempt" (Already attempted 2+ times)**
- **Each fix creates new issues elsewhere**

---

## User Signals — Indicating Off-Track Execution

If the user provides any of these redirections, STOP immediately and return to Phase 1:

- "Is that not happening?" → You made an unverified assumption.
- "Will it show us...?" → Missing empirical evidence gathering.
- "Stop guessing" → Proposing fixes without diagnostic understanding.
- "Ultrathink this" → Question the underlying fundamentals, not just the surface symptom.
- "We're stuck" → Current approach is non-viable; re-evaluate architecture.

---

## Common Rationalizations (Rebuttals)

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple bugs still have precise root causes; following the process is rapid. |
| "Emergency, no time for process" | Systematic diagnosis is empirically faster than trial-and-error thrashing. |
| "Just try this first, then investigate" | The initial patch sets the pattern; do it right from the start. |
| "I'll write tests after confirming the fix works" | Untested fixes do not endure; TDD provides deterministic verification. |
| "Multiple fixes at once saves time" | Blurs isolation; obscures causality and breeds regressions. |
| "I see the problem, let me fix it" | Observing a symptom is not equivalent to understanding the root cause. |
| "One more fix attempt" (2+ failures) | 3+ failures signal a structural architectural flaw. Question the pattern. |

---

## brief2dev Integration

### Alignment with R-CM-017 Rule 3 (3-Strike Escalation)

| Step | brief2dev Protocol |
|------|--------------------|
| 1st Fix Failure | Revert to Phase 1 + formulate new hypothesis |
| 2nd Fix Failure | Revert to Phase 1 + gather additional telemetry |
| **3rd Fix Failure** | **Halt immediately + escalate to user (R-CM-017)** |
| 4th Fix Attempt | **Prohibited** (Violates R-CM-017) |

Phase 4 Step 5 in this guide and R-CM-017 Rule 3 represent the identical governance principle.

### Linkages to Other brief2dev Skills

| Skill | Relationship |
|-------|--------------|
| `tdd-guide` agent | Phase 4 Step 1 (Authoring failing tests) |
| `bug-fix` skill | Orchestrator utilizing this 4-phase protocol |
| `final-review` | Invoked post-Phase 4 verification |
| R-CM-010 (verification-before-completion) | Enforces empirical verification in Phase 4 |
| R-CM-017 (3-Strike Escalation) | Mandates escalation on 3rd failure |

---

## Maintenance

- **Sources**:
  - Original: `oss/superpowers/skills/systematic-debugging/SKILL.md`
  - Attribution: superpowers OSS by Jesse Vincent / Prime Radiant
- **Last updated**: 2026-04-25
- **Adaptation type**: `adapted` (Preserved 4-phase principles + aligned with brief2dev R-CM-017 and `tdd-guide`)
