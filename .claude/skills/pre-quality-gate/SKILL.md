---
name: pre-quality-gate
model: haiku
effort: low
description: Quality verification skill for target projects. Executes Makefile SSOT q.check and interprets the results. Triggered by requests like "pre-commit check", "prepare PR", "quality check", "quality gate", or during the Reviewing phase.
---

# Pre-Quality Gate

## SSOT

> **This skill does not define rules.**
> All rules are **uniquely** defined in the `Makefile`.

---

## Execution Method

```bash
# Quality check
make q.check

# Auto-fix followed by check
make q.fix
```

---

## Exit Code Interpretation

| Code  | Meaning | Next Action                     |
| :---: | ------- | ------------------------------- |
|  `0`  | PASS    | Proceed with commit / PR        |
| `!=0` | FAIL    | Fix according to output message |

---

## AI Execution Protocol

```markdown
## Step 1: Execute Quality Check

Bash: make q.check

## Step 2: Verify Result

- Exit 0 → PASS → Done
- Exit !=0 → Proceed to Step 3

## Step 3: Attempt Auto-Fix

Bash: make q.fix

## Step 4: Re-verify

- Exit 0 → PASS → Done
- Exit !=0 → Provide manual fix guidance
```

---

## Verification Items

| Severity | Target                 | Description                                                   |
| :------: | ---------------------- | ------------------------------------------------------------- |
| Critical | `q.analyze`            | Static analysis (ESLint)                                      |
| Critical | `q.format.check`       | Code format check                                             |
| Critical | `q.check-architecture` | Feature-First architecture validation                         |
| Critical | `q.secrets`            | Secrets Archaeology                                           |
| Critical | `q.deps-audit`         | Dependency Supply Chain. Wired at **push** (`ci-local-status`), not per-commit — it is the only live-network check here; see `Makefile#q.critical` |
|  Major   | `q.test-exists`        | Test file existence verification                              |

---

## Secrets Archaeology

> **Purpose**: commit-blocking gate — Secret leaks must be caught before push (secrets already pushed require invalidation + rotation).

`make q.secrets` or `project-config.commands.secrets_audit` checks the following (dynamically detected via R-CM-009 Rule 4 if commands SSOT is absent):

| Check Item | Pattern / Command | Blocking Action |
| ---------- | ----------------- | --------------- |
| **API key prefixes (staged + working tree)** | `AKIA[0-9A-Z]{16}` (AWS), `sk-[A-Za-z0-9]{20,}` (OpenAI), `sk-ant-[A-Za-z0-9_-]{20,}` (Anthropic), `ghp_[A-Za-z0-9]{36}` (GitHub PAT), `xox[baprs]-[A-Za-z0-9-]{10,}` (Slack) | exit 1 — Output offending line + file |
| **`.env` tracked** | `git ls-files | grep -E "^\.env(\..+)?$"` (excluding `.env.example`) | exit 1 — Guide `git rm --cached <file>` |
| **CI inline secrets** | Raw token patterns outside `secrets:` block in `.github/workflows/*.{yml,yaml}` | exit 1 — Guide using secrets context |
| **Token exposed in commit message** | Token prefix patterns in the last 10 commit messages | exit 1 — Guide message amendment + token rotation |

**Next Actions upon Detection (User Guidance)**:
1. **revoke**: Invalidate the key immediately in the provider console.
2. **rotate**: Issue a new key + move to `.env.local` or secret manager.
3. **scrub**: Remove from working tree. If already pushed, guide `git filter-repo` or BFG (note: **invalidation takes priority** — history rewrite is a secondary remediation).

---

## Dependency Supply Chain

> **Purpose**: push-blocking gate — Catch dependencies with known vulnerabilities before PR.

`make q.deps-audit` or `project-config.commands.deps_audit` checks the following:

| Check Item | Command (Example) | Blocking Threshold |
| ---------- | ----------------- | ------------------ |
| **npm/pnpm/yarn audit (HIGH+CRITICAL)** | `npm audit --audit-level=high --json` or equivalent | HIGH 1+ → exit 1 |
| **lockfile drift** | `git status --porcelain package-lock.json pnpm-lock.yaml yarn.lock` | unstaged drift → exit 1 |
| **unpinned major versions** (optional) | `^X` or `~X` major prefixes in `package.json` — limited to security-critical patch libraries | warn only (Major) |
| **peer range drift** | `peerDependencies` declarations in lockfile vs actual resolved versions (no install needed — determined purely via lockfile) | warn only (Major) |

**Audit Scope = All npm manifests tracked by git**. The enumeration SSOT is `.claude/scripts/lib/npm-manifests.mjs#discoverNpmManifestDirs` — audits separate npm projects like `infra/aws` / `infra/gcp` alongside root, which a cwd-only audit would miss. Coverage of manifests by `.github/dependabot.yml` npm entries is separately enforced by `tests/unit/dependabot-manifest-coverage.test.mjs`.

**Why "tracked by git" is the criterion**: A filesystem walk would include git-ignored local clones (e.g. `oss/*`) whose vulnerabilities this repository does not own. This repository's supply chain is what this repository owns. Extending exclusion lists by name breaks again when the next clone uses a different name. **Trade-off (honestly stated)**: New manifests prior to `git add` are not caught by the audit/coverage contract — they become targets once committed. **Git query failures abort with an error rather than returning an empty list** (to prevent a gate with unknown scope from reporting clean).

**Peer range drift is a warning and does not block**. The determination SSOT is `.claude/scripts/lib/npm-peer-conformance.mjs#checkPeerConformance`. In the npm ecosystem, peer declarations frequently lag, and blocking them encourages bypass habits, so the gate only provides **visibility**. The repo-wide 0-violation contract is enforced by `tests/unit/npm-peer-conformance.test.mjs`, ensuring tests block incoming violations. Peer conflicts are visible in the lockfile before a bump is applied, so check them there.

**Next Actions upon Detection**:
1. **patch**: Attempt `npm audit fix`. If automated patch fails → manual upgrade.
2. **pin**: Pin vulnerable transitive dependencies via `overrides` (npm 8.3+) / `resolutions` (yarn).
3. **defer**: Register non-HIGH (MEDIUM/LOW) items to backlog (does not commit-block).

---

## QA Cycle Mode

> **Purpose**: Automatically repeat fixes until the quality gate passes

### Rules

| Item                             | Value                       |
| -------------------------------- | --------------------------- |
| Max Iterations                   | **5 iterations**            |
| Identical Error Abort Threshold  | **3 consecutive**           |
| Counter Display                  | `[QA 1/5]`, `[QA 2/5]`, ... |

### Protocol

```markdown
## QA Cycle Execution

iteration = 0
same_error_count = 0
last_error = null

LOOP:
iteration += 1
IF iteration > 5 → ABORT("Reached maximum iteration count (5)")

Bash: make q.check
IF exit == 0 → PASS → Done

current_error = hash of output message
IF current_error == last_error:
same_error_count += 1
IF same_error_count >= 3 → ABORT("Identical error unresolved after 3 consecutive attempts")
ELSE:
same_error_count = 1
last_error = current_error

Output: [QA {iteration}/5] Fixing errors...

Bash: make q.fix
IF exit == 0 → PASS → Done

Analyze error details and attempt manual fix
GOTO LOOP
```

### Abort Output

```markdown
## QA Cycle Aborted

| Item                  | Details                                                    |
| --------------------- | ---------------------------------------------------------- |
| **Iteration Count**   | {iteration}/5                                              |
| **Abort Reason**      | {Max iterations reached / Identical error 3 consecutive}   |
| **Unresolved Error**  | {Error details}                                            |
| **Recommended Action**| {Specific manual fix guidance}                             |
```

---

## Trigger Conditions

- "pre-commit check", "prepare PR", "quality check", "quality gate"
- Reviewing phase in pipelines

---

## Modifying Rules

**Modify `Makefile` only.** Do not modify this file.

---

## Not For / Boundaries

- **Full Security Audit**: OWASP Top 10 / STRIDE / FP filtering / concrete exploit scenarios belong to `final-review` Axis 4 + `.claude/skills/final-review/references/cso-security-protocol.md`.
- **Full Git History Scan**: This gate is commit-blocking *before* push. Full scans requiring history rewrites belong to final-review.
- **License Compliance**: GPL/AGPL blocking policy is a user decision — this gate does not participate.
- **Infrastructure / Operational Security**: Production environment security audits belong to separate skills (following infra-designer).

## Maintenance

- **Sources**: brief2dev internals (`.claude/rules/` R-CM/R-PL rules + `.claude/skills/` skill conventions) + gstack `cso/SKILL.md.tmpl` Phase 2/3. External references in body.
- **Last updated**: 2026-05-09
- **Known limits**: Explicit boundaries of this skill are documented in frontmatter description and the "Not For / Boundaries" section above.
