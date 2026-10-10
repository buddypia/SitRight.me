# De-Sloppify Protocol: 3-Pass Review

## Overview

De-Sloppify pattern extracted from ECC's Autonomous Loop.
A 3-pass systematic inspection protocol used in `final-review` Deep mode.

## 3-Pass Structure

### Pass 1: Structural Integrity

- **Focus**: File structure, import paths, type definitions
- **Axis Mapping**: Axis 1 (Process Trace & Impact), Axis 2 (Logic & Data Flow)
- **Checklist**:
  - [ ] Feature-First directory conventions followed
  - [ ] Import paths resolvable (consistent absolute/relative paths)
  - [ ] Complete type definitions (minimal `any`/`unknown` usage)
  - [ ] Barrel export (`index.ts`) consistency
  - [ ] Zero unused imports
- **Convergence Criteria**: 0 CRITICAL findings

### Pass 2: Behavioral Integrity

- **Focus**: Edge cases, async race conditions, error handling
- **Axis Mapping**: Axis 3 (Edge Cases & Failure Modes), Axis 5 (Performance & Resources)
- **Checklist**:
  - [ ] `null`/`undefined` guards present
  - [ ] Comprehensive error handling in async functions
  - [ ] Race condition possibilities audited
  - [ ] Boundary conditions handled (empty array, empty string, 0)
  - [ ] Cleanup logic verified (`useEffect` cleanups, subscription unbinds)
- **Convergence Criteria**: 0 new findings (max 2 iterations)

### Pass 3: Contractual Integrity

- **Focus**: Security, API contracts, test sufficiency
- **Axis Mapping**: Axis 4 (Security & Privacy), Axis 6 (Test Sufficiency & Evidence)
- **Checklist**:
  - [ ] Zero XSS/Injection vectors
  - [ ] API request/response validated via Zod schemas
  - [ ] Zero sensitive data exposure
  - [ ] Test coverage sufficient for changed code
  - [ ] SPEC ↔ Implementation consistency
- **Convergence Criteria**: Compute Quality Score (0-100)

## Activation Criteria

Activated only in Deep mode:
- 10+ modified files
- Changes to `shared/` or shared components
- API Route modifications
- Security-sensitive code modifications

## Quality Score Computation

```
Score = max(0, 100 - ((CRITICAL x 25) + (HIGH x 10) + (MEDIUM x 3) + (LOW x 1)))
```

| Grade | Score | Meaning |
| :---: | :---: | --- |
| A | 90-100 | Production Ready |
| B | 80-89 | Minor Issues Present |
| C | 60-74 | Remediations Required |
| F | 0-59 | Unshippable |

Go Criteria: CRITICAL=0, HIGH=0, Score >= 80.
