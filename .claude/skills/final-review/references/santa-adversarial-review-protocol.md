# Santa Adversarial Dual-Review Protocol

> Source: ECC `santa-method/SKILL.md` + `commands/santa-loop.md` (Ronald Skelton, RapportScore.ai)
> Transplant: tp-everything-claude-code-round2-20260402, asset-R2-01 (inspired)

## Purpose

When a single agent reviews its own output, it shares identical cognitive biases, knowledge gaps, and systematic blind spots.
**Parallel evaluation by 2 independent reviewers evaluating against the same rubric without shared context** structurally eliminates this failure mode.

Core insight: "Make a list, check it twice. If it's naughty, fix it until it's nice."

## Architecture

```
┌─────────────┐
│  GENERATOR   │  Phase 1: Artifact Generation
│  (Agent A)   │
└──────┬───────┘
       │ output
       ▼
┌──────────────────────────────┐
│     Dual Independent Review  │  Phase 2: Dual Verification
│                              │
│  ┌───────────┐ ┌───────────┐ │  2 Agents, Identical Rubric,
│  │ Reviewer B │ │ Reviewer C │ │  Zero Shared Context
│  └─────┬─────┘ └─────┬─────┘ │
└────────┼──────────────┼──────┘
         ▼              ▼
┌──────────────────────────────┐
│        Verdict Gate          │  Phase 3: NICE / NAUGHTY
│                              │
│  B Passes AND C Passes → NICE│  Both MUST pass.
│  Otherwise → NAUGHTY         │  No exceptions.
└──────┬──────────────┬────────┘
     NICE           NAUGHTY
       │              │
       ▼              ▼
   [ Ship ]    ┌─────────────┐
               │ Fix Cycle   │  Phase 4: Repeat until convergence
               │ MAX 3 Runs  │
               │ → Phase 2   │
               └─────────────┘
```

## Core Invariants

1. **Context Isolation**: Reviewers B and C never see each other's evaluations.
2. **Identical Rubric**: Both reviewers receive the exact same evaluation criteria.
3. **Identical Input**: Original spec + generated artifact are passed identically to both reviewers.
4. **Structured Output**: Return verdicts in JSON format rather than free-form prose.

## Structured Rubric Design

The rubric is the most critical input to the Santa Method. Vague rubrics yield vague reviews.

### Base Rubric Template

| Criterion | Pass Condition | Failure Signals |
| --- | --- | --- |
| Factual Accuracy | All claims verifiable against source material | Fabricated stats, wrong version numbers, non-existent APIs |
| Zero Hallucinations | No fabricated entities, citations, URLs, or references | Broken links, unsourced quotes |
| Completeness | All spec requirements fully addressed | Missing sections, skipped edge cases |
| Internal Consistency | Zero internal contradictions in artifact | Section A claims X, Section B claims ~X |
| Technical Correctness | Code compiles/runs, algorithms sound | Syntax errors, logic bugs |

### Domain-Specific Rubric Extensions

**For Code Reviews:**
- Type safety (`any` leakage, null handling)
- Error handling coverage
- Security (secret exposure, input validation, injection prevention)
- Test coverage over new execution paths

**For Compliance-Sensitive Outputs:**
- Zero unsubstantiated guarantees or speculative claims
- Mandatory disclaimers included
- Approved terminology only

## Convergence Loop

```python
MAX_ITERATIONS = 3

for iteration in range(MAX_ITERATIONS):
  verdict = santa_verdict(review_b, review_c)

  if verdict == "NICE":
    # Ship
    break

  # Fix all critical issues (suggestions are optional)
  output = fix_agent(
      output,
      issues,
      instruction=(
          "Fix flagged issues only. No unsolicited refactoring or modifications."
      ),
  )

  # Re-run both reviewers as fresh agents
  # (No memory of previous rounds — eliminates anchoring bias)
  review_b = Agent(fresh=True, rubric=rubric, output=output)
  review_c = Agent(fresh=True, rubric=rubric, output=output)

# Exhausted iterations → Escalate
escalate_to_human(output, issues)
```

**Core**: Use a **fresh agent** on every iteration. Retaining context from prior rounds introduces anchoring bias.

## Verdict Gate

- B Passes AND C Passes → **NICE** (Ship)
- Otherwise → **NAUGHTY** (Merge critical issues from both + deduplicate + fix cycle)

If even one reviewer flags an issue, that issue is treated as real. Addressing one reviewer's blind spot is the raison d'être of the Santa Method.

## Failure Modes & Mitigations

| Failure Mode | Symptom | Mitigation |
| --- | --- | --- |
| Infinite Loop | Fixing one issue introduces new issues | Cap at MAX 3 iterations, then escalate |
| Rubber Stamping | Both reviewers pass effortlessly | Adversarial prompt: "Your sole objective is to find defects" |
| Subjective Bias | Styling preferences flagged as errors | Tight rubric containing objective pass/fail criteria only |
| Fix Regressions | Issue A fixed → Issue B broken | Fresh reviewers in subsequent rounds detect regressions automatically |
| Shared Blind Spots | Both reviewers miss the same defect | Mitigated by independence (cannot be fully eliminated). Add 3rd reviewer or human spot-check for high-risk outputs |

## brief2dev Application Guide

### Relationship with Multi-Perspective Review

`multi-perspective-protocol.md` covers **breadth** across 6 roles (PM, Developer, QE, Security, DevOps, UI/UX).
The Santa protocol covers **depth** via 2 independent agents.

- **Multi-Perspective** = Breadth (Multi-faceted evaluation across 6 distinct roles)
- **Santa** = Depth (Adversarial convergence across isolated independent agents)

### Activation Criteria

- `--strict` flag enabled
- Deep mode auto-activation (16+ modified files or Core/Shared changes)
- Pre-production final verification

### Implementation Mechanism

Instantiate subagents via the Agent tool to achieve genuine context isolation:

```
Reviewer B = Agent(description="Santa Reviewer B", prompt=RUBRIC + OUTPUT)
Reviewer C = Agent(description="Santa Reviewer C", prompt=RUBRIC + OUTPUT)
// Execute both in parallel — neither sees the other's findings
```

### Integration with SDD Task Reviewer

In `feature-implementer` SDD mode, the unified Task Reviewer (`sdd-task-reviewer-prompt.md`) returns 2 independent verdicts for spec compliance + code quality.
The Santa protocol operates as a **higher-order quality gate**:

1. Execute standard review (Task Reviewer — spec + quality 2 verdicts)
2. When Santa activation criteria are met → Execute supplemental dual independent reviews
3. NICE → Go, NAUGHTY → Remediate and re-review
