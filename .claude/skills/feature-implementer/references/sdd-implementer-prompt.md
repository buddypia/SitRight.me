# Implementer Subagent Prompt Template

Template used when dispatching task-specific implementer subagents in `feature-implementer` SDD mode.

**Before dispatching**, the controller extracts the full task text into `.tmp/sdd/task-N-brief.md`
(File Handoffs — `implementation-protocol-details.md` §File Handoffs; pasting raw prompt inline is prohibited).
Exact values (numbers, magic strings, signatures, test cases) must reside strictly in the brief file.

```
Agent tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    Implement Task N: [task name].

    ## Position

    [Where this task fits in the overall plan — one line only]

    ## Task Brief (Requirements — Read First)

    Read `.tmp/sdd/task-N-brief.md` first. This file contains the authoritative requirements,
    and you must use the exact values (numbers, magic strings, signatures, test cases) from it.
    [Do not paste full task text into this prompt — pass the brief file path only]

    ## Context

    - [Interfaces/decisions from earlier tasks unknown to the brief]
    - [Resolutions to ambiguities found in the brief, if any]

    ## Before Starting

    If you have questions about the following, **ask now:**
    - Requirements or acceptance criteria
    - Approach or implementation strategy
    - Dependencies or assumptions
    - Unclear details

    **During work**, if anything unexpected or ambiguous arises, ask immediately.
    Do not guess or assume.

    ## Execution Steps

    1. Implement exactly what is specified in the brief
    2. Write tests (adhere to TDD if task specifies TDD)
    3. Verify that implementation works
    4. Commit work
    5. Self-review (see below)
    6. Report (see report file contract below)

    Working directory: [directory]

    ## When Overwhelmed

    It is always OK to stop and say "This is too complex/unclear for me."
    Submitting bad work is worse than submitting no work.

    **Stop and escalate when:**
    - Architectural decisions with multiple viable approaches are required
    - You must understand code far beyond what was provided
    - You are uncertain whether the approach is correct
    - Existing code must be restructured in ways unanticipated by the plan

    **How to escalate:** Report status as BLOCKED or NEEDS_CONTEXT.

    ## Pre-Report Self-Review

    **Completeness:** Did you implement everything in the spec? Any missed requirements or unhandled edge cases?
    **Quality:** Are names clear and accurate? Is the code clean and maintainable?
    **Discipline:** Did you adhere to YAGNI? Did you build only what was asked? Did you follow codebase patterns?
    **Testing:** Do tests verify actual behavior (rather than mock mechanics)? Was TDD followed?

    If self-review identifies issues, fix them now before reporting.

    ## Reporting Format (Report File + Summary Return)

    Write the complete report to `.tmp/sdd/task-N-report.md` (matching the brief filename convention):

    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - What was implemented (or attempted)
    - What was tested and test results
    - Modified files
    - Self-review findings
    - Issues or concerns

    Return only **Status · Commit · One-line test summary · Concerns** to the controller —
    do not return the full report inline (File Handoffs).

    DONE_WITH_CONCERNS: Task is complete, but you have doubts about correctness.
    BLOCKED: Cannot complete the task.
    NEEDS_CONTEXT: Missing necessary information not provided.
    Never silently submit work you are unsure of.
```
