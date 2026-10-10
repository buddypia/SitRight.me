# Readiness Gate Protocol (Built-in)

> Detailed reference document separated from feature-pilot SKILL.md.

> **Core Question**: "Can AI safely implement this looking ONLY at this document, without asking additional questions?"

### Overview

The standalone `Readiness Gate` skill has been **integrated** into `feature-pilot`.

| Integration Rationale | Effect |
| ---------------------------------- | ------------------------------ |
| Eliminates Skill tool call overhead | Improves pipeline efficiency |
| Zero context switching | Prevents information loss |
| Reduces total skill count | Lowers cognitive load in small development environments |
| Self-contained in a single skill | Simplifies management |

### Execution Timing

- **NEW_FEATURE**: Step 3 (After SPEC creation)
- **MODIFY_FEATURE**: Step 3 (After SPEC update)

### Phase 0: Automated Validation (MANDATORY - Execute First)

> **Purpose**: 100% block placeholders and incomplete sections via script.

**Execute Validation Script** (Must run before Phases 1-3):

```bash
cd .claude/skills/feature-pilot/scripts
python validate_spec.py <SPEC_PATH>

# Example
python validate_spec.py docs/features/001-data-processing/SPEC-001-data-processing.md
```

**Exit Code Interpretation**:
| Exit Code | Meaning | Next Action |
|:---------:|------|---------------|
| `0` | All validations passed | Proceed to Phases 1-3 |
| `1` | BLOCKING issue | **Immediate No-Go**, SPEC revisions required |
| `2` | WARNINGs only | Proceed to Phases 1-3 with caution |

**BLOCKING Patterns (Automatic No-Go)**:

- Incomplete text formatted as `{placeholder}`
- `TODO:`, `FIXME:`, `XXX:` markers
- Empty table cells (`| ? |`, `| - |`)
- Incomplete AC (`AC1: {criteria}`)
- Path placeholders (`{FEATURES_DIR}/{feature}/components/{name}.tsx`)
- Unassigned numbers (`FR-NNN`, `SCR-NNN`)
- Checkbox AC format (`- [ ] AC1:`) -- BLOCKING in `--strict-bdd` mode (for new SPECs)

**Mandatory Section Verification**:

- Section 0 (AI Implementation Contract): `## 0. AI Implementation Contract`
- Section 0.1 (Target Files): `### 0.1 Target Files`
- Section 0.2 (State/Hook): `### 0.2 State / Hook`
- Section 0.3 (Error Handling): `### 0.3 Error Handling`
- Sections 1-3, 5: Overview, Functional Requirements, Dependencies, Change History

### 5-Phase Verification Structure

```
+-------------------------------------------------------------+
| Phase 0: Automated Validation                               |
| - Execute validate_spec.py script                           |
| - Check BLOCKING patterns (placeholders, TODO, etc.)        |
| - Check presence of mandatory sections (0, 0.1~0.3, 1, 2, 3)|
| - FR completeness check (AC, test path, impl path)          |
|     → Exit 1 causes immediate No-Go (cannot proceed)        |
+-------------------------------------------------------------+
| Phase 1: Upstream Contract Validation                       |
| - CONTEXT <-> SPEC alignment (Why, Constraints, Success)    |
| - BRIEF <-> CONTEXT <-> SPEC Why/Scope/Constraints alignment|
| - Manifest validity                                         |
+-------------------------------------------------------------+
| Phase 1.5: BRIEF <-> SPEC Traceability Validation           |
| - Verify BRIEF.md existence + Section 0 preservation        |
| - Verify User Story → FR mapping coverage                   |
| - Verify BDD Scenario → FR mapping coverage                 |
| - Verify physical existence of mapped FRs within SPEC       |
+-------------------------------------------------------------+
| Phase 2: Technical Contract Validation                      |
| - Core 5 completeness check                                 |
|   - Target Files (estimated paths)                          |
|   - UI Mapping (screen-feature mapping)                     |
|   - Verification Strategy (testing policy)                  |
|   - Cross-Feature Dependencies                              |
|   - Failure Handling (error scenarios)                      |
| - SPEC completeness (mandatory sections present)            |
+-------------------------------------------------------------+
| Phase 2.5: Product/UX Readiness                             |
| - Applicable evaluation (UI features only; backend exempt)  |
| - Engagement Design (Hook Model: Trigger→Reward→Investment) |
| - Full JTBD (Functional + Emotional + Social Job)           |
| - Retention Design (AARRR: Activation, Retention Loop)      |
| - Conversion Design (BJ Fogg MAP + Soft Paywall)            |
| - Competitive Benchmark (similar competitor features)       |
|     → Blocking: Aha Moment undefined, Functional Job        |
|       undefined, Hard Paywall detected                      |
+-------------------------------------------------------------+
| Phase 3: Implementation Safety Validation                   |
| - Automatic Risk Level determination (per characteristics)  |
| - 3 Gates (Breaking Change, Security, Testability)          |
| - Supplementary checks (migration, offline support)         |
+-------------------------------------------------------------+
```

### Final Verdict Criteria

| Verdict | Conditions | Next Action |
| ------------------ | ----------------------------------------------- | ------------------ |
| **No-Go** | Blocking item fails in Phases 1-3 (including 2.5) | Supplement documentation and re-verify |
| **Conditional Go** | No Blocking items, 1+ Warnings | Proceed with implementation with caution |
| **Go** | All passed, 0 Warnings | Begin implementation |

### Readiness Gate Output Format

```markdown
# Readiness Gate Verification Results

> **Verification Date**: 2026-02-11 14:30
> **Target**: Feature 001 - Data Processing Feature
> **Risk Level**: medium (involves_external_api)

---

## Final Verdict: Go

---

## Phase 1: Upstream Contract Validation - Pass

| Item | Status |
| ------------------------------------------ | :--: |
| Why Alignment (BRIEF -> CONTEXT.why -> SPEC) | Pass |
| Scope Alignment (BRIEF -> SPEC Goals/Non-Goals) | Pass |
| Hard Constraints Compliance (BRIEF -> SPEC) | Pass |
| Success Contracts Coverage | Pass |

## Phase 1.5: BRIEF <-> SPEC Traceability Validation - Pass

| Item | Status |
| ------------------------------------------------ | :--: |
| BRIEF.md exists | Pass |
| Section 0 (Original Request) preserved | Pass |
| US Coverage (All US → >= 1 FR) | Pass |
| BDD Coverage (All AC → >= 1 FR) | Pass |
| FR Existence Verified (Mapped FRs exist in SPEC) | Pass |

> **CONTEXT.json Update (Upon Phase 1.5 Completion)**:
>
> - `traceability.validated_at` → current timestamp (ISO 8601)
> - `traceability.user_story_to_fr` → US→FR mappings verified in Phase 1.5
> - `traceability.bdd_to_fr` → BDD→FR mappings verified in Phase 1.5
> - `traceability.unmapped_user_stories` → list of unmapped US
> - `traceability.unmapped_bdd_scenarios` → list of unmapped BDD scenarios

---

## Phase 2: Technical Contract Validation - Pass

### Core 5 Status

| Element | Status |
| -------------------- | :--: |
| Target Files | Pass |
| UI Mapping | Pass |
| Verification & Test | Pass |
| Cross-Feature Impact | Pass |
| Failure Handling | Pass |

---

## Phase 2.5: Product/UX Readiness - Pass

| Area | Status | Notes |
| ----------------------- | :--: | ------------------------------------------------------------------- |
| Engagement (Hook Model) | Pass | Aha Moment: "Receives insights upon first data processing run" |
| Full JTBD | Pass | Functional: Boost work efficiency, Emotional: Tangible accomplishment, Social: Proven expertise |
| Retention (AARRR) | Pass | Daily usage loop designed |
| Conversion (BJ Fogg) | Pass | 3 free runs/day → Soft Paywall |
| Competitive | Pass | Differentiates with AI-driven interactive analysis vs competitors |

---

## Phase 3: Implementation Safety Validation - Pass

### 3 Gate Results

| Gate | Question | Result |
| :--: | ---------------- | :--: |
| A | Breaking Change? | Pass |
| B | Security Risk? | Pass |
| C | Testable? | Pass |

---

## Next Steps

Begin implementation, following the FR sequence in the SPEC.

> **CONTEXT.json Update (Upon Go Verdict)**:
>
> - `artifacts.spec_locked_at` → current timestamp (ISO 8601)
> - `artifacts.spec_validation.last_run_at` → current timestamp
> - `artifacts.spec_validation.verdict` → "Go" | "Conditional Go"
> - `artifacts.spec_validation.blocking_count` → count of detected Blocking issues
> - `artifacts.spec_validation.warning_count` → count of detected Warnings
```

### Handling No-Go Verdicts

```markdown
# Readiness Gate Verification Results

> **Final Verdict**: No-Go

## Failure Reasons

- **Phase 2 - Verification & Test**: AC missing in FR-00103
- **Phase 2.5 - Engagement**: Aha Moment undefined

## Revision Instructions

1. Add acceptance criteria (AC) to FR-00103 in SPEC-001.md
2. Explicitly define expected test scenarios
3. Define Aha Moment in BRIEF → reflect in SPEC

## Next Action

→ **Return to Step 2**: Re-invoke feature-spec-generator to supplement SPEC
```
