---
name: feature-spec-generator
description: Takes user stories, Why, and requirements as input to generate implementable SPEC.md and Screen documents. Transforms developer intent into contract documents that AI can implement.
---

# Feature Spec Generator

> **Core concept**: Transforms intent and CONTEXT.json into implementable SPEC/Screen contracts.

This skill reads `CONTEXT.json` created by `feature-architect` and generates `SPEC-*.md` (and `screens/*.md` when needed) so that AI implementers can execute work without ambiguity. Refer to reference files on-demand for lengthy question catalogs and template examples.

## Inputs

Required:

- Feature ID: e.g., `001-user-dashboard`
- `docs/features/<id>/CONTEXT.json`

Optional:

- Additional requirements not in CONTEXT
- Additional technical/business constraints

This skill does not create `CONTEXT.json`. If it does not exist, run `feature-architect` first.

## Path Contract

Before performing file operations, read `project-config.json` to resolve path placeholders.

| Placeholder | Resolution Source | Default |
|---|---|---|
| `{FEATURES_DIR}` | `project-config.paths.features` | `src/features` |
| `{DOCS_DIR}` | `project-config.paths.docs_features` | `docs/features` |
| `{COMPONENT_EXT}` | `project-config.conventions.component_extension` | `.tsx` |
| `{FEATURE_LAYERS}` | `project-config.conventions.feature_structure` | `["types","api","hooks","components"]` |

Never use literal `src/features/` or `src/shared/` as generated paths in the SPEC.

## Protocol

### Phase 0: CONTEXT Validation

Mandatory checks:

- `feature_id`
- `title`
- `why`
- `quick_resume.current_state == "SpecDrafting"`
- If `artifacts.brief` exists, read BRIEF.md to extract raw request, User Stories, BDD AC, Scope, and Constraints.

Do not halt if BRIEF.md is missing; however, record a warning regarding limited intent traceability.

### Phase 1: Context Gathering

Gather in read-only mode.

| Source | Purpose |
|---|---|
| `CONTEXT.json.references` | Candidate related SPECs / code / API routes |
| Existing `SPEC-*.md` | Local documentation patterns |
| `{FEATURES_DIR}/<feature>/types` | TypeScript / Zod schemas |
| `{FEATURES_DIR}/<feature>/hooks`, `components`, `api` | Implementation patterns |
| `DESIGN.md` | SSOT for design tokens, typography, and component language for UI features |
| `docs/ui-flow/ui-flow.json` | UI Flow Contract |
| `docs/features/<id>/design/` | Screen §13 Design Reference |

### Phase 2: Clarification

Maximum of 7 questions.

- 1–6 questions: Ask only necessary questions.
- 7 questions: Autonomously halt after the 7th question.
- If more than 7 are needed: Select reasonable defaults or record as Assumptions.

Record Q&A in BRIEF.md Section 8 (Clarification Log). Read `references/spec-generation-protocol-details.md` on-demand for the detailed question catalog.

### Phase 3: SPEC Generation

Mandatory artifacts:

- `docs/features/<id>/SPEC-<id>.md`
- For UI features: `docs/features/<id>/screens/*.md`

Generation principles:

- Present conservative vs. expansive proposals (2 options) first and reflect user choice.
- Determine need for screens based on `feature_type`.
- Generate Product Requirements §6.5 for user-facing features.
- Generate §1.5 UI Flow Contract for `ui_feature`.
- For `ui_feature`, specify `DESIGN.md` references and the scope of semantic tokens to use in §0.9 Design Tokens.
- Empty sections are prohibited. If not applicable, explicitly state `N/A - <Reason>`.

Follow `references/spec-sections.md` for section depth and mandatory sections.

### Phase 3.5: API Contract, Dependencies, NFR

Always include the API Contract section.

- No API usage: `N/A - Client-side only`
- 1–2 APIs: Document directly within the SPEC
- 3+ APIs or complex APIs: Confirm with user whether to separate into `API-<id>.md`

Mandatory when using APIs:

- Method, Path, Auth
- Request Schema
- Response Schema
- Error Codes
- Code takes precedence in case of conflicts with Zod/type definitions in code

Verified Dependencies:

- Record `verified`, `verification_source`, and `verified_at` for external APIs, SDKs, and services.
- If `verified=false` exists, reflect unverified external dependencies in the risks section.

NFR (Non-Functional Requirements):

- Performance / Response times
- Reliability / Retries
- Cost (when using AI/LLM)
- Standard logging or observability

### Phase 3.7: Parallel Implementation Guide

Generate §0.10 / §0.11 if there are 3 or more Functional Requirements (FRs).

- §0.10 FR Dependency Graph: FR `depends_on`, layers, complexity, parallel batches
- §0.11 Parallel Work Units: Foundation, Backend, Frontend, Test, Integration Checklist

If 2 or fewer FRs, explicitly mark as `N/A - Sequential implementation`.

### Phase 4: Verification and Handoff

Mandatory verification:

- If BRIEF exists, record User Story / BDD AC ↔ FR traceability in `CONTEXT.json.traceability`.
- If new Zod schemas exist, §0.1 Target Files must include the Type/Schema layer.
- If new API Routes exist, §0.1 Target Files must include the API Route layer.
- If 3 or more FRs, §0.10/§0.11 must cover all FRs and Target Files.
- Incorporate Error & Rescue Map and Interaction State Coverage templates into the SPEC.

Upon completion, update `CONTEXT.json`:

- `quick_resume.current_state`: `SpecDrafting`
- `quick_resume.current_task`: `SPEC.md generation complete, awaiting Readiness Gate`
- `quick_resume.next_actions`: `["Execute Readiness Gate", "Start implementation on Go"]`
- `progress.fr_total`
- `progress.details`
- `artifacts.spec`
- `artifacts.screens`
- `artifacts.design_assets`
- `decisions[]`
- `history[]`
- Synchronize `references.related_code` with §0.1 Target Files

## Required SPEC Surface

Minimum required content:

- §0.0 Project Context
- §0.1 Target Files
- §0.2 Core State / Architecture / State Transitions
- §0.3 Error Handling
- §0.4 Data Schema
- §0.5 API Contract
- §0.6 NFR
- §0.7 AI Logic & Prompts (or N/A)
- §0.8 Safety & Guardrails (or N/A)
- §0.10/§0.11 Parallel Implementation Guide (or N/A)
- §1 Overview, §1.4 Goals / Non-Goals, §1.5 UI Flow Contract (or N/A)
- §2 Functional Requirements, BDD AC, Exception Flows, Business Rules
- §3 Dependencies & Risks
- §4 Screen Docs (or N/A)
- §5 Verification & Tests
- §6 Messages
- §6.5 Product Requirements (or N/A)

Read `references/spec-sections.md` for detailed depth matrix and SPEC-Lite examples.

## Reference Loading Guide

| Scenario | Reference |
|---|---|
| Detailed authoring criteria per SPEC section | `references/spec-sections.md` |
| Legacy long-form protocol, question catalog, API/NFR examples | `references/spec-generation-protocol-details.md` |
| Authoring Error & Rescue Map | `references/error-rescue-map-template.md` |
| Authoring Interaction State Coverage | `references/interaction-state-coverage-template.md` |

## AI Behavior

### DO

- Traceably reflect intent from CONTEXT.json and BRIEF.md into FR/AC.
- Compress questions to 7 or fewer.
- Explicitly document assumptions as Assumptions.
- Never fake verification status for external dependencies.
- Specify concrete test paths and Target Files.

### DON'T

- Do not start without CONTEXT.json.
- Do not finalize new data structures without user confirmation.
- Do not leave empty sections.
- Do not create excessively broad documents like PRDs; a SPEC is an implementation contract for a single feature.

## Not For / Boundaries

- CONTEXT.json generation: `feature-architect`
- Code implementation: `feature-implementer`
- Modifying existing SPECs: `feature-spec-updater`
- Market research / competitive analysis: `discover`, `research-pilot`

## Maintenance

Sources:

- `docs/_templates/spec_template.md`
- `docs/_templates/screen_template.md`
- `docs/_templates/api_template.md`
- `references/spec-sections.md`
- `references/error-rescue-map-template.md`
- `references/interaction-state-coverage-template.md`

Known limits:

- When context7/WebSearch is not used, `verified_dependencies.verified` may remain false.
- Traceability quality is limited if BRIEF.md is missing.
