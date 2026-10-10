# Feature Brief: {NNN}-{feature-name}

> **Status**: Draft | **Priority**: - | **Created**: {YYYY-MM-DD}
> **Context**: `docs/features/{NNN}-{feature-name}/CONTEXT.json`

---

## 0. Raw Request (User Prompt verbatim)

> Preserves the original user request verbatim. Serves as the anchor for intent backtracking.

```
{Copy user prompt verbatim - no editing/summarizing}
```

---

## 1. Problem & Rationale (Shape Up Pitch)

### Problem (Problem to Solve)

{Describe the problem in the current situation in 1-3 sentences}

### Why Now (Rationale for Immediate Execution)

{Why this feature is needed now, risks if delayed}

### Appetite (Investment Willingness)

| Item | Value |
| ---- | ----- |
| **Timebox** | {Small Batch: 1-2 days / Big Batch: 1-2 weeks} |
| **Complexity** | {Low / Medium / High} |
| **User Value** | {Expected user value in 1 sentence} |
| **Business Metric** | {Measurable business metric - optional} |

---

## 2. User Stories (JTBD-based)

> **Format**: "When [situation], I want to [action], So I can [value]"

| ID | When (Situation) | I want to (Action) | So I can (Value) |
| :-: | ---------------- | ------------------ | ---------------- |
| US-01 | {Situation} | {Action} | {Value} |
| US-02 | {Situation} | {Action} | {Value} |

---

## 3. User Journey

> Describes key user flows step by step.

| Step | User Action | System Response | Notes |
| :--: | ----------- | --------------- | ----- |
| 1 | {Action} | {Response} | |
| 2 | {Action} | {Response} | |
| 3 | {Action} | {Response} | |

---

## 4. Acceptance Criteria (BDD-based)

> **Format**: Given/When/Then (User-perspective acceptance criteria)

| AC | Given (Precondition) | When (Action) | Then (Outcome) | Verification Method |
| :-: | -------------------- | ------------- | -------------- | ------------------- |
| AC-01 | {Precondition} | {User Action} | {Expected Outcome} | {Verification Method} |
| AC-02 | {Precondition} | {User Action} | {Expected Outcome} | {Verification Method} |

---

## 5. Scope Boundaries

### In Scope

- {Included in this implementation 1}
- {Included in this implementation 2}

### Out of Scope

- {Excluded from this implementation 1}
- {Excluded from this implementation 2}

### Rabbit Holes (Complexity Traps)

> Shape Up Rabbit Holes: Preemptively identify areas that could explode in complexity

- {Potential rabbit hole 1 - why it is risky and how to avoid it}
- {Potential rabbit hole 2}

### §5.5 Engagement Design (User-Facing Features Only - "N/A" for Backend-Only)

> **Applicability**: Applies only to user-facing features with UI. Backend-only/logic-only features should state "N/A - Backend only".

#### Hook Model (Nir Eyal)

| Stage | Design | Example |
| ----- | ------ | ------- |
| **Trigger** (External/Internal) | {What prompts the user to enter this feature?} | Push notification, in-app badge, habit |
| **Action** (Core Behavior) | {What is the minimum unit of user action?} | Single tap, swipe, voice input |
| **Variable Reward** | {What variable reward is provided?} | New content, score update, AI feedback |
| **Investment** | {What does the user leave behind?} | Activity log, custom settings, bookmark |

#### BJ Fogg MAP (Motivation × Ability × Prompt)

| Factor | Design |
| ------ | ------ |
| **Motivation** | {Why does the user want to use this feature?} |
| **Ability** | {What is the cognitive cost? How easy is it?} |
| **Prompt** | {When and how is the action triggered?} |

#### JTBD Emotional / Social Jobs

| Job Type | Description |
| -------- | ----------- |
| **Functional Job** | {Functional task to be solved} |
| **Emotional Job** | {Emotion desired when using - confidence, accomplishment, relief, etc.} |
| **Social Job** | {How user wants to be perceived by others - proficient, hardworking, etc.} |

#### Aha Moment (Core Value Experience)

> {Specifically define the first moment user feels "This is great!"}
> e.g., "The moment real-time correction is received during the first AI conversation"

### §5.6 Competitor Benchmarks (When similar features exist in market - otherwise "N/A")

> **Applicability**: Author only when similar features exist in the market. Brand-new features should state "N/A - No similar features in market".
> **References**: `docs/research/`, `docs/analysis/competitor-registry.json`

| Competitor | Similar Feature | Our Differentiator |
| ---------- | --------------- | ------------------ |
| {Competitor A} | {Feature Name} | {Differentiator} |
| {Competitor B} | {Feature Name} | {Differentiator} |

**Key Differentiators**:

- {Core Differentiator 1}
- {Core Differentiator 2}

### §5.7 Monetization Touchpoints (When free/paid experience differences exist - otherwise "N/A")

> **Applicability**: Author only when free/paid experience boundaries exist.
> **Hard Paywall Prohibition**: Hard paywalls cannot be applied to core features (refer to CLAUDE.md).

| Item | Design |
| ---- | ------ |
| **Free Tier Scope** | {Scope accessible to free users} |
| **Conversion Trigger** | {At what moment is upgrade prompted?} |
| **Soft Paywall Method** | {Restriction mechanism - usage quota, feature gate, etc.} |
| **Conversion Target** | {Target CVR} |
| **Churn Prevention** | {Fallback experience if paywall is dismissed} |

---

## 6. Constraints

### Hard Constraints (Must Not Violate)

- [ ] {Technical/business constraint 1}
- [ ] {Technical/business constraint 2}

### Soft Constraints (Recommended)

- {Recommendation 1}
- {Recommendation 2}

---

## 7. Definition of Done (DoD)

> Measurable completion criteria for AI to declare "Implementation Complete".
> Each item is categorized by verification type (machine / ai / human).
> Tracked in CONTEXT.json `completion_contract`.

### 7.1 Feature-Specific DoD

> Completion criteria specific to this feature. Added on top of Base DoD (§7.2).

| ID | Completion Criteria | Verification Type | Verification Method |
| :-: | ------------------- | :---------------: | ------------------- |
| DoD-FS-01 | {Feature-specific completion criterion 1} | machine / ai / human | {Specific verification method} |
| DoD-FS-02 | {Feature-specific completion criterion 2} | machine / ai / human | {Specific verification method} |

### 7.2 Base DoD (Common Completion Criteria)

> Common criteria automatically applied based on task type. No manual entry needed (injected by pipeline).
> Reference: `base_dod` section in `.claude/pipelines/*.yaml`

**NEW_FEATURE**: Full FR DoD pass + make q.check + SPEC §0 compliance + Architecture compliance + Test addition + Build success + JSDoc + UI Flow + CONTEXT Done
**MODIFY_FEATURE**: Modified FR DoD pass + make q.check + Changelog update + Architecture compliance + Test update + Build success + Non-breaking changes + CONTEXT Done
**BUG_FIX**: Regression test addition (Red→Green) + make q.check + Root cause report + Minimal changes + Test pass + CONTEXT Done

---

## 8. Clarification Log

> Records Q&A with the user during spec-generator Phase 2.
> Empty upon feature-architect creation, populated by spec-generator.

| # | Question | Answer | Affected Section | Date |
| :-: | -------- | ------ | :--------------: | :--: |
| - | (Recorded during spec-generator Phase 2) | - | - | - |

---

## 9. Context Map (Related Context)

> Records locations of related files/documents discovered by AI codebase scanning.

| Category | Path / Reference |
| -------- | ---------------- |
| **Key Specs** | {Related SPEC document paths} |
| **Related Code** | {Related source code paths} |
| **DB Tables** | {Related table names} |
| **Edge Functions** | {Related edge function names} |
| **Dependencies** | {Dependent features / packages} |

---

## 10. Infrastructure Requirements (Optional)

> Document only for features that impact backend/infrastructure. If frontend-only, state "N/A".

### Compute Requirements

| Item | Value | Notes |
| ---- | ----- | ----- |
| CPU | {0.25vCPU} | {Rationale} |
| Memory | {256MB} | {Rationale} |
| Min Instances | {0} | {Minimum configuration} |
| Max Instances | {4} | {Peak estimate} |

### Database Requirements

| Item | Value | Notes |
| ---- | ----- | ----- |
| Engine | {postgresql} | {Selection rationale} |
| Size | {small} | {Estimated data volume} |
| HA | {false} | {Availability requirements} |

### External Service Dependencies

| Service Name | Purpose | Required |
| ------------ | ------- | :------: |
| {Service Name} | {Purpose} | ✓ |

### Estimated Load

| Metric | Value | Notes |
| ------ | ----- | ----- |
| Daily Active Users | {N} users | {Estimation rationale} |
| Peak RPS | {N} req/s | {Peak hours} |
| Data Growth Rate | {N} MB/month | {Storage impact} |

### Cost Constraints

| Item | Value |
| ---- | ----- |
| Monthly Budget | ${N} |
| Optimization Policy | {cost / performance / reliability} |

### Provider Preference

- [ ] AWS
- [ ] GCP
- [x] auto (follow project configuration)

---

## Sources (Optional - Candidate Conversion Only)

> When converted from a market-intelligence-scanner candidate, records original data.

> **Original Candidate Document**: [Filename](relative path)
> **ICE Score**: X.X (I:? / C:? / E:?)
> **Market-Fit**: ?/10

### Key Differentiators

- (Extracted from Differentiation section)

### Evidence Data Summary

- (Key quantitative data from Evidence section)

