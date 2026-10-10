# Cross-Model Review Format

> **Purpose**: Structured comparison output format for multi-AI model review results + Adversarial review prompt template
> **Used by**: `final-review` (Deep mode, `--strict` mode), `multi-llm-debate`, `multi-llm-reflection`
> **Complements**: `multi-perspective-protocol.md` (Role-based evaluation), `eng-review-cognitive-patterns.md` (Cognitive patterns)

## Cross-Model Comparison Table

Consolidates multi-LLM review results (`multi-llm-debate`, `multi-llm-reflection`) into a **structured comparison table**.

### Output Format

```
CROSS-MODEL ANALYSIS:
  Both found:      [Findings discovered by both models]
  Only Model A:    [Findings discovered only by Model A]
  Only Model B:    [Findings discovered only by Model B]
  Agreement rate:  X% (N/M total unique findings overlap)
```

### Interpretation Guide

| Agreement Rate | Interpretation | Action |
| :---: | --- | --- |
| 80%+ | High consensus -- Both models recognize identical problems | Prioritize agreed findings |
| 50-79% | Moderate consensus -- Each model provides distinct perspectives | Review all unique findings |
| <50% | Low consensus -- Differences in review scope / methodology | Pay special attention to "Only X" findings |

### Trigger Points

Post-multi-perspective review in `final-review` Deep mode:

1. **Role-Based Review** (`multi-perspective-protocol.md`): PM, Developer, QE, Security, DevOps, UX
2. **Cross-Model Comparison** (This document): Cross-comparison of outputs across different LLMs
3. **Unified Verdict**: Synthesize both dimensions to decide Go / No-Go

---

## Adversarial Review Prompt Template

Review prompt adopting an attacker/chaos-engineer mindset to uncover **failure modes** in code.

### Default Adversarial Prompt

```
Review the changed code. Find every way this code can fail in production.

Think from the perspective of an attacker and a chaos engineer:
- Edge cases: Boundary values, empty inputs, null, extreme sizes
- Race conditions: Concurrent access, order dependencies
- Security holes: Injection, auth bypass, data exposure
- Resource leaks: Memory, file handles, connections
- Failure modes: Network disruption, timeouts, partial failures
- Silent data corruption: Paths where data becomes corrupted without raising errors

Zero praise. Report issues only.
```

### Focused Adversarial Prompt (When focus is specified)

```
Review the changed code with primary focus on [FOCUS_AREA].

[FOCUS_AREA=security]:
  Investigate injection vectors, auth bypass, privilege escalation, data exposure,
  and timing attacks from an attacker's perspective.

[FOCUS_AREA=concurrency]:
  Investigate race conditions, deadlocks, order dependencies, concurrent writes,
  and missing atomic operations from a chaos engineer's perspective.

[FOCUS_AREA=data_integrity]:
  Investigate silent data corruption paths, partial updates, duplicate processing,
  and consistency violations from a data engineer's perspective.
```

### Application in `final-review --strict` Mode

```
When --strict mode is active:
  1. Execute standard 8-Axis review
  2. Execute supplemental review via Adversarial prompt
  3. Compare standard and adversarial review findings in Cross-Model format
  4. Apply additional weighting (+10%) to findings discovered exclusively by adversarial review
```

---

## Gate Verdict from Cross-Model Review

Rules reflecting Cross-Model comparison results into the final Gate verdict:

| Condition | Gate |
| --- | --- |
| Both-found contains 1+ CRITICAL | **FAIL** (Immediate) |
| Only-X contains 1+ CRITICAL | **FAIL** (CRITICAL blocks even if found by a single model) |
| Both-found contains 3+ HIGH | **FAIL** |
| Only-X contains 3+ HIGH | **REVIEW** (Verdict decided after user confirmation of findings) |
| Agreement rate < 30% | **REVIEW** (Manual review due to significant divergence in model comprehension) |
| None of the above | **PASS** |

---

## Integration with Existing Protocols

| Existing Protocol | Role of This Document |
| --- | --- |
| `multi-perspective-protocol.md` | Applies cross-model comparison as an additional layer **after** role-based evaluation |
| `eng-review-cognitive-patterns.md` | Uses 15 cognitive patterns as review **quality lenses** for each model |
| R-CM-012 (multi-perspective rules) | Adds cross-model comparison layer **on top of** 6-role independent evaluation + weighted average |

---

## Maintenance

- **Last updated**: 2026-03-27
- **Known limits**: Fully decoupled from external Codex CLI dependencies. brief2dev compares outputs from native `multi-llm-debate` and `multi-llm-reflection` skills. Zero external binaries required.
