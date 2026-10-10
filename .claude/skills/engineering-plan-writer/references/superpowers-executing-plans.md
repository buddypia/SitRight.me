# Plan Execution Cycle Guide (engineering-plan-writer Reference)

> **Source**: `oss/superpowers/skills/executing-plans/SKILL.md` (Pattern Track adapted)
> **Adaptation**: Stripped original frontmatter. Converted "your human partner" → "user". Transformed superpowers cross-references (subagent-driven-development → sequential execution cycle, finishing-a-development-branch → create-pr). Aligned prohibition of direct edits to main/master with R-CM-008.
> **Loaded by**: Invoked when executing authored plans sequentially with intermediate review checkpoints.

---

## Core Execution Flow

> "Load plan, review critically, execute all tasks, report when complete."

**Context of Application**: Plans containing strict task dependencies or requiring human review checkpoints should execute via this sequential cycle.

---

## Step 1: Load and Review Plan

1. Read the plan document.
2. **Review critically** — identify ambiguities, hidden assumptions, or risks.
3. If concerns exist → **raise them to the user** before starting.
4. If no concerns → create task checklists and begin execution.

### Review Checklist

- Does every task specify exact file paths?
- Is each step sized to a 2–5 minute action?
- Does it enforce a strict TDD cycle (failing test first)?
- Is the scope constrained to a single subsystem?
- Does the plan incorrectly assume direct work on main/master? (Violates R-CM-008 — feature branches mandatory)
- Are automated verification steps explicitly documented?

---

## Step 2: Execute Tasks

For each task:
1. **Update Task State**: Mark as `in_progress`.
2. **Execute Step-by-Step**: Follow bite-sized steps (2–5 mins per step).
3. **Run Verification Post-Step**: Execute commands specified in the plan.
4. **Update Task State**: Mark as `completed` immediately upon verification (batch updates forbidden).

### Handling Blockers During Execution

**Halt immediately** and escalate to the user under these conditions:

| Blocker Condition | Handling Protocol |
|---|---|
| Missing Dependency (Library not installed) | Halt + state missing package |
| Unexpected Test Failure | Halt + invoke `systematic-debugging` |
| Ambiguous Plan Instruction | Halt + request clarification |
| Repeated Verification Failure | Halt + trigger R-CM-017 3-Strike escalation |
| Critical Gap in Plan Architecture | Halt + revert to Step 1 plan review |

**Never guess or hallucinate solutions.** Adhere to Anti-Sycophancy rules (R-CM-016).

---

## Step 3: Complete Development

When all tasks are complete and verified:
1. **Notify User**: "Executing create-pr to finalize branch delivery."
2. **Required Sub-Skill**: Invoke `/create-pr` (brief2dev create-pr skill).
3. Verify test suite, review branch options, and execute user-approved merge actions.

---

## When to Revisit Earlier Steps

Revert to Step 1 under these conditions:

- User updates the plan based on review feedback.
- Core technical approach requires fundamental restructuring.
- 3+ tasks fail with identical architectural patterns (indicates structural flaw).

**Never force progress through blockers** — stop and clarify.

---

## Iron Rules

| Rule | Description |
|------|-------------|
| Critical Plan Review | Critically audit the plan prior to execution |
| Exact Step Execution | Implement exactly as specified, not "approximately" |
| Never Skip Verification | "Should pass" assumptions are forbidden (R-CM-010 violation) |
| Honor Plan References | Follow referenced conventions and sub-skills explicitly |
| Stop When Blocked | Never proceed on ungrounded assumptions |
| **No Direct Work on Main** | **Never implement directly on main/master without explicit approval** (R-CM-008) |

---

## brief2dev Integration

### Execution Mode Selection

| Plan Characteristic | Recommended Execution Tool |
|----------------------|----------------------------|
| Strict Task Dependencies (A → B → C) | This Guide (Sequential) |
| Intermediate Review Checkpoints Required | This Guide (Sequential) |
| Single Isolated Task | `feature-pilot` direct invocation |

### Linkages to Other brief2dev Skills

| Skill | Relationship |
|-------|--------------|
| `engineering-plan-writer` | Authors the execution plan |
| `feature-implementer` | Executes implementation steps |
| `systematic-debugging` | Invoked upon unexpected test failures (4-phase protocol) |
| `create-pr` | Finalizes delivery post-verification |
| R-CM-008 (git-workflow) | Enforces branch isolation |
| R-CM-010 (verification-before-completion) | Enforces mandatory empirical verification |
| R-CM-017 (3-Strike Escalation) | Triggered upon repeated step failures |

---

## Anti-Patterns

| Anti-Pattern | Operational Impact |
|--------------|-------------------|
| Executing without critical review | Builds upon flawed assumptions, leading to massive rollbacks |
| Approximating plan steps | Subtle divergences introduce hard-to-trace regressions |
| Skipping verification ("check later") | Violates R-CM-010; compounds unverified errors |
| Batch-updating task statuses | Destroys execution observability; obscures failure points |
| Guessing through blocked states | Constructs code on top of invalidated assumptions |
| Working directly on main branch | Violates R-CM-008 git hygiene rules |

---

## Maintenance

- **Sources**:
  - Original: `oss/superpowers/skills/executing-plans/SKILL.md`
  - Attribution: superpowers OSS by Jesse Vincent / Prime Radiant
- **Last updated**: 2026-04-25
- **Adaptation type**: `adapted` (Preserved core execution cycle + mapped to brief2dev `create-pr`)
