---
name: feature-implementer
description: Skill that implements actual code via TDD given SPEC.md and Screen documents as input. Serves as the implementation executor between feature-spec-generator and readiness-gate.
---

# Feature Implementer

`feature-implementer` is the executor that converts implementation contracts created by `feature-spec-generator` into real code and tests. The active document contains only the minimal binding contracts the AI must maintain during work; long templates and detailed examples are read on-demand from `references/implementation-protocol-details.md`.

## Role Boundaries

| Skill | Responsibility | Output |
| --- | --- | --- |
| `feature-architect` | Establish intent, gather context | `CONTEXT.json` |
| `feature-spec-generator` | Convert requirements into implementable contracts | `SPEC.md`, `screens/*.md` |
| `feature-implementer` | Implement SPEC via TDD | `{FEATURES_DIR}/**/*`, `{TESTS_DIR}/**/*.test.*` |
| `feature-wiring` | Verify exports, routes, and data flow integration | Go/No-Go verdict |

## Path Contract

Before performing file operations, read `project-config.json` to resolve dynamic paths. If not present, use the default values below, but always use resolved values in generated code and commands.

| Placeholder | Resolution Source | Default |
| --- | --- | --- |
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{TESTS_DIR}` | `project-config.paths.tests_unit` | `tests/unit` |
| `{COMPONENT_EXT}` | `project-config.conventions.component_extension` | `.tsx` |
| `{FEATURE_LAYERS}` | `project-config.conventions.feature_structure` | `["types","api","hooks","components"]` |

Do not design around hardcoded literal paths like `src/features/` or `tests/unit/`. If paths conflict with the SPEC, `project-config.json`, or existing code, stop implementation and report the conflict.

## Phase 0: Pre-Validation

Lock down the context in the following sequence before starting implementation:

1. Verify architecture overview, Feature-First dependency rules, and test/quality commands in `CLAUDE.md`.
2. Read target `SPEC.md` and `screens/*.md` to confirm `## 0. AI Implementation Contract`, `## 2. Functional Requirements`, and `## 3. Dependencies & Risks` are complete.
3. Review Hard Constraints, Soft Constraints, current state, and worktree information in `CONTEXT.json`.
4. If a UI feature, read root `DESIGN.md` first, then verify derived tokens (`docs/design/tokens/`) and page overrides (`docs/design/pages/{page}.md`).
5. If a UI feature, cross-check `docs/ui-flow/ui-flow.json` against the UI Flow Contract in the SPEC.
6. Map code paths to implement and user flows against the Test Coverage Diagram (`references/test-coverage-diagram-template.md`).
7. If a Task Identity Contract exists in `PLAN.md`, prioritize Current Behavior / Desired Behavior / Out of Scope / Context Authority over file/line directives. If code deviates from planned file directives, update the plan or reject back to caller skill before implementation.
8. If `PLAN.contract.json` exists, validate with `make q.engineering-plan-contract` first. If missing and `PLAN.md` contains a Failure Modes Registry, reject back to caller skill or augment `PLAN.contract.json` in the same directory, then verify that each Failure Mode is mapped to the test plan (Red phase) without omission.

If any required item among Data Model, State/Hook, Error Handling, Target Files, or AC/EC in the SPEC is incomplete, reject back to `feature-spec-generator` before writing code.

## Phase 1: Implementation Plan

Create a granular implementation sequence based on SPEC `§0.1 Target Files` and the FR list. The default sequence is `Type/Zod Schema -> API Layer -> Hook/State -> Component/Page -> Export/Wiring -> Tests`, with dependency relationships in existing code taking precedence.

Maintain the following checklist for each FR, updating to `[x]` as items complete:

```markdown
## FR-xxxxx

- [ ] Red: Write failing tests based on AC/EC and Failure Modes Registry; verify failure
- [ ] Green: Minimal implementation required to pass tests
- [ ] Refactor: Clean up duplication, naming, and error handling
- [ ] Verify: Tests pass based on project-config.json#commands.test (dynamic detection if null)
- [ ] Verify: Quality gates pass based on project-config.json#commands.quality_gate (skip if null)
- [ ] Update SPEC / CONTEXT.json progress state
```

Do not proceed to the next FR without updating the checklist.

## Phase 2: Red-Green-Refactor

The TDD cycle is strictly fixed:

1. **Red**: Write tests covering SPEC Acceptance Criteria and Edge Cases first; verify test failure.
2. **Green**: Implement minimal code required to pass tests. Do not add un-specced features.
3. **Refactor**: Clean up according to project patterns; verify tests continue to pass.

Mandatory Rules:

- `R-CM-011`: Do not verify mocks for the sake of mocking. Never create test-only methods or ungrounded mocks.
- `R-CM-010`: Record verification commands and output before claiming completion.
- The SPEC is the Single Source of Truth. Data models, state structures, error handling, AC, EC, and implementation hints come directly from the SPEC.
- For UI colors, typography, spacing, radius, and component language, `DESIGN.md` is the Single Source of Truth.
- UI text, logging, error handling, and import patterns must follow established project conventions.
- When implementing code paths requiring production diagnostics (external calls / state transitions / failure branches), invoke `observability-and-instrumentation` during Refactor to co-design logs, metrics, and traces. Pure logic or UI-only changes are exempt.

## Hard Constraints And Auto-Stop

Hard Constraints in `CONTEXT.json` must never be bypassed under any circumstances. Immediately stop and request user confirmation or reject back to caller skill upon encountering:

| Condition | Action |
| --- | --- |
| Incomplete SPEC mandatory contract | Reject back to `feature-spec-generator` |
| Conflict between Hard Constraints and implementation requirement | Stop and report conflict |
| Modifying Auth, Authorization, Payment, or PII handling | Require user approval or security review |
| Discrepancy between external API contract and actual code | Report discrepancy and re-verify SPEC/API contract |
| Need to modify existing public interface | Verify if allowed under Soft Constraints |
| Unknown cause for test failure | Analyze cause, stop, and report |

Overengineering Prevention: Do not introduce abstractions or generalizations unsupported by current FR AC/EC, SPEC implementation hints, or existing codebase patterns.

## CONTEXT.json Update

Upon starting implementation, update `quick_resume.current_state` to `Implementing`, recording current FR, next actions, and `last_updated_at`. Upon completing each FR, update `progress.fr_completed`, `fr_in_progress`, and related file lists. Upon completing full implementation, set next actions to `feature-wiring` and `feature-status-sync`.

If interrupted, provide a `status: paused` handoff so subsequent AI sessions can immediately understand the SPEC, CONTEXT, PLAN, and failing verification commands.

## SDD Mode

Consider Subagent-Driven Development (SDD) when `PLAN.md` exists and 3 or more independent tasks are identified. Never dispatch parallel implementation agents that modify the same file concurrently.

Fixed SDD sequence (Superpowers v6.1.1 aligned — Unified Task Reviewer):

1. Run Pre-Flight Plan Review before starting Task 1 to check plan conflicts comprehensively.
2. Implementer executes one task (task prompt passed via file handoffs rather than inline prompts).
3. Single Task Reviewer evaluates Spec Compliance + Code Quality in a single diff pass and returns **2 independent verdicts**.
4. Controller never blindly trusts subagent `DONE` reports; re-verifies diff, review output, and verification commands.
5. If issues arise, route back to the same phase for remediation and re-review. Completed tasks are recorded in the Durable Progress Ledger (compaction-resistant).

Prompts and detailed state handling:

- `references/sdd-implementer-prompt.md`
- `references/sdd-task-reviewer-prompt.md` (Unified spec+quality — replaces legacy separate reviewers)
- `references/gan-generator-evaluator-pattern.md`
- Detailed disciplines (Pre-Flight / File Handoffs / Progress Ledger / Model Selection): `references/implementation-protocol-details.md` §SDD Mode

## References

Consult on-demand only:

| Reference | Use When |
| --- | --- |
| `references/implementation-protocol-details.md` | Full legacy protocol, code templates, test authoring examples, or error handling tables are needed |
| `references/test-coverage-diagram-template.md` | Mapping branches, user flows, and edge cases prior to starting TDD |
| `references/sdd-*.md` | Subagent implementation/review prompts are needed in SDD mode |
| `references/superpowers-controller-verification.md` | Controller re-verifies diff, review, and verification evidence after subagent reports completion |
| `references/gan-generator-evaluator-pattern.md` | Reinforcing generator/evaluator separation principles |

## Not For / Boundaries

- Bug-fix only tasks: `bug-fix`
- Refactoring without spec changes: `/code-review --fix`
- Infrastructure / deployment changes: `infra-designer` or `deploy`
- Simple documentation synchronization: `sync-project-md`

## Maintenance

- Sources: TDD principles, SDD patterns, project SPEC.md, CLAUDE.md
- Last updated: 2026-05-04
- Active budget target: Under 260 lines
