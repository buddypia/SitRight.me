# GAN Generator-Evaluator Separation Pattern

> Source: ECC gan-style-harness/SKILL.md + agents/gan-evaluator.md (Anthropic Harness Design Paper, March 2026)
> Transplant: tp-everything-claude-code-round2-20260402, asset-R2-02 (inspired)

## Purpose

> "When you ask an agent to evaluate its own work, it becomes a pathological optimist — praising mediocre output and rationalizing legitimate issues.
> But engineering a **separate evaluator** to be ruthlessly rigorous is far more tractable than teaching a generator to be self-critical."
>
> — Anthropic Harness Design Paper (2026-03-24)

This is the core dynamic of Generative Adversarial Networks (GAN): The Generator produces, the Evaluator critiques, and that adversarial feedback drives the next iteration.

## Core Principles

### 1. Separation of Generation and Evaluation

The Generator (writing code) and Evaluator (validating quality) must be **separate roles/agents**.
When the same agent performs both roles, self-serving bias is inevitable.

### 2. Ruthless Evaluator Design

The natural tendency of an evaluator is leniency. This must be actively corrected.

**Must Do:**
- Find every defect, every shortcut, and every sign of mediocrity
- Heavily penalize AI-slop aesthetics (generic gradients, stock layouts, obvious clichés)
- Test edge cases (empty inputs, extremely long text, special characters, rapid consecutive clicks)
- Compare against the standard an expert human engineer would ship to production

**Never Do:**
- "Overall good effort" or "Solid foundation" — such phrases are evasions
- Rationalize detected issues away ("It's minor, probably fine" → prohibited)
- Award points for effort or "potential"
- A passing score must mean **genuinely great**, not merely **good for an AI**

### 3. Anti-AI-Slop Rubric

| Criterion | Weight | Scoring System |
| --- | --- | --- |
| Design Quality | 0.3 | Visual hierarchy, spacing, typography, color harmony |
| Originality | 0.2 | Intentional design decisions rather than generic AI output |
| Craftsmanship | 0.3 | Level of detail, consistency, edge case handling |
| Functionality | 0.2 | Operational integrity across all features, robust error handling |

### Score Calibration Criteria

| Score | Meaning |
| --- | --- |
| 1-3 | Broken — Fails fundamental functionality |
| 4-5 | AI-generated tier — Functional but cliché and uninspired |
| 6 | Decent but generic — "Looks AI-generated" |
| 7 | Solid junior engineer tier |
| 8 | Professional expert tier — Production shippable |
| 9 | Senior engineer tier — Polished and refined |
| 10 | Production ready — Quality an expert would be proud of |

## GAN Pattern vs. Standard Review Comparison

| Scenario | Pattern to Use |
| --- | --- |
| Greenfield full app build (one-line prompt → production) | **GAN Pattern** |
| Frontend requiring high visual polish | **GAN Pattern** |
| Projects where "AI slop" aesthetics are unacceptable | **GAN Pattern** |
| Single-file tweak / rapid bug fix | Standard Review |
| Budget constrained (<$10) | Standard Review |
| Well-defined TDD task | TDD Workflow |

## brief2dev Application Guide

### Integration with SDD Task Reviewer

In `feature-implementer` SDD mode, the unified Task Reviewer evaluates both spec compliance and code quality via a single diff read per task, returning 2 independent verdicts (`sdd-task-reviewer-prompt.md`, aligned with Superpowers v6.1.1 — replacing legacy separated reviewers).

The GAN pattern **strengthens the quality verdict axis** of this Task Reviewer:
- Injects "ruthless evaluator" principles into the code quality evaluation criteria of the Task Reviewer prompt
- Applies anti-AI-slop penalty criteria
- Triggers feedback → remediation cycles when scores fall below threshold

### Trigger Points

1. **feature-implementer Step 4 (Review Phase)**: Quality axis of Task Reviewer operates as a ruthless evaluator
2. **Score < Threshold**: Relay issues to implementer → remediation and re-review
3. **Upon Convergence**: Final Go verdict

### "Pathological Optimist" Detection Patterns

If the following phrases appear in a review, it signals that the evaluation was insufficiently rigorous:
- "Overall great implementation" → Look for concrete defects
- "Minor polish suggestion" → Not minor; does it meet the bar?
- "Can be improved in the future" → Should it be fixed now?
- "Effort is evident" → Effort is not a metric
