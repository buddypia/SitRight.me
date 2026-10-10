# No-Go Routing Protocol

Subsequent procedures to follow when `final-review` outputs a **No-Go** or **Conditional Go** verdict. Because `final-review` is strictly **Read-Only**, it possesses zero modification privileges. The caller (user or orchestrator) is responsible for executing this protocol.

## Core Principle

```
Verdict → Category-based Routing → Fix → Re-run final-review in same turn → Fresh Evidence
```

- R-CM-010 Generation-Verification Loop: Fixes and re-verifications must be bound within the **same turn**. Never defer to the next turn.
- R-CM-016 Rule 10 User Sovereignty: To prevent AI self-referential loops (where the AI approves its own fixes), re-verification must collect a fresh `Evidence Bundle` (execution command + exit code + test counts).
- R-CM-029 Rule 5 Manage Confusion: When candidate routing categories are ambiguous, silent selection is prohibited. Name alternatives and present options to the user.

## Blocker → Skill Routing Matrix

Classify items from the `Blockers` row of `Review Summary` using the following table. If a blocker spans multiple categories, address the higher-priority category (upper row) first.

| Blocker Category (8-Axis Mapping) | Routed Skill | Rationale / Reinforcing Rule |
| --- | --- | --- |
| Test Failure / Missing Tests (Axis 6) | `feature-implementer` (code + tests together) or the `tdd-guide` agent | R-CM-010 Red-Green cycle |
| Logic Bug / Edge Cases (Axes 2-3) | `bug-fix` (write reproducing test → fix → pass) | R-CM-017 Dynamic Scope Lock |
| Security Finding (Axis 4, Confidence ≥ 8/10) | `bug-fix` + explicit security context | OWASP/STRIDE remediation, `cso-security-protocol.md` |
| Un-rollbackable / Operational Risk (Axis 7) | `bug-fix` or SPEC review then `feature-implementer` | — |
| Overengineering / Complexity ROI Inefficiency (Axis 8) | `code-standards-aligner` (or Claude Code `/code-review --fix`) for code cleanup, or `code-standards-aligner` for large refactors | R-CM-029 Rule 3 Simplicity |
| Hack / TODO / FIXME masking symptoms | `bug-fix` (enforce root cause) | `final-review` Auto-Stop condition |
| SPEC Inconsistency (Axis 1) | `feature-spec-updater` or SPEC re-negotiation | R-PL-001 Rule 4 Cross-reference integrity |
| Process Trace Incomplete (Axis 1) | `feature-spec-updater` or `feature-architect` | — |
| Performance / Resource Leak (Axis 5) | `bug-fix` or `code-standards-aligner` (or Claude Code `/code-review --fix`) for simple cases | — |

### Prohibited Routing Patterns

| Prohibited Pattern | Rationale |
| --- | --- |
| Using `code-standards-aligner` (or `/code-review --fix`) for security/logic bugs | Linters only preserve and clean. Behavioral fixes require `bug-fix`. |
| Disabling `--strict` / Arbitrarily downgrading severity | Direct violation of R-CM-010 anti-rationalization table. |
| Masking with `// TODO` to achieve Go | `final-review` Auto-Stop condition (hiding symptoms). |
| Deferring to "next PR" | Violation of R-CM-012 Rule 4 ("Future is Now"). |
| Adding tests without fixing code | Fails Axes 2/3 even if Axis 6 passes. |

## Generation-Verification Loop (Mandatory)

```
1. final-review → No-Go (Report Blockers + Next Actions)
2. Classify Blocker category via Routing Matrix
3. Invoke corresponding skill → Fix (Edit / Write)
4. Re-execute final-review in the SAME turn
5. Evaluate Verdict:
   - Go → Proceed to next step (`/create-pr` Pre-Ship Human Review Panel)
   - Conditional Go → Isolate non-blockers into separate PR/issue before proceeding
   - No-Go → Return to Step 2 (Increment 3-Strike counter)
```

- Re-verification strictly requires fresh command execution + exit code + pass/fail counts.
- Reusing prior execution results is prohibited (R-CM-010 Anti-Rationalization Table).

## 3-Strike Escalation (R-CM-017 Rule 3)

If No-Go repeats **3 consecutive times** with the same approach, a **4th attempt is strictly prohibited**. Report findings to the user and delegate the decision.

### Stagnation Pattern Classification (R-CM-017 Rule 3.1)

| Pattern | Signal | Recommended Persona |
| --- | --- | --- |
| **SPINNING** | Identical Blockers hash repeated 3 times | `Hacker` |
| **OSCILLATION** | Oscillating Blocker A → B → A → B (≥ 2 cycles) | `Simplifier` or `Architect` |
| **NO_DRIFT** | Quality Score delta < 1 (≥ 3 iterations) | `Researcher` or `Architect` |
| **DIMINISHING_RETURNS** | Score improvement delta < 5%/iteration (≥ 3 iterations) | `Simplifier` or `Researcher` |
| Common across all patterns | — | `Contrarian` (1-step adversarial) |

Persona definitions: `data/personas/{hacker,architect,simplifier,researcher,contrarian}.md`.

### Escalation Options for User Decision

| Option | Invocation Target | Applicable Scenario |
| --- | --- | --- |
| Re-evaluate SPEC | `feature-spec-updater` | Requirements ambiguous / self-contradictory |
| Architecture Mutation | `architecture-selector` | Current pattern hit fundamental architectural ceiling |
| Scope Reduction | `mvp-scoper` | Attempting too many features in a single pass |
| Builder Mode Isolation (R-CM-016 Rule 8.1) | `archive-and-reset --learning-run` | Seal run as exploratory learning run |
| Cross-Model Verification (R-CM-010 Rule 7.2) | `multi-llm-debate` / `multi-llm-reflection` / `multi-llm-recursive-meta-cognition` | Suspected self-reference loop (6 trigger table SSOT) |

### Prohibition on Autonomous Fixes Post-Escalation

Upon 3-Strike triggering, the AI must **halt** autonomous remediation attempts. Classify under R-CM-031 Novel category and delegate to user decision. Present options via `AskUserQuestion` and await user direction (no reversible defaults — decision authority rests with the user).

## Handling Conditional Go

| Condition | Action |
| --- | --- |
| 1-2 Non-blockers | Proceed with current PR. Track non-blockers in separate issues. Never sneak into current PR (R-CM-017 Dynamic Scope Lock). |
| 3+ Non-blockers | Recommend 1 cleanup attempt via `code-standards-aligner` (or `/code-review --fix`) or `bug-fix`. |
| `--strict` Mode | Conditional Go automatically demoted to No-Go. Apply Routing Matrix above. |

## Next Actions Output Format (POF-007 Enforced)

On `No-Go` or `Conditional Go`, the `Next Actions` row in `Review Summary` must strictly follow this format:

```
Next Actions:
  - Blocker #N (Axis X): <Succinct Name>
    → Routing: <skill_name>
    → Re-verification Command: <command>
  - Blocker #N+1 (Axis Y): ...

3-Strike Status: <attempt_count>/3 (Pattern: <SPINNING|OSCILLATION|NO_DRIFT|DIMINISHING_RETURNS|none>)
```

- If `attempt_count` is absent, initialize to `1/3`.
- Upon 3-Strike trigger (3/3), output the escalation options table instead of skill routing.

## Anti-Patterns

| Anti-Pattern | Violated Rule |
| --- | --- |
| Merging while ignoring No-Go | R-CM-010 Iron Law |
| Sneaking Conditional Go non-blockers into same PR | R-CM-017 Dynamic Scope Lock |
| Reporting "Fixed" without fresh re-verification | R-CM-010 Rule 1 Evidence First |
| Attempting 4th fix ignoring 3-Strike | R-CM-017 Rule 3 |
| Arbitrarily downgrading Blocker category | R-CM-010 Anti-Rationalization Table |
| Re-running final-review after superficial hacks | `final-review` Auto-Stop condition |

## Relationship with Existing Rules

| Protocol Section | Related Rule | Relationship |
| --- | --- | --- |
| Generation-Verification Loop | R-CM-010 Iron Law | Direct application |
| Routing Matrix | R-CM-029 Rule 5 (Manage Confusion) | Blocks silent category selection |
| 3-Strike Escalation | R-CM-017 Rules 3 & 3.1 | Direct application |
| Stagnation Persona Recommendations | `data/personas/manifest.json` | Recommendation only (no auto-invocation) |
| Conditional Go Non-blocker Isolation | R-CM-017 Dynamic Scope Lock | Direct application |
| Autonomous Fix Prohibition (3-Strike) | R-CM-031 Novel Category | Delegates decision to user |
| Cross-Model Options | R-CM-010 Rule 7.2 (Consensus Trigger Audit SSOT) | User-explicit invocation only |

## Maintenance

- **Sources**: Quality retrospective decisions; cross-referenced with R-CM-010 / R-CM-016 / R-CM-017 / R-CM-029 / R-CM-031.
- **Last updated**: 2026-05-12
- **Known limits**: 3-Strike pattern detection operates at prompt level; persona invocations are recommendations only; cross-model verification triggers on explicit user request.
- **Boundary (R-CM-028)**: Boundary-uniform across brief2dev and scaffold targets.
