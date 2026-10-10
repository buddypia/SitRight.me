# Feedback Loop Catalog (10 Techniques for Constructing Feedback Loops)

> **Source**: `oss/mattpocock-skills/skills/engineering/diagnosing-bugs/SKILL.md` Phase 1 ("Build a feedback loop") + Phase 2 ("Reproduce + minimise").
> **Context**: This document serves as an in-depth reference catalog expanding **Phase 0 (Feedback Loop First)** in `systematic-debugging`.

## Relationship to Phase 0

`SKILL.md` Phase 0 outlines 4 high-level options (failing test / reproduction script / logging command / manual reproduction). This catalog **refines those into 10 distinct techniques**, organized by priority order, and introduces the discipline of "loop tightening" alongside strategies for non-deterministic bugs.

## Core Principle: The Loop IS the Skill

**Staring at broken code does not reveal root causes.** Once you have a **tight pass/fail signal** that turns reliably red on the bug, root-cause isolation, bisection, and telemetry analysis become mechanical operations driven by that signal. Without a signal, code inspection is largely guesswork. Allocate significant, creative energy to establishing this signal in Phase 0.

## 10-Technique Catalog (Priority Order)

Attempt techniques in the sequence below. Earlier techniques offer higher diagnostic reliability and reuse value.

| # | Technique | Best Fit Scenario |
|---|-----------|-------------------|
| 1 | **Failing Automated Test** | Any reachable architectural seam — unit / integration / E2E |
| 2 | **curl / HTTP Script** | Running development server endpoints |
| 3 | **CLI Invocation + Fixture Diff** | Passing fixture inputs and asserting stdout against known-good golden snapshots |
| 4 | **Headless Browser Script** (Playwright/Puppeteer) | UI execution asserting DOM states, console errors, or network payloads |
| 5 | **Captured Trace Replay** | Replaying serialized network payloads, event logs, or DB dumps through isolated code paths |
| 6 | **Throwaway Test Harness** | Bootstrapping a minimal subset of the system (single service + mock dependencies) to execute the buggy path via a single function call |
| 7 | **Property / Fuzzing Loop** | Heisenbugs / intermittent corruption — executing 1,000 randomized inputs to observe failure boundaries |
| 8 | **Bisection Harness** | Regressions emerging between two known states — automating "boot at state X, verify, repeat" to enable automated `git bisect run` |
| 9 | **Differential Testing Loop** | Feeding identical inputs into old vs. new versions (or contrasting configurations) to diff outputs |
| 10 | **Human-in-the-Loop (HITL) Script** (Last Resort) | Complex manual workflows — wrapping human actions in structured scripts (`.claude/skills/bug-fix/references/hitl-loop.template.sh`) to preserve loop cadence |

Constructing the proper feedback loop resolves 90% of the debugging difficulty.

## Loop-Tightening Discipline

Treat your diagnostic feedback loop as a **product**. Once established, tighten it across 3 axes:

1. **Can it be made faster?** — Cache setup steps, bypass irrelevant initializations, isolate minimal test suites.
2. **Can the signal be made sharper?** — Assert specific defect symptoms rather than generic "did not crash" flags.
3. **Can it be made more deterministic?** — Freeze timestamps, pin RNG seeds, isolate ephemeral filesystems, mock network latency.

A 30-second flaky test is almost as useless as no test. A 2-second deterministic loop is an unmatched debugging superpower.

## Non-Deterministic Bug Strategies

The objective is not an immediate clean reproduction, but **elevating reproduction probability**:

- Loop the trigger 100 consecutive times.
- Parallelize concurrent workers.
- Inject system stress (CPU/Memory load).
- Narrow async timing windows.
- Inject micro-sleeps to reliably trigger race conditions.

A bug with a 50% flake rate is diagnosable; a 1% flake rate is intractable. Elevate the reproduction rate until it can be systematically isolated.

## When a Loop Cannot Be Established

Stop and state the blockage explicitly. Document attempted methods and request:

1. Access to a reproducible environment.
2. Forensic artifacts (HAR traces, log dumps, core dumps, timestamped screen recordings).
3. Authorization to deploy temporary diagnostic telemetry to staging/production.

Never proceed to hypothesis formulation without a verifiable reproduction signal.

## Definition of Done: A Tight, Red-Capable Loop

Phase 0 is complete only when you have **executed at least once** a single command (script path, test runner, or curl command) meeting all 4 criteria:

- [ ] **Red-Capable** — Exercises the real defect path and asserts the **exact symptom reported by the user**.
- [ ] **Deterministic** — Yields identical outcomes across consecutive runs.
- [ ] **Fast** — Executes in seconds, not minutes.
- [ ] **Agent-Runnable** — Executes autonomously without human intervention (except via structured HITL scripts).

If you find yourself theorizing about code before this command exists — **STOP.** Jumping directly to speculation is the exact failure mode this protocol is designed to eliminate.
