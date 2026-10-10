# Efficiency and Quality Skills

> Detailed reference document separated from feature-pilot SKILL.md.

> **Core Concept**: Optimize proven patterns for project technology stacks.

### Integrated Skills List

| Skill | Role | Activation Condition | Integration Step |
| -------------------- | ---------------------------------------- | -------------------------- | ---------------------- |
| **pre-quality-gate** | lint + test + architecture check cycle | After implementation complete | Between Step 4.6 → Step 5 |

### pre-quality-gate (QA Cycle)

**Execution Timing**: After completing Step 4.5 (`feature-wiring`)

**Cycle Flow**:

```
Skill Tool:
- skill: "pre-quality-gate"

→ Run make q.check (lint + test + architecture check)
→ On failure, fix and re-run (up to 5 iterations)
→ Same error 3 times → Halt
```
