---
name: verification-loop
description: |
  A 6-Phase verification loop automatically triggered for large-scale changes or high quality-risk scenarios.
  Comprehensively validates quality across Build → TypeCheck → Lint → Test → Security → Diff.

  Executes after feature-pilot's quality_gate and before dod_verification.
  Automatically resolves platform-specific commands from project-config.json.
---

# Verification Loop (6-Phase Quality Verification)

> **Core Concept**: A comprehensive quality verification loop automatically activated in proportion to change size and risk.
> Executes after passing `quality_gate` (Makefile SSOT) and before `dod_verification`.

---

## Trigger Conditions

The verification loop automatically activates when any of the following conditions are met:

| Condition | Description |
|-----------|-------------|
| `changed_files >= 6` | 6 or more files modified |
| `hook_changed` | Changes to `.claude/hooks/*.mjs` files |
| `schema_changed` | Changes to `data/schemas/**/*.json` files |
| `api_route_changed` | Changes to API routes or endpoint files |
| `shared_changed` | Changes to `src/shared/` or `lib/shared/` |

---

## 6-Phase Verification Pipeline

```
Phase 1: Build        → Verify zero compilation / build errors
Phase 2: TypeCheck    → Verify zero type safety errors
Phase 3: Lint         → Pass static analysis and code style rules
Phase 4: Test         → Pass entire test suite
Phase 5: Security     → Scan for vulnerabilities and secret leakage
Phase 6: Diff         → Summarize scope + detect unintended modifications
```

### Claim-Evidence Discipline (gstack Native Merge, MANDATORY)

Before stating completion claims like "Passed", "Fixed", or "Pre-existing", map them to fresh empirical evidence.

| Claim | Required Evidence |
|---|---|
| Build Passed | Actual build command execution, exit code 0, fresh timestamp |
| Tests Passed | Actual test command, pass/fail counts, rerun verification |
| No Security Warnings | Executed audit / secret scan command and summarized output |
| Pre-existing Failure | Identical command failure prior to branch changes or git blame/log proof |
| Scope Safe | Phase 6 diff summary showing zero out-of-scope modifications |

Include `claim_evidence[]` in the output JSON. If evidence is lacking, downgrade the claim: report "Unverified / Execution failed / Presumed existing failure" instead of claiming verification.

### Execution Modes

| Mode | Description | Behavior on Failure |
|------|-------------|---------------------|
| **strict** (Default) | Every phase must pass. Subsequent phases are **blocked** on failure | Immediate halt + Debug guidance + Max 2 retries |
| **lenient** | Legacy mode. Logs phase failures and continues | Log failure and proceed to next phase |

Switch modes via `--strict` (default) or `--lenient`.

### Phase Details

#### Phase 1: Build (blocking: always true in strict)
- Purpose: Early detection of compilation and bundling errors before runtime.
- On failure (strict): Immediate halt; Phases 2–6 blocked; provides debug guidance.
- On failure (lenient): Immediate halt; skips Phases 2–6.

#### Phase 2: TypeCheck
- Purpose: Verify type safety (TypeScript / Dart).
- On failure (strict): Immediate halt; Phases 3–6 blocked; provides type debug guidance.
- On failure (lenient): Logs failure and proceeds to Phase 3.

#### Phase 3: Lint
- Purpose: Enforce code quality and formatting conventions.
- On failure (strict): Immediate halt; attempts auto-fix (`--fix` flag); 1 retry.
- On failure (lenient): Logs failure and proceeds to Phase 4.

#### Phase 4: Test (blocking: always true in strict)
- Purpose: Prevent regressions across unit and integration test suites.
- **On test failure**: Read `references/test-failure-triage-template.md` and perform Ownership Triage:
  - **in-branch** (caused by current changes): BLOCK — remediation required.
  - **pre-existing** (legacy failure): WARN — log warning and proceed to next phase.
  - Classification rule: Was the tested code or test file modified in this session? If ambiguous, classify as in-branch (conservative default).
- On failure (strict): Following triage, halts immediately if in-branch failures exist. If only pre-existing failures remain, logs warnings and proceeds.
- On failure (lenient): Immediate halt; skips Phases 5–6.

#### Phase 5: Security
- Purpose: Scan for dependency vulnerabilities and secret leaks.
- On failure (strict): CRITICAL → Immediate halt; HIGH → Log warning and proceed.
- On failure (lenient): Logs failure and proceeds to Phase 6 (CRITICAL still halts).

#### Phase 6: Diff + Cleanup
- Purpose: Summarize changed files, catch out-of-scope edits, and **audit residual console.logs**.
- Always executes regardless of earlier PASS/FAIL status.
- **Residual code audit**: Warns on lingering `console.log`, `debugger`, or `TODO(temp)`.

### Strict Mode Debug Protocol

> **Principle**: When a phase fails, do not simply report failure. The AI must diagnose the error and provide concrete remediation steps.

Execute this 4-step debug protocol upon phase failure:

1. **Error Diagnosis**: Analyze error messages and stack traces to isolate the root cause.
2. **Remediation Proposal**: Provide exact `file:line` references + fix code (with confidence score).
3. **Blast Radius Check**: Scan whether the identical pattern exists across other files.
4. **Retry Execution**: Apply fix upon user approval → re-run the failed phase (max 2 retries).

```
Phase N Failure
  → [1] Error Diagnosis (AI analyzes failure trace)
  → [2] Remediation Proposal (file:line + replacement code + confidence)
  → [3] Blast Radius Check (Grep for identical patterns)
  → [4] Request User Approval
    → Approved: Apply fix → Re-run Phase N (retry_count++)
    → Rejected: Full halt + Trigger compensation (revert to implement)
```

### Checkpoint Schema

In strict mode, phase results are structured per `verification-checkpoint.schema.json`.
Schema path: `data/schemas/ci/verification-checkpoint.schema.json`

Included `debug_log` fields:
- `failure_analysis`: AI diagnostic interpretation.
- `suggested_fixes`: Remediation list (description + command + confidence).
- `similar_elsewhere`: Blast radius scan results.
- `console_log_cleanup_needed`: Flag indicating required cleanup.

---

## Platform Command Mapping

Commands are dynamically resolved from the `commands` section in `project-config.json`.

| Phase | Next.js | Flutter | Tauri |
|-------|---------|---------|-------|
| Build | `npm run build` | `flutter build apk --debug` | `npm run tauri build` |
| TypeCheck | `npx tsc --noEmit` | `dart analyze` | `npx tsc --noEmit` |
| Lint | `npm run lint` | `flutter analyze` | `npm run lint` |
| Test | `npm test` | `flutter test` | `npm test` |
| Security | `npm audit --audit-level=high` | `flutter pub audit` | `npm audit --audit-level=high` |
| Diff | `git diff --stat HEAD` | `git diff --stat HEAD` | `git diff --stat HEAD` |

Commands explicitly defined in `project-config.json` override platform defaults.

---

## Execution Protocol

### Step 0: Resolve Paths, Commands, and Reset Previous Stamps

```
1. Run `rm -f .tmp/quality-gate-passed` (Invalidates prior pass records)
2. Read project-config.json
3. platform = project_config.platform
4. commands = project_config.commands (Falls back to platform defaults if missing)
5. Finalize 6-Phase commands
```

### Step 1: Sequential Phase 1–6 Execution

For each Phase:
1. Execute command.
2. Inspect exit code.
3. Record results (`status`, `duration_ms`, `error_count`, `output_summary`).
4. Check halt conditions.

### Step 2: Aggregate Results

```json
{
  "timestamp": "<ISO 8601>",
  "trigger": "<Activation condition>",
  "phases": [
    { "name": "build", "status": "pass|fail|skip|error", "command": "...", "duration_ms": 0, "error_count": 0 },
    { "name": "typecheck", "status": "...", "command": "...", "duration_ms": 0, "error_count": 0 },
    { "name": "lint", "status": "...", "command": "...", "duration_ms": 0, "error_count": 0 },
    { "name": "test", "status": "...", "command": "...", "duration_ms": 0, "error_count": 0 },
    { "name": "security", "status": "...", "command": "...", "duration_ms": 0, "error_count": 0 },
    { "name": "diff", "status": "...", "command": "...", "duration_ms": 0, "output_summary": "..." }
  ],
  "summary": {
    "total_phases": 6,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "overall_status": "pass|fail"
  },
  "claim_evidence": [
    { "claim": "tests passed", "evidence": "npm test exit 0, 142 passed", "status": "verified" }
  ]
}
```

Schema: `data/schemas/ci/verification-phases.schema.json`

### Step 3: Report Results

- **Overall PASS**: Report "6-Phase Verification Complete — All stages passed". To maintain CI/CD compatibility and unlock PR approval, run `mkdir -p .tmp && touch .tmp/quality-gate-passed` to refresh the quality stamp. Proceed to `dod_verification`.
- **Partial Failure**: Display failed phases and error logs; request remediation.
- **Overall FAIL**: Trigger compensation flow back to `feature-pilot`'s `implement` stage.

---

## Integration with `feature-pilot`

```
feature-pilot Pipeline (M/L/XL Tiers):
  ...
  quality_gate        → pre-quality-gate skill (Makefile q.check)
  verification_loop   → This skill (6-Phase Comprehensive Verification)  ← HERE
  dod_verification    → Final DoD contract verification
  ...
```

> **feature-pilot Protocol**: `verification-loop` runs in `--strict` mode by default.
> In strict mode, phase failures block downstream phases and trigger the automated debug protocol.
> `feature-pilot`'s compensation handler routes strict failures back to the `implement` stage.
> `--lenient` mode is reserved for explicit overrides (e.g., critical hotfixes).

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--strict` | Phase failure blocks downstream phases + triggers debug protocol | **Default (true)** |
| `--lenient` | Legacy mode: logs failures and continues execution | false |
| `--retry <N>` | Maximum retry count per phase | 2 |
| `--no-cleanup-check` | Skips residual console.log inspection | false |

### Compensation Action

```yaml
compensation:
  action: 'Remediate verification failures and rerun'
  revert_to: implement
```

---

## Output Example

```
=== Verification Loop (6-Phase) ===

[1/6] Build        .... PASS (12.3s)
[2/6] TypeCheck    .... PASS (4.1s)
[3/6] Lint         .... PASS (2.8s)
[4/6] Test         .... PASS (18.6s, 142 tests)
[5/6] Security     .... WARN (2 low-severity advisories)
[6/6] Diff         .... PASS (8 files changed)

Summary: 5 passed, 0 failed, 1 warned
Overall: PASS — Proceeding to DoD verification
```

---

## References

| Document | Phase | Purpose |
|----------|-------|---------|
| `references/test-failure-triage-template.md` | Phase 4 | Test failure Ownership Triage (in-branch vs. pre-existing) |
| `references/superpowers-claim-evidence-protocol.md` | Reporting | Mapping completion claims to fresh empirical evidence |
| `data/schemas/ci/verification-checkpoint.schema.json` | All | Strict mode per-phase checkpoint structure |
| `data/schemas/ci/verification-phases.schema.json` | All | 6-Phase aggregated summary structure |

## Not For / Boundaries

> Explicit exclusions for this skill (R-CM-018 Rule 4 — Preventing Missing Boundaries). The frontmatter description and body trigger clauses serve as the Single Source of Truth.

- Areas outside the triggers specified in the frontmatter description are out of scope for this skill.
- Refer to the body and `MANIFEST.json` for related skills, call chains, and dependencies.
- Enforces the post-generation same-turn verification loop pattern (R-CM-017 D-5 alignment).
- Individual command definitions belong to `pre-quality-gate` / stage hooks — this skill executes the orchestration loop.
- Post-hoc evidence aggregation belongs to R-CM-010 Verification Bundle format — this skill focuses on generation-verification adjacency.

## Maintenance

- **Sources**: brief2dev internal (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` skill conventions). See body for external references.
- **Last updated**: 2026-04-19
- **Known limits**: Explicit boundaries are defined in the frontmatter description (`|...`) and the body text.
