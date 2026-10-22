/**
 * ship-scale.mjs — Shared library for measuring worktree diff scale + checking review deck traces (CLI-agnostic)
 *
 * Why (preventing drift): Measuring scale (git numstat → classifyScale) is shared between pre-ship-review-guard
 * (large-scale deck gate at ship time), pre-ship-steps (pre-approval dry run) and mark-pre-ship-confirmed.
 * Reimplementing individually causes criteria to drift silently (isomorphic to eventOrder scoping flaw in PR #1010).
 * Scale classification SSOT is ship-deck-core.mjs#classifyScale — this lib is the measurement/trace inspection layer above it.
 *
 * .cli→.claude import precedents: pre-ship-review-guard (ship-deck-core), ownership-context-injector.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { classifyScale, parseNumstat } from '../../.claude/scripts/lib/ship-deck-core.mjs';
import { resolveShipBaseRefs } from './ship-base-branch.mjs';
import { withoutInheritedRepository } from './utils.mjs';

/**
 * Default git runner — stubbed via gitFn in tests (R-CM-011 external command isolation).
 * `encoding` decodes stdout (`latin1` keeps every byte distinct; see `resolveReviewDiffId`).
 */
export function defaultGit(cwd, args, { encoding = 'utf-8' } = {}) {
  // An inherited GIT_DIR would override `-C` and measure another repository's diff.
  const env = withoutInheritedRepository();
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
 * Measures the worktree's `<base>...HEAD` diff scale (committed work only — the commit-time view).
 * The first ship-base candidate git does not fail for wins; `base` is returned alongside the numbers so
 * a measurement can never be quoted without the ref it was taken against.
 *
 * Base refs come from `.cli/lib/ship-base-branch.mjs#resolveShipBaseRefs` (the configured ship base
 * first, `origin/main` / `main` as fallbacks) — the local `['origin/main', 'main']` this used to
 * carry inflated the scale on projects shipping onto another branch.
 *
 * @param {string} worktreeAbsPath
 * @param {Function} [gitFn]
 * @param {{existsFn?: Function, readFn?: Function}} [io] Test-injectable config I/O.
 * @returns {{files:number, loc:number, base:string, scale:string, label:string, reason:string}|null}
 *   null = unevaluable via git (fail-open — caller SKIPs inspection, R-CM-006 Rule 2)
 */
export function measureShipScale(worktreeAbsPath, gitFn = defaultGit, io = undefined) {
  for (const base of resolveShipBaseRefs(worktreeAbsPath, { gitFn, ...io })) {
    try {
      // Reuses ship-deck-core parser (binary → null, rename normalization)
      const rows = parseNumstat(String(gitFn(worktreeAbsPath, ['diff', `${base}...HEAD`, '--numstat'])));
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
 * Checks for presence of CP-MILESTONE review deck traces (.tmp/review-deck/<safeKey>/milestone-<slug>/index.html).
 * Path structure SSOT: review-deck.mjs output convention.
 * @returns {boolean} true if 1+ traces exist
 * @throws Re-throws fs errors — the caller decides what an unreadable deck root means
 *         (the ship ledger, `ops.mjs`, records it as no deck).
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
