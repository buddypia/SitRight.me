# Task Reviewer Prompt Template (Unified Spec + Quality)

> Aligned with: Superpowers v6.1.1, 2026-07-17
> **Replacement History**: This file unifies and replaces `sdd-spec-reviewer-prompt.md` + `sdd-quality-reviewer-prompt.md` (legacy 2-Stage separated model — deleted upon introducing this unified prompt; see git history). The reviewer reads the diff once and returns both the Spec Compliance verdict and Code Quality verdict together.

Used when dispatching task reviewer subagents in `feature-implementer` SDD mode. The reviewer reads the task diff once and returns two verdicts: Spec Compliance and Code Quality.

**Purpose:** Verify that a single task's implementation conforms to requirements (no more, no less) and is well-engineered (clean, tested, maintainable). This serves as a task-scope gate — broad review across the entire branch is conducted separately after all tasks are completed (`final-review`).

```
Agent tool (general-purpose):
  description: "Review Task N (spec + quality)"
  model: [MODEL — REQUIRED: Select per implementation-protocol-details.md "Model Selection"
         criteria. If omitted, the session's most expensive default model is inherited]
  prompt: |
    Review the implementation of this single task: first verify conformance to
    requirements, then verify engineering quality. This is a task-scope gate,
    not a merge review — a separate branch-wide comprehensive review will occur
    after all tasks complete.

    ## Requested Work

    Read the task brief: [BRIEF_FILE]

    Global Constraints from spec/design binding this task:
    [GLOBAL_CONSTRAINTS]

    ## What the Implementer Claims to Have Built

    Read the implementer's report: [REPORT_FILE]

    ## Diff to Review

    **Base:** [BASE_SHA]
    **Head:** [HEAD_SHA]
    **Diff File:** [DIFF_FILE]

    Read the diff file once — it contains the commit list, stat summary, and
    full contextual diff, representing the entirety of changes to evaluate.
    Context lines in the diff represent the modified files: do not separately
    read modified files unless a hunk under evaluation is cut off mid-function —
    if so, note that in your report. Do not re-run git commands. If the diff
    file is absent, retrieve the diff directly: `git diff --stat [BASE_SHA]..[HEAD_SHA]`
    and `git diff [BASE_SHA]..[HEAD_SHA]`. Do not scan the broader codebase.
    Inspecting code outside the diff is permitted only when evaluating a named,
    concrete risk — perform a single targeted check per named risk, and document
    both the risk and what was checked in the report. If the diff alters lock
    ordering, function/API contracts, or shared mutable state, checking call
    sites constitutes a legitimate named risk.

    This review is strictly read-only against this checkout. Do not modify the
    working tree, index, HEAD, or branch state in any manner.

    ## Distrust the Report

    Treat the implementer's report as unverified claims about the code. It may
    be incomplete, inaccurate, or optimistic. Verify claims against the diff.
    Design rationales inside the report are also claims: justifications such as
    "Left as-is for YAGNI" or "Kept deliberately simple" represent the
    implementer grading their own work. Judge the code on its intrinsic merits —
    stated rationales do not lower the severity of a finding.

    ## Testing

    The implementer already ran tests against this code and reported results
    with TDD evidence. Do not re-run the entire test suite to verify that report.
    Run only a single targeted test if reading the code raises a specific doubt
    that prior executions cannot answer. Do not run package-wide test suites,
    race detectors, or repeated loops. If heavy verification is needed, include
    it as a recommendation in the report instead of running it directly. If
    commands cannot be run in this environment, name the tests to be executed.

    Warnings or other noise in the implementer's reported test output constitute
    a finding — test output must be clean.

    ## Part 1: Spec Compliance

    Compare the diff against "Requested Work":

    - **Omissions:** Requirements skipped, missed, or claimed complete without implementation
    - **Extraneous Additions:** Unrequested features, overengineering, or unnecessary "nice-to-haves"
    - **Misunderstandings:** Built the right feature incorrectly, or solved the wrong problem

    If requirements cannot be verified from this diff alone (e.g. residing in
    unmodified code or spanning across tasks), report them under ⚠️ items rather
    than broadening search scope.

    ## Part 2: Code Quality

    **Code Quality:**
    - Are concerns cleanly separated?
    - Is error handling robust and appropriate?
    - Is the code DRY without gratuitous abstractions?
    - Are edge cases handled?

    **Testing:**
    - Do new/modified tests verify actual behavior rather than mock mechanics?
    - Are task edge cases covered?

    **Structure:**
    - Does each file have a single clear responsibility and well-defined interface?
    - Are units decomposed to be independently understandable and testable?
    - Does it follow the planned file structure?
    - Did this change introduce large new files or significantly inflate existing files?
      (Focus on this change's contribution rather than preexisting file size)

    The report must provide file:line evidence for all findings and for checks
    answering "yes". A concise report citing specific lines gives the controller
    everything needed.

    The final message itself is the report: start directly with the spec
    compliance verdict. Every line must be a verdict, a finding with file:line,
    or an executed check — no pleasantries, process narration, or concluding summaries.

    ## Calibration

    Categorize issues by real severity. Not everything is Critical.
    Important means the task cannot be trusted until resolved: incorrect or
    fragile behavior, missed requirements, or maintainability damage severe
    enough to block merge — verbatim duplication of logic blocks, swallowed
    errors, or tests that assert nothing. Polish suggestions like "coverage
    could be broader" are Minor.
    If the plan or brief explicitly mandates what this rubric considers a defect
    (e.g., tests that assert nothing, verbatim logic duplication), that is still
    a finding — report it as Important with the label plan-mandated. Authorship
    of the plan does not grade its own work — humans decide.
    Acknowledge strengths before listing issues — precise praise helps the
    implementer trust the remainder of the feedback.

    ## Output Format

    ### Spec Compliance

    - ✅ Spec Conforming | ❌ Issues Found: [What is missing/added/misunderstood,
      with file:line references]
    - ⚠️ Unverifiable in Diff: [Requirements unverifiable from diff alone and
      what the controller must check — report alongside ✅/❌ verdicts for all
      verifiable items]

    ### Strengths
    [What was done well? Be specific.]

    ### Issues

    #### Critical (Must Fix)
    #### Important (Should Fix)
    #### Minor (Nice to Have)

    Each issue: file:line, what is wrong, why it matters, and remediation
    (if non-obvious).

    ### Assessment

    **Task quality:** [Approved | Needs fixes]

    **Reasoning:** [1-2 sentence technical assessment]
```

**Placeholders:**
- `[MODEL]` — REQUIRED: Reviewer model selected per `implementation-protocol-details.md` "Model Selection" criteria
- `[BRIEF_FILE]` — REQUIRED: Task brief file (`.tmp/sdd/task-N-brief.md` — exact same file the implementer worked against)
- `[GLOBAL_CONSTRAINTS]` — Binding requirements copied verbatim from the Global Constraints section of `PLAN.md` or spec (exact values, formats, explicit inter-component contracts — not process rules, which are already in this template)
- `[REPORT_FILE]` — REQUIRED: File where the implementer wrote their detailed report
- `[BASE_SHA]` — Commit prior to this task
- `[HEAD_SHA]` — Current task commit
- `[DIFF_FILE]` — REQUIRED: Path where controller recorded the review package (`.tmp/sdd/review-<base7>..<head7>.diff` — packages never enter the controller's context directly)

**Reviewer Returns:** Spec Compliance verdict (✅/❌/⚠️), Strengths, Issues (Critical/Important/Minor), Task Quality verdict

A single fix dispatch can address spec gaps and quality findings together; re-review post-fix re-evaluates both verdicts.

---

## Maintenance

- **Sources**:
  - Original: `oss/superpowers/skills/subagent-driven-development/task-reviewer-prompt.md` + `SKILL.md` (superpowers v6.1.1)
  - Replaced: Legacy 2-Stage separated spec/quality reviewer prompts (deleted upon introducing this unified prompt; see git history)
- **Synchronization Baseline**: Superpowers v6.1.1, 2026-07-17
- **Adaptation type**: `adapted` (English prose + brief2dev file path convention `.tmp/sdd/` + feature-implementer SDD mode process integration)
- **Known limits**: `data/schemas/sdd-phase-transition.schema.json` still enforces the legacy 2-Stage model (spec_compliance PASS premise) — schema realignment following this unified reviewer is tracked as follow-up work.
