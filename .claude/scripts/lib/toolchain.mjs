/**
 * toolchain.mjs — One resolver for "which toolchain does this checkout run on", and the policy that
 * heals it before gates run.
 *
 * Why (DEBT-612, measured 2026-11-09): gate verdicts are cached by a content fingerprint of each
 * step's hand-written input scope. The scopes omitted package-lock.json, and no scope can name the
 * installed tree (node_modules is gitignored) or the Node binary, so a Playwright bump reused a
 * pre-bump green while the real run failed 5/5, and main's shared tree drifted 58 packages from its
 * lockfile while still holding PASS verdicts. Two properties close that class:
 *
 *   1. `toolchainIdentity` names the resolved installed tree + Node version; agent-scratchpad salts
 *      every key with it, so a verdict can never outlive the tree it ran on.
 *   2. `syncToolchain` makes a checkout's resolved tree match its own lockfile before gates run —
 *      in a linked worktree only. The main tree is shared by every session and every worktree that
 *      has no install of its own (#1446: automation never empties it), so main is reported with one
 *      exact remedy instead.
 *
 * Drift semantics are Check 4's (q-deps-audit) via `runInstalledTreeCheck`, so the heal and the
 * audit cannot disagree about what "in sync" means.
 *
 * Cross-ref: lib/installed-tree-drift.mjs, lib/agent-scratchpad.mjs, toolchain-sync.mjs (CLI),
 * worktree-new.mjs (Step 5), ci-local-status.mjs (preflight), Makefile#q.toolchain.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { withoutInheritedRepository } from '../../../.cli/lib/utils.mjs';
import {
  TREE_SKIP,
  describeDrift,
  resolveInstalledManifest,
  runInstalledTreeCheck,
} from './installed-tree-drift.mjs';

/** npm's own record of the tree it last reified (written by every install / ci / uninstall). */
const HIDDEN_LOCKFILE = 'node_modules/.package-lock.json';

/** Measured 7.9s with a warm cache; a cold cache on a slow network gets the rest. */
export const NPM_CI_TIMEOUT_MS = 300_000;

const NEEDS_INSTALL = new Set(['drift', 'not_installed']);

/**
 * The hidden lockfile Node would load packages through from `startDir`: the first one found walking
 * up, as module resolution does. A worktree without its own install resolves main's.
 *
 * @returns {string|null}
 */
export function resolveInstalledLockfile(startDir, existsFn = existsSync) {
  return resolveInstalledManifest(resolve(startDir), HIDDEN_LOCKFILE, {
    existsFn,
    joinFn: join,
    dirnameFn: dirname,
  });
}

/**
 * Identity of the toolchain a gate in `dir` runs on. Content only, never paths: two checkouts on
 * byte-identical installed trees (npm writes the same hidden lockfile for the same lockfile) must
 * keep sharing verdicts. Read on every call — memoizing would reintroduce the stale key this exists
 * to remove, and one sha1 of the hidden lockfile costs milliseconds.
 *
 * The walk starts from the real path: Node resolves packages from a module's real path, and the
 * writer and reader of one key spell the same checkout differently (`process.cwd()` is physical,
 * `$PWD` / CLAUDE_PROJECT_DIR may be logical). Measured 2026-11-09: under a symlinked TMPDIR the
 * ci-mirror-stamp writer and its CLI reader walked to different ancestors and never matched.
 */
export function toolchainIdentity(dir) {
  let start = resolve(dir);
  try {
    start = realpathSync(start);
  } catch {
    /* missing dir: the lexical walk finds what exists above it */
  }
  const lock = resolveInstalledLockfile(start);
  let installed = 'none';
  if (lock) {
    try {
      installed = createHash('sha1').update(readFileSync(lock)).digest('hex');
    } catch {
      installed = 'unreadable';
    }
  }
  return `node=${process.version}\ninstalled=${installed}`;
}

/**
 * Compares `dir`'s lockfile with the tree Node resolves from `dir`.
 *
 * @returns {{status: 'in_sync'|'drift'|'not_installed'|'no_lockfile'|'lockfile_unreadable',
 *   findings: number, sample: string[], tree_roots: string[]}}
 */
export function inspectToolchain(dir) {
  const r = runInstalledTreeCheck({ cwd: resolve(dir) });
  const base = {
    findings: r.findings.length,
    sample: r.findings.slice(0, 5).map(describeDrift),
    tree_roots: r.tree_roots,
  };
  switch (r.skipped) {
    case TREE_SKIP.NO_LOCKFILE:
      return { status: 'no_lockfile', ...base };
    // Fail-open: an unparsable lockfile is Check 2's finding (lockfile drift), not ours.
    case TREE_SKIP.LOCKFILE_UNREADABLE:
      return { status: 'lockfile_unreadable', ...base };
    case TREE_SKIP.NOT_INSTALLED:
      return { status: 'not_installed', ...base };
    case TREE_SKIP.NOTHING_TO_COMPARE:
      return { status: 'in_sync', ...base };
    default:
      return { status: base.findings > 0 ? 'drift' : 'in_sync', ...base };
  }
}

/** True only for a linked worktree. Any doubt answers false: unsure means "maybe shared", so no install. */
export function isLinkedWorktree(dir) {
  try {
    const [gitDir, commonDir] = execFileSync(
      'git',
      ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir'],
      {
        cwd: dir,
        env: withoutInheritedRepository(),
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 5000,
      },
    )
      .trim()
      .split('\n');
    return Boolean(gitDir && commonDir) && resolve(gitDir) !== resolve(commonDir);
  } catch {
    return false;
  }
}

/** `npm ci` with `dir` as cwd: npm takes its local prefix from cwd (env cannot redirect it — measured npm 11.17). */
export function npmCi(dir) {
  const r = spawnSync('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], {
    cwd: dir,
    env: withoutInheritedRepository(),
    encoding: 'utf-8',
    timeout: NPM_CI_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error) return { ok: false, detail: r.error.message };
  if (r.status !== 0) {
    const tail = String(r.stderr || r.stdout || '')
      .trim()
      .split('\n')
      .slice(-5)
      .join('\n');
    return { ok: false, detail: `npm ci exited ${r.status}: ${tail}` };
  }
  return { ok: true, detail: '' };
}

function mainRemedy(dir, before) {
  const what =
    before.status === 'not_installed'
      ? 'has nothing installed'
      : `drifts from package-lock.json (${before.findings} packages)`;
  return (
    `The main checkout's node_modules ${what}. Automation never rewrites the shared tree (#1446). ` +
    `With no other session running, run: cd '${dir}' && npm ci — linked worktrees heal themselves at gate entry.`
  );
}

/** Where `<dir>/node_modules` points when it is a symlink, else null. readlink, not realpath: a dangling link still counts. */
function symlinkedTree(dir) {
  const nodeModules = join(dir, 'node_modules');
  try {
    return lstatSync(nodeModules).isSymbolicLink() ? readlinkSync(nodeModules) : null;
  } catch {
    return null;
  }
}

/**
 * `npm ci` empties `<cwd>/node_modules` before installing, following a symlink (npm 11
 * lib/commands/ci.js: readdir + rm of each entry), so a worktree linked into main's tree would wipe
 * the shared tree that #1446 protects (code review 2026-11-09). `rm` on the link leaves the target.
 */
function symlinkRemedy(dir, target) {
  const link = join(dir, 'node_modules');
  return (
    `'${link}' is a symlink to '${target}'; npm ci would empty the tree it points to. ` +
    `Remove only the link (rm '${link}') and re-run make q.toolchain to give this worktree its own install.`
  );
}

/**
 * Makes the tree Node resolves from `dir` match `dir`'s lockfile, or says exactly why it could not.
 *
 * | status         | ok    | meaning                                                         |
 * |----------------|-------|-----------------------------------------------------------------|
 * | in_sync        | true  | nothing to do (also: a worktree sharing a matching main tree)    |
 * | no_lockfile    | true  | nothing to compare against                                       |
 * | lockfile_unreadable | true | fail-open; q-deps-audit Check 2 owns it                      |
 * | installed      | true  | linked worktree drifted, `npm ci` ran there and re-inspection passed |
 * | blocked        | false | main checkout, or a symlinked node_modules, needs install; `remedy` names the command |
 * | install_failed | false | npm failed, threw, or left the tree drifting                     |
 *
 * @param {string} dir
 * @param {{install?: (dir: string) => {ok: boolean, detail?: string}}} [opts] install is the npm seam
 */
export function syncToolchain(dir, { install = npmCi } = {}) {
  const startedAt = Date.now();
  const done = (r) => ({ ...r, duration_ms: Date.now() - startedAt });
  const target = resolve(dir);
  const before = inspectToolchain(target);
  if (!NEEDS_INSTALL.has(before.status)) return done({ status: before.status, ok: true, before });
  if (!isLinkedWorktree(target)) {
    return done({ status: 'blocked', ok: false, before, remedy: mainRemedy(target, before) });
  }
  const linkedTo = symlinkedTree(target);
  if (linkedTo) {
    return done({ status: 'blocked', ok: false, before, remedy: symlinkRemedy(target, linkedTo) });
  }

  let res;
  try {
    res = install(target);
  } catch (err) {
    res = { ok: false, detail: err?.message || String(err) };
  }
  const after = inspectToolchain(target);
  if (!res?.ok) {
    return done({ status: 'install_failed', ok: false, before, after, detail: res?.detail || '' });
  }
  if (after.status !== 'in_sync') {
    const sample = after.sample.length ? `: ${after.sample.join('; ')}` : '';
    return done({
      status: 'install_failed',
      ok: false,
      before,
      after,
      detail: `tree still ${after.status} after npm ci${sample}`,
    });
  }
  return done({ status: 'installed', ok: true, before, after });
}
