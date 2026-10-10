# Engineering Review Cognitive Patterns

> **Purpose**: Supplements systemic risks overlooked by quantitative checklists in `final-review` Deep mode using intuitive patterns.
> **Used by**: `final-review` (Deep mode, 16+ modified files or Core/Shared modifications)

## 15 Cognitive Patterns

Pattern recognition faculties developed by seasoned engineering leaders over decades.
The intuition separating "reviewed code" from "discovered landmines".

These are **lenses** applied across the entire review, **not** additional checklist items.

### Architecture Lens (When Evaluating Architecture)

| # | Pattern | Question | Source |
| --- | --- | --- | --- |
| 1 | **Boring by Default** | Is it proven technology? Are we spending our innovation tokens wisely? | McKinley, Choose Boring Technology |
| 2 | **Blast Radius Instinct** | In the worst case, how many systems/users are impacted? | — |
| 3 | **Reversibility Preference** | Is the cost of rollback low? Feature flags, A/B tests, incremental rollouts? | — |
| 4 | **Essential vs Accidental Complexity** | Does this solve the real problem, or a self-inflicted problem? | Brooks, No Silver Bullet |
| 5 | **Incremental over Revolutionary** | Strangler fig or big bang? Canary or global rollout? | Fowler |

### Code Quality Lens (When Evaluating Code Quality)

| # | Pattern | Question | Source |
| --- | --- | --- | --- |
| 6 | **Systems over Heroes** | Can a tired engineer operate this at 3 AM? Without assuming hero developers? | — |
| 7 | **Make the Change Easy** | Are structural changes and behavioral changes bundled together? Refactor first, then implement. | Beck |
| 8 | **DX is Product Quality** | Slow CI, degraded local dev loops, painful deployments → degraded software | — |
| 9 | **Two-Week Smell Test** | Can a competent engineer ship a small feature within 2 weeks? | — |
| 10 | **Glue Work Awareness** | Is invisible coordination recognized and valued? | Reilly, The Staff Engineer's Path |

### Risk/Operations Lens (When Evaluating Risk)

| # | Pattern | Question | Source |
| --- | --- | --- | --- |
| 11 | **Failure is Information** | Are post-mortems blameless? Is error budget recognized? | Allspaw, Google SRE |
| 12 | **Error Budgets over Uptime** | 99.9% SLO = 0.1% downtime **budget** available for deployment. | Google SRE |
| 13 | **Own Your Code in Production** | Does a wall exist between development and operations? | Majors |
| 14 | **State Diagnosis** | Which of the 4 states is the team in? Each requires distinct interventions. | Larson, An Elegant Puzzle |
| 15 | **Org Structure IS Architecture** | Are we intentionally designing Conway's Law? | Skelton/Pais, Team Topologies |

## Application in final-review

### Standard Mode (< 16 Modified Files)

→ **Do not apply** these patterns. 8-Axis quantitative evaluation is sufficient.

### Deep Mode (16+ Modified Files or Core/Shared Modifications)

→ Apply 8-Axis quantitative evaluation **+ Cognitive Pattern Lenses**.

**Execution Method**:
1. When evaluating Architecture → Apply Pattern #1-5 lenses
2. When evaluating Code Quality → Apply Pattern #6-10 lenses
3. When evaluating Risk/Rollback → Apply Pattern #11-15 lenses
4. When pattern violations are found → Record findings citing the specific pattern number

**Report Format**:
```
COGNITIVE PATTERN FLAGS:
  #1 Boring by Default: Redis introduced — Is this spending an innovation token?
     Recommend evaluating if built-in in-memory LRU cache suffices.
  #2 Blast Radius: Payment module modified — Impacts entire checkout flow.
     High risk if deployed directly without feature flags.
```

### Relationship with Multi-Perspective Review

Complements the 6 roles of R-CM-012 `multi-perspective-protocol.md` (PM, Developer, QE, Security, DevOps, UI/UX):
- Multi-Perspective = **Role-based** independent evaluation
- Cognitive Patterns = **Experience-based** intuition lenses
- Combining both catches patterns that "pass the checklist but are intuitively dangerous".

## Maintenance

- **Last updated**: 2026-03-27
- **Known limits**: Team operations patterns (#10 Glue Work, #14 State Diagnosis, #15 Org Structure) have lower applicability in solo projects, but gain critical value as projects scale to team environments.
