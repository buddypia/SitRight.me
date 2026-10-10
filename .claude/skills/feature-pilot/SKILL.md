---
name: feature-pilot
description: |
  Unified orchestrator for AI-driven feature development in the target project.
  Acts as the single entry point for all development requests, automatically determining the work type and orchestrating appropriate sub-skills.
  Includes built-in Readiness Gate to directly execute Go/No-Go validation.

  Triggered by requests such as "add new feature", "fix bug", "modify feature", "development request", "implement this".
calls:
  - feature-architect
  - feature-spec-generator
  - feature-spec-updater
  - ui-approval-gate
  - feature-implementer
  - engineering-plan-writer
  - feature-wiring
  - feature-status-sync
  - story-decomposer
  - feature-doctor
  - bug-fix
  - pre-quality-gate
  - final-review
  - verification-loop
  - research-pilot
  - priority-analyzer
---

# Feature Pilot

`feature-pilot` is the single entry point for development requests. The active documentation contains only the execution contracts necessary to prevent confusion regarding work types, worktrees, CONTEXT, sub-skills, and verification transitions. Detailed procedures and extensive pipeline examples are referenced on-demand from `references/feature-pilot-protocol-details.md`.

## Core Contract

- **Single Entry Point**: Do not make the user select individual skills. Classify the request and orchestrate the appropriate pipeline directly.
- **No Direct Bypass**: SPEC creation/update, bug fixes, UI approval, wiring, and status sync must not bypass their dedicated sub-skills.
- **CONTEXT First**: For new features, `feature-architect` must create `CONTEXT.json` before passing control to `feature-spec-generator`.
- **Readiness Gate Built-in**: NEW_FEATURE / MODIFY_FEATURE must evaluate Go/No-Go in the built-in Readiness Gate following UI approval.
- **Worktree Required**: Code changes must be performed in `.worktrees/<branch>`. The PLAN lives at `.worktrees/<branch>/.tmp/worktree-<safeBranch>/PLAN.md` (the path `worktree-plan-path.mjs#resolveWorktreePlanPath` resolves and every gate reads). `worktree-init.mjs` creates it from the template; do **not** write a `PLAN.md` at the worktree root (nothing reads it).
- **Ownership Index Before Routing**: Before deciding NEW vs MODIFY, execute a derived ownership query to inspect existing feature/file candidates. This index serves as supplementary evidence and does not replace `domain-map.json` or `CONTEXT.json`.
- **Evidence-Based Completion**: Verify test/quality validation, sub-skill Post-flights, and `CONTEXT.json` cleanup status before reporting completion.

## Path Contract

Resolve paths by reading `project-config.json` before performing file operations. Use defaults if absent.

| Placeholder | Resolution Source | Default |
| --- | --- | --- |
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{SHARED_DIR}` | `project-config.paths.shared` | `src/shared` |
| `{TESTS_DIR}` | `project-config.paths.tests_unit` | `tests/unit` |
| `{DOCS_DIR}` | `project-config.paths.docs_features` | `docs/features` |
| `{COMPONENT_EXT}` | `project-config.conventions.component_extension` | `.tsx` |
| `{FEATURE_LAYERS}` | `project-config.conventions.feature_structure` | `["types","api","hooks","components"]` |

Pass resolved paths to sub-skills. Never hardcode designs to literal `src/features/` or `src/shared/`.

## Target Scope Contract

`feature-pilot` must first establish **what is being developed**. When executing inside the brief2dev core repository, `output/<slug>` represents scaffolded output and is not a target for feature-pilot deliverables unless explicitly requested by the user.

- Default target: Development tasks in the current brief2dev repository.
- Excluded target: Generated projects under `output/<slug>`. The mere presence of `output/<slug>/project-config.json` does not switch the target.
- Exception: Allow output target only when the user explicitly specifies `output/<slug>`, "generated project", or "scaffold output", or when the current working directory is inside that generated project.
- If the user specifies "output not needed" or "exclude output from deliverables", PF-009 locks target to the brief2dev core and halts output writing.

## Pre-flight Checklist

Output the checklist below before starting the skill, updating each item from `---` to passed/failed status.

```markdown
## Pre-flight Checklist (feature-pilot)

|   ID   | Item | Status |
| :----: | ------------------------------------------- | :--: |
| PF-000 | Path Resolution completed (read project-config.json) | ---  |
| PF-001 | Work type determination completed | ---  |
| PF-002 | CONTEXT.json accessible or ready for creation | ---  |
| PF-003 | Verify CLAUDE.md rules | ---  |
| PF-004 | Feature Characteristics determination completed | ---  |
| PF-005 | Verify Evidence cache | ---  |
| PF-006 | Verify sub-skill ESP compatibility | ---  |
| PF-007 | Confirm task ID | ---  |
| PF-008 | Create worktree and initialize PLAN.md | ---  |
| PF-009 | Confirm Target Scope (brief2dev core vs output/<slug>) | ---  |
| PF-010 | Domain Placement determination completed (ownership query + domain-map.json + index.md lookup) | ---  |

**Work Type**: [NEW_FEATURE | MODIFY_FEATURE | BUG_FIX | DOCS_ONLY]
**Risk Level**: [high | medium | low]
**Pipeline**: [List of pipeline steps]
```

If any item fails, halt execution and report the reason and next steps.

## Work Type Routing

| Type | Decision Criteria | Required Flow |
| --- | --- | --- |
| NEW_FEATURE | Domain Placement Verdict is NEW_IN_EXISTING_DOMAIN or NEW_DOMAIN | `research-pilot` (conditional) -> `feature-architect` -> `feature-spec-generator` -> `ui-approval-gate` -> Readiness Gate -> worktree/PLAN -> implementation -> `feature-wiring` -> QA -> `feature-status-sync` |
| MODIFY_FEATURE | Existing SPEC exists or Verdict is EXTEND_EXISTING | `feature-spec-updater` -> `ui-approval-gate` -> Readiness Gate -> implementation -> `feature-wiring` (conditional) -> `feature-status-sync` -> QA |
| BUG_FIX | Bug, error, malfunction | `bug-fix` -> verify regression test -> QA |
| DOCS_ONLY | Docs only, SPEC only, no implementation | Run specified doc/spec skills only; do not proceed to implementation |

Executing `node .claude/scripts/generate-code-ownership-index.mjs query "<user request>" --json` and looking up `{DOCS_DIR}/domain-map.json` + `{DOCS_DIR}/index.md` is mandatory before deciding NEW vs MODIFY (PF-010, details in `references/feature-pilot-protocol-details.md` Phase 0). Candidate files/features from the ownership query serve solely as input evidence for Domain Placement; final judgment is checked against `domain-map.json` and feature docs. If Verdict is DUPLICATE, halt and report existing features; if candidates are ambiguous, ask user for confirmation instead of guessing. Transition immediately to `AwaitingUser` and seek user confirmation for security, payments, or PII.

## Model Routing

Delegate lightweight scanning to a faster model and keep judgment work (trade-offs, experiment design, verdicts) on the session model.

When sub-skills are ESP v2.0+, verify their Pre/Post-flights.

## Evidence Caching

| Evidence | TTL | Invalidation |
| --- | --- | --- |
| `project-config.json#commands.lint` | 30 min | source changes |
| `project-config.json#commands.test` | 30 min | source/test changes |
| Readiness Gate | 60 min | SPEC/screens changes |
| Security Scan | 60 min | `.env*` changes |

Re-execution may be skipped if cache is valid, but force re-execution upon invalidation or when `--force` is present.

## Execution Flow

1. **Classify**: Confirm work type via request, feature ID, and existence of documentation.
   - Lock target scope first via PF-009. In brief2dev core work, `output/<slug>` is not a target unless user specifies.
   - PF-010: Query ownership and feature inventory (domain-map.json + index.md) and output Domain Placement Verdict before finalizing NEW/MODIFY.
2. **Plan**: Present pipeline table and continually update step statuses.
3. **Prepare Context**: For new features, `feature-architect` generates `CONTEXT.json`. Consider `feature-doctor` on corruption/mismatch.
4. **Produce Or Update SPEC**: Use `feature-spec-generator` for new, `feature-spec-updater` for modifications.
5. **UI Approval**: UI changes must not proceed to Readiness Gate without `ui-approval-gate` approval.
6. **Readiness Gate**: Evaluate Go/No-Go per `references/readiness-gate-protocol.md`. Return to SPEC stage if No-Go.
7. **Worktree Handoff**: Create the GitHub Flow branch and fill in `.worktrees/<branch>/.tmp/worktree-<safeBranch>/PLAN.md`, recording `branch`, `worktree_path`, `plan_path`, `status`, `last_updated`, `handoff` in `CONTEXT.json execution.worktree`.
8. **Implement And Clean**: Coordinate `feature-implementer` (with `engineering-plan-writer` / SDD if needed), followed by `/code-review --fix` clean up. <!-- retired-ref-ok: history note replacing de-sloppify -->
9. **Wire And Verify**: Run `feature-wiring`, `pre-quality-gate`, and optionally `final-review` / `verification-loop`.
10. **Sync And Cleanup**: Run `feature-status-sync`, then finalize worktree PLAN and `CONTEXT.json` cleanup status.

**Handling Absence of Optional/Conditional Sub-skills**: `research-pilot` (NEW_FEATURE Phase -1 conditional) and `priority-analyzer` (optional after status sync) should **only be called when they actually exist in the repository; if absent, log that the step was SKIPPED in progress reporting**. Neither is a hard blocker; the delivery chain completes even if skipped (R-CM-028 code branching). Other sub-skills must halt and report if absent.

### Step 3.6: Git Worktree Preparation - Mandatory

Prepare the GitHub Flow branch and `.worktrees/<branch>` worktree before code modifications. Fill in the PLAN that `worktree-init.mjs` generated at `.worktrees/<branch>/.tmp/worktree-<safeBranch>/PLAN.md` (resolve it with `worktree-plan-path.mjs#resolveWorktreePlanPath`; do not create one at the worktree root) and record `branch`, `worktree_path`, `plan_path`, `status`, `last_updated`, and `handoff` in feature `CONTEXT.json execution.worktree`. Do not modify implementation files before completing this step.

## Stage Review Checkpoints (review-deck — Gated Semi-Automated)

> **Application Condition (R-CM-028 Code Branch)**: Apply only when `.claude/scripts/review-deck.mjs` actually exists in the repo. If absent (e.g., initial scaffold target deployment), SKIP this entire section.

Principle: "Reviewing only after everything is built is already too late". Upon reaching checkpoints, AI **automatically generates and presents** a visual review deck (HTML) in the browser and awaits user verdict — **no automatic pass** (same gate pattern as ui-approval-gate). Proceed only after explicit user approval or explicit skip instruction.

| Checkpoint | Timing | Scale-Based Application (Verdict SSOT) |
| --- | --- | --- |
| CP-SPEC | Immediately after SPEC generation/update, before Readiness Gate | Skip for small / generate for med & large — `review-deck-core.mjs#estimateSpecScale` (Estimated scale based on FRs, target files, screen count) |
| CP-PLAN | Immediately after PLAN.md creation, before implementation — SPEC-less PLAN-only paths (brief2dev core fix/chore, DEBT-224 gap closure) | Replaces CP-SPEC — generate for substantive work (exceeding R-CM-010 Trivial exemption) / skip for trivial |
| CP-MILESTONE | Upon completing PLAN.md Milestones section during implementation | Skip for small / 1 midpoint check for medium / every milestone for large — `ship-deck-core.mjs#classifyScale` (measured diff) |
| CP-UI | `ui-approval-gate` (gate logic invariant) | Mandatory for all UI features — format promoted to `--stage ui` HTML deck (DEBT-226; verdict authority remains ui-approval-gate) |
| CP-SHIP | Immediately before ship (R-CM-030 Rule 12 `ship-deck`, invariant) | Large deck mandatory |

```bash
node .claude/scripts/review-deck.mjs --stage spec --spec <SPEC.md path> --narrative-json <path> [--feature <id>] [--diagram <svg>]
node .claude/scripts/review-deck.mjs --stage plan --worktree .worktrees/<branch> --narrative-json <path> [--plan <PLAN.md path>]
node .claude/scripts/review-deck.mjs --stage milestone --worktree .worktrees/<branch> --narrative-json <path> --milestone "<milestone label>"
node .claude/scripts/review-deck.mjs --stage ui --wireframe docs/wireframes/<id>-wireframe.md --narrative-json <path> [--feature <id>]
# Present generated index.html via open. Optional feedback: node .claude/scripts/ship-deck-bridge.mjs --out <outDir>/review-result.json
```

- **Deck content and narrative contract**: read `references/review-deck-contract.md` before writing `--narrative-json` (original request, impact map, verbatim sections, visuals, risk levels, required narrative and review-depth fields, CP-SHIP impact-first brief, plain-language rule).
- **Feedback Discipline (Same as R-CM-030 Rule 12)**: In stage decks (with checklists), user's "re-edit required" (`state:"ng"`) verdict slug/note is used directly as task input — do not re-interpret prose. If bridge was launched, read `review-result.json`. Ship decks have no checklist; verdict and revision instructions are received in chat.
- **Manual Entrypoint**: User may request deck generation at any time (run command directly).
- **Enforcement (Transparent Disclosure)**: Prompt-level discipline first. Missing large CP-MILESTONE is surfaced before approval by the `milestone-deck` pre-ship step (WARN, honors a PLAN `(dropped: reason)` waiver). CP-SPEC/CP-PLAN/CP-UI and medium milestones rely on audit tracking (R-CM-024).

## Built-in Readiness Gate

The central question is: "Can AI safely implement this looking ONLY at this document, without asking additional questions?". Runs in NEW_FEATURE / MODIFY_FEATURE after SPEC creation/update and UI approval.

Read `references/readiness-gate-protocol.md` for the detailed 5-Phase verification structure, output formats, and decision criteria.

## Auto-Stop

| Condition | Action |
| --- | --- |
| Work type ambiguous | Clarify with minimal questions |
| `CONTEXT.json` corrupted/mismatched | Run `feature-doctor` or report halt |
| Readiness Gate No-Go | Revert to SPEC creation/update |
| UI Approval rejected | Transition to `Blocked` or `AwaitingUser` |
| Sub-skill failed | Report failure cause, retry availability, and need for manual intervention |
| Security / Payments / PII | Stop immediately; mandatory user confirmation |
| Same error 3 times or QA retry limit reached | Halt and record handoff |

## Post-flight Checklist

Output the checklist below before completion, updating each item.

```markdown
## Post-flight Checklist (feature-pilot)

|   ID    | Item | Status |
| :-----: | --------------------------------------------------- | :--: |
| POF-001 | Pipeline completed or explicitly halted | ---  |
| POF-002 | CONTEXT.json final state update completed | ---  |
| POF-003 | QA verification passed (pre-quality-gate) | ---  |
| POF-004 | All sub-skill Post-flights completed | ---  |
| POF-005 | Evidence caching completed | ---  |
| POF-006 | DoD verification completed (completion_contract verdict = passed) | ---  |
| POF-007 | Worktree PLAN.md and CONTEXT.json cleanup completed | ---  |

**Final Status**: [Done | Blocked | AwaitingUser | Failed]
```

## References

| Reference | Use When |
| --- | --- |
| `references/feature-pilot-protocol-details.md` | Full previous protocol, long pipeline examples, user interactions, detailed DO/DON'Ts are needed |
| `references/context-management-protocol.md` | `CONTEXT.json` state machine, lifecycle, and DoD verification are needed |
| `references/readiness-gate-protocol.md` | Built-in Readiness Gate 5-Phase verification details are needed |
| `references/efficiency-skills-protocol.md` | `pre-quality-gate` operational details are needed |
| `references/autonomy-control-rules.md` | 7-question limit, autonomy levels, and auto-stop conditions are needed |

## Not For / Boundaries

- Initial project scaffolding: `project-scaffolder`
- Business and market analysis: `business-analyzer`, `market-researcher`
- Standalone discovery / research: `discover`, `research-pilot`
- GTM and pricing strategies: `gtm-pilot`, `pricing-strategist`
- Core brief2dev pipeline execution: `brief2dev-orchestrator`

## Maintenance

- Sources: CLAUDE.md, project-config.json, R-CM-018
- Active budget target: <= 260 lines
