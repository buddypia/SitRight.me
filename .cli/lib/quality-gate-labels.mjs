/**
 * quality-gate-labels.mjs — Single SSOT for Quality Gate label enum + per-label PROOF evidence contracts
 *
 * Enum for marker JSON `quality_gate` field representing R-CM-030 Rule 8 (Pre-Ship Quality Gate).
 * Imported by mark-pre-ship-confirmed.mjs (CLI emitter, re-runs the obligations), pre-ship-steps.mjs
 * and pre-ship-review-guard.mjs (verifiers).
 *
 * Label meanings:
 * - `verified`         : The PROOF carries verification obligations of both methods — at least one
 *                        `empirical` gate (a command that runs the changed code and names a changed
 *                        path) and one `formal` gate (a machine checker from `FORMAL_CHECKERS`) — and
 *                        the ship gate re-ran every one of them green at the shipped HEAD.
 * - `self_review_pass` : No verification obligations recorded (Panel Decisions reason specified)
 * - `trivial_skip`     : R-CM-030 Rule 10 trivial exemption (≤2 files + ≤20 LOC + non-substantive)
 *
 * Why `verified` replaced `agent_go` / `skill_review_pass` (2026-11-04, ADR
 *   docs/architecture/adr/empirical-formal-verification.md): both labels were earned by a gate *name* —
 *   `checkLabelEvidence` matched `code-reviewer` / `adversarial-review` substrings in `gates[].name`, and
 *   no code ever re-ran `gates[].command`. A review that reads well sounds equally convincing whether it
 *   is right or wrong (final-review/references/proof-ladder.md rung 1 "Said"), so the label measured
 *   that a reviewer spoke, not that the change holds. Evidence is now what the gate itself re-executes.
 *   Reviews (agent, skill, multi-model, adversarial) stay useful as *hypothesis generators*: record
 *   them as `method: "review"`, and turn each finding that matters into an empirical or formal gate.
 *
 * Updating only this file when adding new labels reflects changes in both emitter / verifier — preventing mismatch regressions.
 */
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VALID_QUALITY_LABELS = new Set(['verified', 'self_review_pass', 'trivial_skip']);

/**
 * Labels that only historic ledger rows and PROOFs carry. They are read (the ledger counted them as
 * reviewed, and rewriting history would falsify it) but never accepted for a new marker or PROOF:
 * their evidence was a gate name, which is exactly what this module stopped trusting.
 */
export const LEGACY_QUALITY_LABELS = new Set(['agent_go', 'skill_review_pass']);

/** Labels the ledger and auto-approval treat as verified — `verified` plus legacy history rows. */
export const VERIFIED_LABELS = new Set(['verified', ...LEGACY_QUALITY_LABELS]);

/**
 * Verification methods a PROOF gate may claim with `method`.
 * - `empirical`: run the changed code and observe it (a test, a script calling the real function, a
 *   real-tree sweep). Must name a path the branch changed, so the evidence is about this change.
 * - `formal`: a machine checker that decides a property for every input it covers (type checker,
 *   JSON Schema validation, rules-as-code predicates with fixture pairs, architecture constraints).
 */
export const VERIFICATION_METHODS = Object.freeze(['empirical', 'formal']);

/** Every `gates[].method` value. `review` = a hypothesis source (never evidence on its own). */
export const GATE_METHODS = Object.freeze([...VERIFICATION_METHODS, 'review']);

/**
 * Commands accepted as formal checkers. A command is formal because of *what decides the outcome* (a
 * checker over a declared spec), not because the author says so — hence a registry, not a free label.
 * Composite targets (`q.critical`, `q.check`) qualify because they run the type check and the
 * contract validators; they still cannot double as the empirical gate (see checkVerificationObligations).
 */
// No contract checker: `q.contract-test`, `q.ai-contracts` and `npm run test:contract` exit 0 with
// "not applicable" when their inputs are absent (true in this repo) — a checker that decides nothing is
// not formal evidence. Re-add one only with a pattern that cannot pass on an empty input set.
export const FORMAL_CHECKERS = Object.freeze([
  Object.freeze({ id: 'typecheck', pattern: /\btsc\b|\bq\.typecheck\b/ }),
  Object.freeze({ id: 'schema', pattern: /\bnpm run validate(?::[\w-]+)?\b|\bvalidate-ecosystem\.mjs\b|\bajv\b/ }),
  Object.freeze({ id: 'rules-as-code', pattern: /\bdata\/rules-as-code\/_runner\.mjs\b|rules-as-code-fixtures\.test\.mjs/ }),
  Object.freeze({ id: 'architecture', pattern: /\bq\.check-architecture\b|\bdepcruise\b/ }),
  Object.freeze({ id: 'quality-gate', pattern: /^make\b.*\sq\.(?:critical|check)\b/ }),
]);

/**
 * Programs whose run decides a gate. A gate's evidence must come from an `&&` segment that starts with
 * one of these: `echo tsc`, `true # q.typecheck` or `printf <changed path>` mention a checker or a path
 * without running it (code-reviewer hypothesis #1, reproduced 2026-11-04).
 */
const RUNNERS = new Set([
  'npx', 'node', 'npm', 'pnpm', 'yarn', 'make', 'python', 'python3', 'pytest', 'vitest', 'bash', 'sh',
  'go', 'cargo', 'deno', 'bun', 'tsc', 'ajv', 'depcruise',
]);
// Inline code (`node -e`, `bash -c`) can print a path and exit 0 without touching the change.
const INLINE_CODE_FLAGS = new Set(['-e', '-p', '-c', '--eval', '--print']);
// Flags that make a runner exit 0 without executing what the command names.
const NON_EXECUTING_FLAGS = new Set([
  '--version', '-v', '-V', '--help', '-h', '--dry-run', '--just-print', '--recon', '--list', '--passWithNoTests',
  '--ignore-errors', '--touch', '--question',
]);
// make: -n dry run, -i ignore errors, -t touch, -q question — each exits 0 without the recipe deciding.
const MAKE_NON_EXECUTING = /^-[A-Za-z]*[nitq][A-Za-z]*$/;
// make VAR=value overrides a recipe's command (`make q.typecheck TSC=true`).
const MAKE_OVERRIDE = /^[A-Za-z_][A-Za-z0-9_]*[:+?]?=/;
// Anything but `&&` lets a later or earlier part decide the exit code (`|| true`, `; true`, `| tee`),
// hides text from the shell (`#`), or runs code the gate never sees (backticks, `$(`).
const SHELL_ESCAPES = /\|\||[|;`\n#]|\$\(|(?<![&>])&(?!&)/;

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=\S*$/;

function segmentTokens(command) {
  return String(command)
    .replace(/\d?>&\d/g, ' ')
    .split('&&')
    .map((segment) => {
      const tokens = segment.trim().split(/\s+/).filter(Boolean);
      while (tokens.length > 0 && ENV_ASSIGNMENT.test(tokens[0])) tokens.shift();
      return tokens;
    });
}

const isRunnerSegment = (tokens) =>
  tokens.length > 0 &&
  (RUNNERS.has(tokens[0]) || tokens[0].startsWith('./')) &&
  !tokens.slice(1).some((t) => INLINE_CODE_FLAGS.has(t));

/**
 * Why a command cannot be trusted to decide its gate, or null. Strict on purpose: a false rejection
 * costs one rewritten command; a false acceptance is a `verified` label nothing verified.
 */
export function commandHonestyProblem(command) {
  if (typeof command !== 'string' || command.trim() === '') return 'no command';
  if (SHELL_ESCAPES.test(command.replace(/\d?>&\d/g, ' '))) {
    return 'uses a shell operator other than && (|, ||, ;, &, #, `, $( or a newline) — another part could decide the exit code';
  }
  for (const tokens of segmentTokens(command)) {
    const flag = tokens.find((t) => NON_EXECUTING_FLAGS.has(t.split('=')[0]));
    if (flag) return `passes ${flag}, which exits without running the check`;
    if (tokens[0] === 'make' && tokens.slice(1).some((t) => MAKE_NON_EXECUTING.test(t) || MAKE_OVERRIDE.test(t))) {
      return 'runs make with -n/-i/-t/-q or a VAR=value override — the recipe no longer decides the exit code';
    }
  }
  return null;
}

/** The `&&` segments of a command that start with a runner — the parts that actually execute. */
export function runnerSegments(command) {
  if (typeof command !== 'string') return [];
  return segmentTokens(command).filter(isRunnerSegment).map((tokens) => tokens.join(' '));
}

/** The formal checker id a command runs (in a runner segment, honestly), or null. */
export function matchFormalChecker(command) {
  if (commandHonestyProblem(command)) return null;
  const segments = runnerSegments(command);
  return FORMAL_CHECKERS.find((c) => segments.some((segment) => c.pattern.test(segment)))?.id ?? null;
}

/**
 * Whether an empirical command is about this change: it names a changed path, or the file name
 * (without extension, ≥ 6 chars) of a changed file — `vitest run quality-gate-labels` filters by name.
 * `changedFiles=null` means the diff could not be measured: fail-open (R-CM-006 Rule 2).
 */
export function namesChangedPath(command, changedFiles) {
  if (changedFiles === null || changedFiles === undefined) return true;
  if (typeof command !== 'string') return false;
  // Only a runner segment counts: `echo <changed path> && npx vitest run other` names nothing it runs.
  const executed = runnerSegments(command).join(' ');
  return changedFiles.some((file) => {
    if (executed.includes(file)) return true;
    const stem = basename(file).replace(/\.[^.]+(?:\.[^.]+)?$/, '');
    return stem.length >= 6 && executed.includes(stem);
  });
}

/**
 * `trivial_skip` limits — R-CM-030 Rule 10 (≤2 files + ≤20 LOC). The only label whose claim is a
 * measurement, so it is checked against one (`checkTrivialClaim`) instead of taken on trust.
 *
 * Why: nothing measured it. Observed 2026-09-24 — a transplant target's local ship wrapper hardcoded
 * `--quality trivial_skip`, and 34 of its 54 ledger rows were medium/large ships labelled trivial.
 */
export const TRIVIAL_SKIP_LIMITS = Object.freeze({ files: 2, loc: 20 });

/**
 * Whether a label's scale claim holds for the measured diff (pure).
 * @param {string|null|undefined} label
 * @param {{files: number, loc: number}|null|undefined} measured null = unmeasurable (fail-open)
 * @returns {{ok: boolean, files?: number, loc?: number}}
 */
export function checkTrivialClaim(label, measured) {
  if (label !== 'trivial_skip' || !measured) return { ok: true };
  const { files, loc } = measured;
  return { ok: files <= TRIVIAL_SKIP_LIMITS.files && loc <= TRIVIAL_SKIP_LIMITS.loc, files, loc };
}

/**
 * Review assets **this repo ships** — hypothesis sources operator-facing advice may name.
 *
 * A review no longer earns a label (see the header): it finds *where to look*, and its findings count
 * once they become an empirical or formal gate. Advice still names only assets this repository ships:
 * on 2026-08-26 advice named `/code-review`, absent from `enabledPlugins`, and the operator read the
 * rejection as "every path is closed" (#1221). An answer the repo does not ship is not an answer.
 *
 * `path` is repo-relative and asserted to exist by `tests/unit/quality-gate-labels.test.mjs`.
 * `surfaces` declares which CLIs can run the asset (subset of `REVIEW_SURFACES`): the guards printing
 * this advice run in every CLI, so a Claude-only subagent must not be advertised to Codex/Antigravity.
 * Transplant bundles copy this module into projects without the assets, so `formatReviewRemedy`
 * checks each path against the project it runs in rather than trusting the list.
 */
export const REPO_REVIEW_ASSETS = Object.freeze([
  Object.freeze({
    tool: 'code-reviewer agent',
    path: '.claude/agents/code-reviewer.md',
    // Subagents are a Claude Code capability.
    surfaces: Object.freeze(['claude']),
  }),
  Object.freeze({
    tool: 'code-standards-aligner skill',
    path: '.claude/skills/code-standards-aligner/SKILL.md',
    // Skills live under `.agents/skills/` (mirrored to `.claude/skills/`), reachable from every CLI.
    surfaces: Object.freeze(['claude', 'codex', 'antigravity']),
  }),
]);

/** Every surface (CLI) a review asset may declare in `REPO_REVIEW_ASSETS[].surfaces`. */
export const REVIEW_SURFACES = Object.freeze(['claude', 'codex', 'antigravity']);

/** Project root of the running copy — this module lives at `<root>/.cli/lib/`. */
const RUNNING_PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Operator-facing advice for earning `verified`. Call sites interpolate this instead of hand-writing
 * it — three hand-written copies rotted at once before (#1221).
 *
 * @param {{markup?: boolean, projectDir?: string, existsFn?: (p: string) => boolean}} [opts]
 *   markup=true backticks names (markdown sinks); false emits bare text for terminal sinks.
 */
export function formatReviewRemedy({
  markup = false,
  projectDir = RUNNING_PROJECT_ROOT,
  existsFn = existsSync,
} = {}) {
  const tick = markup ? '`' : '';
  const present = REPO_REVIEW_ASSETS.filter((asset) => existsFn(join(projectDir, asset.path)));
  const sources = present.map((asset) => {
    const only =
      asset.surfaces && asset.surfaces.length < REVIEW_SURFACES.length ? ` (${asset.surfaces.join('/')} only)` : '';
    return `${tick}${asset.tool}${tick}${only}`;
  });
  const hypotheses = sources.length > 0 ? `; to find what to verify, optionally run ${sources.join(' or ')} as a hypothesis source` : '';
  return (
    `record PROOF gates with ${tick}method: "empirical"${tick} (a command that runs the changed code and names a changed path) ` +
    `and ${tick}method: "formal"${tick} (a formal checker: ${FORMAL_CHECKERS.map((c) => c.id).join(', ')}), ` +
    `which the ship gate re-runs before ${tick}--quality verified${tick}${hypotheses}`
  );
}

/**
 * Gate statuses recognized as evidence — only those that **actually ran** and passed.
 * `warn` stays accepted for formal composites that pass with warnings; the re-run decides anyway.
 */
export const EVIDENCE_GATE_STATUSES = Object.freeze(['pass', 'warn']);

/**
 * Structural check of a PROOF's verification obligations (pure — no fs, no exec).
 *
 * Satisfied when gates[] holds ≥1 `empirical` and ≥1 `formal` gate, each with status pass/warn and a
 * `command`, the formal command matching `FORMAL_CHECKERS`, and the empirical command differing from
 * every formal one (one run cannot count as both methods). Whether the commands *pass now* is decided
 * by the caller re-running them (`mark-pre-ship-confirmed.mjs#checkVerificationRerun`).
 *
 * @param {unknown} gates
 * @returns {{empirical: object[], formal: object[], missing: string[], problems: string[], satisfied: boolean}}
 */
export function checkVerificationObligations(gates) {
  const list = Array.isArray(gates) ? gates : [];
  const problems = [];
  const formal = [];
  const empiricalCandidates = [];
  list.forEach((gate, i) => {
    if (!gate || typeof gate !== 'object' || !VERIFICATION_METHODS.includes(gate.method)) return;
    const at = `gates[${i}] (${gate.name ?? '?'})`;
    if (!EVIDENCE_GATE_STATUSES.includes(gate.status)) return;
    const command = typeof gate.command === 'string' ? gate.command.trim() : '';
    if (!command) {
      problems.push(`${at}: method=${gate.method} needs the command that ran — the gate re-runs it`);
      return;
    }
    const dishonest = commandHonestyProblem(command);
    if (dishonest) {
      problems.push(`${at}: "${command}" ${dishonest}`);
      return;
    }
    if (gate.method === 'formal') {
      if (matchFormalChecker(command)) formal.push(gate);
      else problems.push(`${at}: "${command}" is not a formal checker (${FORMAL_CHECKERS.map((c) => c.id).join(', ')})`);
      return;
    }
    if (runnerSegments(command).length === 0) {
      problems.push(`${at}: "${command}" does not start with a program that runs code (${[...RUNNERS].join(', ')}, ./script)`);
      return;
    }
    empiricalCandidates.push(gate);
  });
  const formalCommands = new Set(formal.map((g) => g.command.trim()));
  const empirical = empiricalCandidates.filter((g) => !formalCommands.has(g.command.trim()));
  if (empirical.length < empiricalCandidates.length) {
    problems.push('an empirical gate reuses a formal gate\'s command — one run cannot count as both methods');
  }
  const missing = VERIFICATION_METHODS.filter((m) => (m === 'formal' ? formal : empirical).length === 0);
  return { empirical, formal, missing, problems, satisfied: missing.length === 0 };
}

/**
 * Determines whether the PROOF evidence a label requires exists in `gates[]` (pure).
 *
 * `verified` requires the structural obligations above. Legacy labels are never satisfied for a new
 * claim. `self_review_pass` / `trivial_skip` require no evidence — they declare that no verification
 * ran, and the ledger aggregates them as skips.
 *
 * @returns {{required: boolean, satisfied: boolean, legacy?: boolean, missing: string[], problems: string[]}}
 *   If `required=false`, satisfied is always true (simplifying caller branching).
 */
export function checkLabelEvidence(label, gates) {
  if (LEGACY_QUALITY_LABELS.has(label)) {
    return { required: true, satisfied: false, legacy: true, missing: [...VERIFICATION_METHODS], problems: [] };
  }
  if (label !== 'verified') return { required: false, satisfied: true, missing: [], problems: [] };
  const { missing, problems, satisfied } = checkVerificationObligations(gates);
  return { required: true, satisfied, missing, problems };
}
