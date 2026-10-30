# Arena: Competing Attempts at One Artifact

Use when one attempt at a non-trivial artifact would lock in the wrong shape: a positioning statement, a landing page headline, an offer, an outreach message, an interview script, a pricing page, a module's API. Several runners get the same brief, a rubric fixed in advance picks a base, and the best parts of the others are folded in.

This is the opposite of the rest of this skill. Plain dispatch splits *different* problems across agents. Arena gives every agent the *same* problem so their differences show what one attempt would have missed.

Open a todo list with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

## Phase A: Frame

Every runner gets the same prompt, so the prompt is the contract.

1. State the artifact each runner produces.
2. Write the rubric: 3–6 concrete criteria a reader can grade for *this* artifact (for a headline: names the customer, names the job, states a checkable outcome, fits in 10 words). The rubric is the picker's tool. Runners see only the task.
3. Pick the runners: three by default. Use your CLI's subagent tool. When a second model family is available (another vendor's CLI), give it at least one seat; different models miss different things. Use the same model several times only when the work is generation-bound, not judgment-bound.
4. Give each runner its own output location: a git worktree for code, otherwise its own scratch directory or file. Runners never write to a shared file.

## Phase B: Fan out

Launch all runners in one message, each with the task, the shared grounding (the customer's own words, the evidence, the constraints), its output path, and an instruction to return the artifact plus a short rationale naming the alternatives it considered and rejected. If a runner produces nothing, continue with the rest and note the dropout.

## Phase C: Cross-judge

After every runner has finished, start one read-only judge from a different model family than yours when one is available. The judge sees the rubric and the candidates by label, not by which model wrote them, scores each criterion, and recommends a base with its reasons. If no other family is available, skip the judge and say so.

## Phase D: Pick a base

Read every candidate end to end. Score each criterion by criterion, not on overall feel, and compare with the judge. Agreement confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous; read both rationales before deciding. When two tie, take the simpler one.

## Phase E: Graft

Walk each losing candidate once more for what is worth taking, usually one or two things each, not most of it. Fold each graft in by hand so the result reads as one piece. Never paste mechanically.

If the candidates converge on one shape, that is strong agreement: note it and keep the consensus. If they diverge wildly, the brief was under-specified: reframe and run again rather than averaging.

## Phase F: Verify

Check the result like any other output (`verification-before-completion`). For anything a customer will see, the arena's pick is still an estimate, not evidence: an AI judged it, no customer did. Put the top one or two in front of real customers before calling a winner: fix the pass mark before any data comes in, then let a smoke test or reply rate settle it.

## Output

One artifact, plus a short note: the base and why, the judge's verdict or that it was skipped, each graft and the candidate it came from, what was rejected and why, any convergence or dropout, and the verification result.

## Maintenance

- **Sources**: pstack `skills/arena/SKILL.md` v0.15.36 (MIT, Copyright (c) 2026 Lauren Tan; cursor/plugins@4dd1d05, https://github.com/cursor/plugins/tree/main/pstack). Phases A–F kept; Cursor model slugs and the `pstack-models` rule replaced by "your CLI's subagent tool, another vendor when available"; business artifacts and the estimate caveat in Phase F added.
- **Last updated**: 2026-10-30
- **Known limits**: prompt-level; runner diversity depends on which CLIs are installed. The rubric is only as good as the evidence behind it.

## License

This file adapts material from pstack and is distributed under its license:

```text
MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
