/**
 * ship-scale.mjs — Shared library for measuring worktree diff scale + checking review deck traces (CLI-agnostic)
 *
 * Why (preventing drift): Measuring scale (git numstat → classifyScale) and checking review deck traces are shared
 * between pre-ship-review-guard (large-scale deck gate at ship time) and milestone-deck-warning (proactive commit-time
 * and edit-time reminder).
 * Reimplementing individually causes criteria to drift silently (isomorphic to eventOrder scoping flaw in PR #1010).
 * Scale classification SSOT is ship-deck-core.mjs#classifyScale — this lib is the measurement/trace inspection layer above it.
 *
 * .cli→.claude import precedents: pre-ship-review-guard (ship-deck-core), ownership-context-injector.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyScale, parseNumstat } from '../../.claude/scripts/lib/ship-deck-core.mjs';
import { resolveShipBaseRefs } from './ship-base-branch.mjs';
import { withoutInheritedRepository } from './utils.mjs';

/**
 * Default git runner — stubbed via gitFn in tests (R-CM-011 external command isolation).
 * `encoding` decodes stdout (`latin1` keeps every byte distinct; see `resolveReviewDiffId`).
 * `env` is laid over the scrubbed environment (`measureWorktreeScale` points GIT_INDEX_FILE at a copy).
 */
export function defaultGit(cwd, args, { encoding = 'utf-8', env: extraEnv = {} } = {}) {
  // An inherited GIT_DIR would override `-C` and measure another repository's diff.
  const env = { ...withoutInheritedRepository(), ...extraEnv };
  // GIT_DIFF_OPTS overrides `-U` even in plumbing; at `-u0` every hunk loses its context, and with it
  // the only record of where an edit sits (see `resolveReviewDiffId`).
  delete env.GIT_DIFF_OPTS;
  // stderr ignore: prevents fail-open git error text from leaking into hook stderr
  return execFileSync('git', ['-C', cwd, ...args], {
    encoding,
    stdio: ['ignore', 'pipe', 'ignore'],
    env,
  });
}

/**
 * Base-ref loop shared by both scale measurements: `rowsFor(base)` yields numstat-shaped rows
 * (`{added, deleted}`; null counts = binary) and the first ship-base candidate it does not throw for wins.
 * `base` is returned alongside the numbers so a measurement can never be quoted without the ref it
 * was taken against.
 *
 * Base refs come from `.cli/lib/ship-base-branch.mjs#resolveShipBaseRefs` (the configured ship base
 * first, `origin/main` / `main` as fallbacks) — the local `['origin/main', 'main']` this used to
 * carry inflated the scale on projects shipping onto another branch.
 */
function measureAgainstShipBase(worktreeAbsPath, gitFn, io, rowsFor) {
  for (const base of resolveShipBaseRefs(worktreeAbsPath, { gitFn, ...io })) {
    try {
      const rows = rowsFor(base);
      const files = rows.length;
      const loc = rows.reduce((sum, r) => sum + (r.added ?? 0) + (r.deleted ?? 0), 0);
      return { files, loc, base, ...classifyScale({ files, loc }) };
    } catch {
      // Unevaluable for this base ref — try next candidate
    }
  }
  return null;
}

/**
 * Measures the worktree's `<base>...HEAD` diff scale (committed work only — the commit-time view).
 *
 * @param {string} worktreeAbsPath
 * @param {Function} [gitFn]
 * @param {{existsFn?: Function, readFn?: Function}} [io] Test-injectable config I/O.
 * @returns {{files:number, loc:number, base:string, scale:string, label:string, reason:string}|null}
 *   null = unevaluable via git (fail-open — caller SKIPs inspection, R-CM-006 Rule 2)
 */
export function measureShipScale(worktreeAbsPath, gitFn = defaultGit, io = undefined) {
  return measureAgainstShipBase(worktreeAbsPath, gitFn, io, (base) =>
    // Reuses ship-deck-core parser (binary → null, rename normalization)
    parseNumstat(String(gitFn(worktreeAbsPath, ['diff', `${base}...HEAD`, '--numstat']))),
  );
}

/**
 * Measures what the worktree looks like *now* against its ship base: every tracked change since the
 * merge-base (committed + staged + unstaged) plus untracked, non-ignored files, counted by git as it
 * will count them once committed — a file moved without `git mv` is one rename, not a deletion plus
 * an addition, exactly as the ship-time `measureShipScale` sees it.
 *
 * Why it sits beside `measureShipScale` instead of reusing it: that one reads `<base>...HEAD`, so it
 * is blind to everything not yet committed — and edit-time is exactly when nothing is. The edit-time
 * trigger used to sum tool-payload lines over the worktree's lifetime instead; that drifted both ways
 * from the real diff (a one-line Edit carrying a 400-line payload counted 400, a revert never
 * subtracted, gitignored PLAN.md edits counted, script-written and already-committed changes did not).
 *
 *   - `git diff --merge-base <base>` compares merge-base(<base>, HEAD) with the working tree, so commits
 *     that only `<base>` gained are not counted as deletions (a two-dot `git diff <base>` would).
 *   - Untracked files are invisible to `git diff` until the index names them, so `add --intent-to-add
 *     --all` names them — in a scratch copy of the index, never the real one: a hook must not touch
 *     what the user staged, and even a plain `git diff` rewrites the real index when a file's stat
 *     changed but its content did not. The copy keeps the original's mtime: git trusts an unchanged
 *     stat only for files older than the index file, so a fresh mtime would hide a same-size edit made
 *     in the second the index was written (racy git).
 *
 * Unevaluable when git cannot add a path it has to count — an unreadable file, a nested repository
 * with no commit checked out, an untracked file outside the sparse-checkout definition; `git add -A`
 * fails on the same tree, so it could not be committed as is either. Also unevaluable while the
 * worktree has no index file to copy.
 *
 * Also unevaluable while a merge awaits its commit (conflicted, or `--no-commit`): the working tree
 * holds the other side's changes but HEAD does not descend from it yet, so the diff would count a
 * merged base's changes as this branch's work (2 files / 406 LOC where ship counted 1 / 2) and any
 * merge's unresolved conflict markers. The next edit after the merge commit measures again. The
 * test is the MERGE_HEAD file in this worktree's git dir, as `git merge --abort` checks, not a ref
 * of that name: a tag or branch can be named so, and every worktree of the repository sees it.
 *
 * Cost: one `rev-parse` + one `add` + one `diff` (+ the base-ref lookup) and an index copy per call,
 * so callers must gate it behind their one-shot suppression, as milestone-deck-warning does.
 *
 * @param {string} worktreeAbsPath
 * @param {Function} [gitFn]
 * @param {{existsFn?: Function, readFn?: Function}} [io] Test-injectable config I/O.
 * @returns {{files:number, loc:number, base:string, scale:string, label:string, reason:string}|null}
 *   null = unevaluable via git (fail-open, R-CM-006 Rule 2). A partial count — say, tracked changes
 *   without the untracked files — is never returned as if it were the measurement.
 */
export function measureWorktreeScale(worktreeAbsPath, gitFn = defaultGit, io = undefined) {
  let scratchDir;
  try {
    const [realIndex, mergeHead] = String(
      gitFn(worktreeAbsPath, [
        'rev-parse',
        '--path-format=absolute',
        '--git-path',
        'index',
        '--git-path',
        'MERGE_HEAD',
      ]),
    )
      .trim()
      .split('\n');
    if (existsSync(mergeHead)) return null;
    scratchDir = mkdtempSync(join(tmpdir(), 'ship-scale-'));
    const env = { GIT_INDEX_FILE: join(scratchDir, 'index') };
    cpSync(realIndex, env.GIT_INDEX_FILE, { preserveTimestamps: true });
    gitFn(worktreeAbsPath, ['add', '--intent-to-add', '--all'], { env });
    return measureAgainstShipBase(worktreeAbsPath, gitFn, io, (base) =>
      parseNumstat(String(gitFn(worktreeAbsPath, ['diff', '--merge-base', base, '--numstat'], { env }))),
    );
  } catch {
    return null;
  } finally {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
  }
}

/**
 * Checks for presence of CP-MILESTONE review deck traces (.tmp/review-deck/<safeKey>/milestone-<slug>/index.html).
 * Path structure SSOT: review-deck.mjs output convention.
 * @returns {boolean} true if 1+ traces exist
 * @throws Re-throws fs errors — caller responsible for fail-open handling (SKIP warning/reminder).
 *         Swallowing as false flips fail-open direction to "fs error → no traces → fire warning".
 */
export function hasMilestoneDeckTrace(
  projectDir,
  safeKey,
  { existsFn = existsSync, readdirFn = readdirSync } = {},
) {
  const deckRoot = join(projectDir, '.tmp', 'review-deck', safeKey);
  return (
    existsFn(deckRoot) &&
    readdirFn(deckRoot).some(
      (d) => String(d).startsWith('milestone-') && existsFn(join(deckRoot, d, 'index.html')),
    )
  );
}

/** Path to ship deck index.html (.tmp/ship-deck/<safeKey>/index.html) — unified path assembly */
export function shipDeckIndexPath(projectDir, safeKey) {
  return join(projectDir, '.tmp', 'ship-deck', safeKey, 'index.html');
}

/** Tolerance for future committer timestamps (seconds) — handles clock skew / rebase future dates. */
export const FUTURE_SKEW_TOLERANCE_SEC = 300;

/**
 * Validates presence + freshness of ship deck artifact (deck mtime >= worktree HEAD commit timestamp).
 * Isomorphic in spirit to quality-gate PROOF head_sha staleness — stale if new commits accumulate after deck creation.
 *
 * **Shared SSOT between two consumers**: `pre-ship-review-guard` (ship-time deny) and
 * `pre-ship-steps.mjs` (pre-approval dry run). Independent implementations create round-trip discrepancies
 * where pre-check passes but ship denies.
 *
 * Committer timestamps in the future create unrecoverable deny loops where regenerating decks remains stale;
 * treated as unevaluable (fail-open).
 *
 * @returns {{ok:boolean, reason?:'deck_absent'|'deck_stale', deckPath:string}}
 */
export function checkShipDeckFreshness(
  projectDir,
  safeKey,
  worktreeAbsPath,
  gitFn = defaultGit,
  { existsFn = existsSync, statFn = statSync, nowMs = () => Date.now() } = {},
) {
  const deckPath = shipDeckIndexPath(projectDir, safeKey);
  if (!existsFn(deckPath)) return { ok: false, reason: 'deck_absent', deckPath };
  try {
    const headTimeSec = Number(String(gitFn(worktreeAbsPath, ['log', '-1', '--format=%ct'])).trim());
    const deckMtimeSec = statFn(deckPath).mtimeMs / 1000;
    const headInFuture = headTimeSec > nowMs() / 1000 + FUTURE_SKEW_TOLERANCE_SEC;
    if (Number.isFinite(headTimeSec) && !headInFuture && deckMtimeSec < headTimeSec) {
      return { ok: false, reason: 'deck_stale', deckPath };
    }
    return { ok: true, deckPath };
  } catch {
    return { ok: true, deckPath }; // Freshness unevaluable — pass on existence alone (fail-open)
  }
}
