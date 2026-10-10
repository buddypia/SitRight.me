#!/usr/bin/env node
/**
 * task-interpretation.mjs — Intent Echo-Back recording CLI (P1, 2026-07-10)
 *
 * Structurally records the 'interpretation' of natural language instructions into Task Passport.
 * Since misunderstandings arise from interpretation rather than instruction text itself,
 * AI records interpretation contract with this CLI upon embarking on substantive tasks
 * and displays identical content at the top of responses (allowing user correction before code changes).
 *
 *   record --goal "<restated goal>" --verification "<verification method>"
 *          [--scope "<target1,target2>"] [--non-goals "<x;y>"] [--assumptions "<assumption1;assumption2>"]
 *          [--acceptance '<json array>'] [--json]
 *          (if value starts with '--', use = separator format like --goal="--value")
 *   show   [--json]
 *   check  [--root <dir>] [--json]   re-runs the acceptance[] the ship gate would run for the
 *                                    `.worktrees/<branch>` checkout containing the root (default
 *                                    root = cwd); anywhere else it evaluates nothing, as the gate
 *                                    evaluates nowhere else. Contracts are read from the repo root.
 *
 * Interpretation is bound to passport objective sha256 — demoted to STALE if instruction changes.
 * `acceptance[]` is the executable definition of done (task-acceptance.mjs kinds file_exists|grep|command);
 * the ship gate (mark-pre-ship-confirmed.mjs#checkAcceptance) re-runs it before the marker is created.
 * Exit: 0 = ok, 1 = acceptance failed (check), 2 = usage, 3 = nothing to evaluate — root outside a
 *       worktree or no acceptance for its branch (check), 4 = missing passport (prior to task prompt;
 *       check: neither a session passport nor a contract recorded for the branch).
 *
 * @see .claude/scripts/lib/task-passport.mjs (recordTaskInterpretation)
 * @see .claude/rules/common/glossary-anchored-language.md (R-CM-038 Rule 6)
 * @see docs/11_ai_task_context_operating_contract.md (L1.5 Task Passport)
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  readCurrentTaskPassport,
  recordTaskInterpretation,
  resolveAcceptanceContract,
} from './lib/task-passport.mjs';
import { evaluateAcceptance, formatAcceptanceReport } from './lib/task-acceptance.mjs';
import { resolveProjectDir } from '../../.cli/lib/utils.mjs';
import { resolveWorktreeRoot } from '../../.cli/lib/worktree-path.mjs';
import { inferBranchFromWorktreePath } from '../../.cli/lib/worktree-plan-path.mjs';

const USAGE = `Usage:
  node .claude/scripts/task-interpretation.mjs record --goal "<restated goal>" --verification "<verification method>" \\
      [--scope "<a,b>"] [--non-goals "<x;y>"] [--assumptions "<x;y>"] [--acceptance '<json>'] [--branch <branch>] [--json]
  node .claude/scripts/task-interpretation.mjs show [--json]
  node .claude/scripts/task-interpretation.mjs check [--root <worktree-dir>] [--json]

record records AI interpretation contract into current Task Passport (active objective) with sha binding.
If instruction changes (objective sha changes), previous interpretation is demoted to STALE.
--acceptance is the executable definition of done, e.g.
  '[{"kind":"file_exists","target":"src/x.mjs"},{"kind":"grep","target":"README.md","pattern":"^## X"},
    {"kind":"command","target":"npx vitest run tests/unit/x.test.mjs"}]'   (expect:"fail" inverts)
--branch binds the contract to a git branch (durable, session-independent copy) so the ship-time
  gate evaluates the contract for the branch being shipped rather than the caller's session. Defaults
  to the branch inferred from cwd (worktree path, else git rev-parse --abbrev-ref HEAD); pass
  explicitly when cwd does not reflect the target branch.
check re-runs now the acceptance[] the ship gate (mark-pre-ship-confirmed) re-runs before marking: the
  contract of the branch of the .worktrees/<branch> checkout containing --root (default cwd), resolved
  the way the gate resolves it. Outside such a checkout it evaluates nothing (exit 3, reason
  no_worktree), as the gate evaluates nowhere else. STALE (JSON fresh:false) applies only to a contract
  taken from the session passport; a branch contract shows its recorded_at, and fresh is null.`;

function parseArgs(argv) {
  const positional = [];
  const options = {};
  const flags = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    // `--key=value` format: safe even if value starts with '--' (code-review A2 —
    // space separation loses values when value starts with hyphen like `--goal "--dry-run support"`).
    const eq = arg.indexOf('=');
    if (eq > 2) {
      options[arg.slice(2, eq).toLowerCase()] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2).toLowerCase();
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
    } else {
      flags.add(key);
    }
  }
  return { command: positional[0] || null, options, flags };
}

function splitList(value, separators = /[,;]/) {
  return String(value || '')
    .split(separators)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolves the branch a recorded interpretation should be bound to (DEFECT 1 root-cause fix —
 * binds the contract to the work unit, not the caller's session). Precedence: explicit --branch >
 * worktree-path inference (fast, no subprocess) > `git rev-parse` fallback (covers non-worktree
 * checkouts of a feature branch). Returns null (no branch contract recorded) when cwd is the main
 * repo root on a detached/unknown HEAD — recordTaskInterpretation degrades to session-only storage.
 */
function resolveBranchForRecord(explicitBranch) {
  const explicit = explicitBranch ? String(explicitBranch).trim() : '';
  if (explicit) return explicit;
  // inferBranchFromWorktreePath expects an actual `.worktrees/<branch>` path, not an arbitrary cwd —
  // gate it behind resolveWorktreeRoot so a main-root cwd (no `.worktrees` segment) never falls
  // through to misreading its last path segments as a branch name.
  const worktreeRoot = resolveWorktreeRoot(process.cwd());
  if (worktreeRoot) {
    const fromWorktree = inferBranchFromWorktreePath(worktreeRoot);
    if (fromWorktree) return fromWorktree;
  }
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    }).trim();
    return branch && branch !== 'HEAD' ? branch : null;
  } catch {
    return null;
  }
}

function cmdRecord(projectDir, options, flags) {
  if (!options.goal || !options.verification) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let updated;
  try {
    updated = recordTaskInterpretation(projectDir, {
      goal: options.goal,
      verification: options.verification,
      scope: splitList(options.scope),
      nonGoals: splitList(options['non-goals'], /;/),
      assumptions: splitList(options.assumptions, /;/),
      acceptance: options.acceptance,
      branch: resolveBranchForRecord(options.branch),
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    // Error code-based branch — message string concatenation is vulnerable to phrasing refactoring (code-review D6).
    return error.code === 'NO_PASSPORT' ? 4 : 2;
  }
  if (flags.has('json')) {
    process.stdout.write(`${JSON.stringify(updated.ai_interpretation, null, 2)}\n`);
  } else {
    const interp = updated.ai_interpretation;
    process.stdout.write(
      `ai_interpretation recorded (sha ${interp.objective_sha256.slice(0, 12)}…)\n${formatInterpretation(interp)}`,
    );
  }
  return 0;
}

function formatInterpretation(interp) {
  return (
    `  goal: ${interp.goal}\n`
    + `  scope: ${interp.scope?.join(', ') || 'none'}\n`
    + `  non_goals: ${interp.non_goals?.join(' | ') || 'none'}\n`
    + `  assumptions: ${interp.assumptions?.join(' | ') || 'none'}\n`
    + `  verification: ${interp.verification}\n`
    + `  acceptance: ${interp.acceptance?.length || 0} criteria\n`
  );
}

/**
 * The `.worktrees/<branch>` checkout `check` evaluates, and its branch. The gate evaluates nowhere
 * else (`mark-pre-ship-confirmed.mjs#resolveWorktreeDir`), so no other root resolves to a branch: at
 * the trunk root the branch is `main`, whose contract file every session recording from cwd=main
 * overwrites, so evaluating it ran another session's criteria (adversarial review, 2026-10-04). A
 * path inside a worktree is lifted to the worktree root, where the gate evaluates.
 */
function resolveCheckedOutWorktree(projectDir, rootOption) {
  const given = rootOption ? resolve(projectDir, rootOption) : process.cwd();
  const root = resolveWorktreeRoot(given);
  const branch = root && existsSync(root) ? inferBranchFromWorktreePath(root) : null;
  return { given, root, branch };
}

/** Reports why `check` evaluated nothing (exit 3); JSON keeps one shape for every reason. */
function reportNotEvaluated(asJson, reason, branch, message) {
  process.stdout.write(
    asJson ? `${JSON.stringify({ ok: null, reason, branch, fresh: null }, null, 2)}\n` : `${message}\n`,
  );
  return 3;
}

function reportEvaluated(asJson, report, { branch, source, recordedAt, fresh, root }) {
  if (asJson) {
    const json = { ...report, branch, source, recorded_at: recordedAt, fresh };
    process.stdout.write(`${JSON.stringify(json, null, 2)}\n`);
  } else {
    process.stdout.write(
      `acceptance: ${report.ok ? 'PASS' : 'FAIL'} (${report.total - report.failed}/${report.total}, ${branch} ${source}`
      + `${recordedAt ? ` recorded_at=${recordedAt}` : ''}, root ${root}`
      + `${fresh === false ? ', interpretation STALE — objective changed since recording' : ''})\n`
      + `${formatAcceptanceReport(report)}\n`,
    );
  }
  return report.ok ? 0 : 1;
}

/**
 * Re-runs the acceptance[] the ship gate (`mark-pre-ship-confirmed.mjs#checkAcceptance`) runs for the
 * branch of the worktree containing the root, chosen by the gate's own `resolveAcceptanceContract`.
 * Reading the caller's session passport instead ran another worktree's criteria against this tree
 * whenever one session held several worktrees — a false FAIL or PASS the gate would not give.
 * Staleness is the gate's: only a session-passport contract has a live objective to compare against,
 * and it is reported, not required — every new prompt rotates the objective, so a fresh-only check
 * would be dead at ship time. A branch contract shows its recorded_at instead.
 */
function cmdCheck(projectDir, options, flags) {
  const asJson = flags.has('json');
  const { given, root, branch } = resolveCheckedOutWorktree(projectDir, options.root);
  if (!branch) {
    return reportNotEvaluated(
      asJson,
      'no_worktree',
      null,
      `acceptance: ${given} is not inside an existing .worktrees/<branch> checkout — the ship gate evaluates acceptance only there; pass --root <worktree-dir>.`,
    );
  }
  const { interp, source, passport } = resolveAcceptanceContract(projectDir, branch);
  if (!interp && passport === null) {
    process.stderr.write(`No current task passport and no contract recorded for ${branch}.\n`);
    return 4;
  }
  const acceptance = Array.isArray(interp?.acceptance) ? interp.acceptance : [];
  if (acceptance.length === 0) {
    return reportNotEvaluated(
      asJson,
      'no_acceptance',
      branch,
      `acceptance: (none) for ${branch} — record --acceptance '<json>' --branch ${branch} to make the definition of done executable.`,
    );
  }
  const fresh = source === 'session_passport'
    ? interp.objective_sha256 === passport?.active_objective?.sha256
    : null;
  const report = evaluateAcceptance(acceptance, { root });
  return reportEvaluated(asJson, report, { branch, source, recordedAt: interp.recorded_at ?? null, fresh, root });
}

function cmdShow(projectDir, flags) {
  const passport = readCurrentTaskPassport(projectDir);
  if (!passport) {
    process.stderr.write('No current task passport.\n');
    return 4;
  }
  const interp = passport.ai_interpretation || null;
  const fresh = interp && interp.objective_sha256 === passport.active_objective?.sha256;
  if (flags.has('json')) {
    process.stdout.write(`${JSON.stringify({ ai_interpretation: interp, fresh }, null, 2)}\n`);
    return 0;
  }
  if (!interp) {
    process.stdout.write('ai_interpretation: (none) — interpretation not yet recorded.\n');
    return 0;
  }
  process.stdout.write(
    `ai_interpretation (${fresh ? 'fresh' : 'STALE — objective changed'})\n${formatInterpretation(interp)}`,
  );
  return 0;
}

export function main(argv = process.argv.slice(2), projectDir = resolveProjectDir()) {
  const { command, options, flags } = parseArgs(argv);
  if (!command || flags.has('help')) {
    process.stdout.write(`${USAGE}\n`);
    return command ? 0 : 2;
  }
  if (command === 'record') return cmdRecord(projectDir, options, flags);
  if (command === 'show') return cmdShow(projectDir, flags);
  if (command === 'check') return cmdCheck(projectDir, options, flags);
  process.stderr.write(`${USAGE}\n`);
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
