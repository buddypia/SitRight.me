/**
 * installed-tree-drift.mjs — Detects lockfile (declared tree) ↔ node_modules (runtime tree) drift
 *
 * Root problem (measured, DEBT-247): `npm audit` reads the **lockfile** while vitest executes **node_modules**.
 * When these trees diverge, "audit inspected tree ≠ test executed tree", so passing locally fails to provide
 * valid evidence for CI.
 *
 * Evaluation method: Directly compares lockfile `packages` map against installed `package.json#version`
 * at each path.
 *
 * False positive suppression:
 *   - `optional: true` missing entries are expected (platform-specific binaries only install on matching OS).
 *   - `link: true` (workspace symlinks) / missing `version` (root entry `""`) are excluded from comparison.
 *   - `devOptional` is NOT exempt.
 *   - Unreadable installed `package.json` files are surfaced via the `unreadable` counter.
 *
 * Cross-ref: R-CM-003 Rule 7, R-CM-010, q-deps-audit.mjs Check 4, lib/toolchain.mjs.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';

/**
 * Resolves installed manifest using Node module resolution upward package lookup.
 *
 * @param {string} startDir - Absolute path (usually process.cwd())
 * @param {string} relPath  - Relative path from lockfile (e.g., `node_modules/foo/package.json`)
 * @param {(p: string) => boolean} existsFn
 * @param {(...p: string[]) => string} joinFn
 * @param {(p: string) => string} dirnameFn
 * @returns {string|null} Resolved absolute path or null
 */
export function resolveInstalledManifest(startDir, relPath, { existsFn, joinFn, dirnameFn }) {
  let dir = startDir;
  for (;;) {
    const candidate = joinFn(dir, relPath);
    if (existsFn(candidate)) return candidate;
    const parent = dirnameFn(dir);
    if (!parent || parent === dir) return null;
    dir = parent;
  }
}

/** Determines if lockfile packages entry is a comparison target */
function isComparable(meta) {
  if (!meta || typeof meta !== 'object') return false;
  if (meta.link === true) return false;
  return typeof meta.version === 'string' && meta.version.length > 0;
}

/**
 * Compares lockfile against installed tree (pure function — DI for fs).
 *
 * @param {object} p
 * @param {object} p.lockJson           Parsed package-lock.json
 * @param {(relPath: string) => boolean} p.existsFn        `<pkgPath>/package.json` existence probe
 * @param {(relPath: string) => string|null} p.readVersionFn  Installed version reader
 * @returns {{scanned: number, unreadable: number, findings: Array<{kind: string, path: string, lock_version: string, installed_version: string|null}>}}
 */
export function checkInstalledTreeDrift({ lockJson, existsFn, readVersionFn }) {
  const packages = lockJson && typeof lockJson === 'object' ? lockJson.packages : null;
  const entries =
    packages && typeof packages === 'object' && !Array.isArray(packages)
      ? Object.entries(packages)
      : [];

  let scanned = 0;
  let unreadable = 0;
  const findings = [];

  for (const [path, meta] of entries) {
    if (!path.startsWith('node_modules/')) continue;
    if (!isComparable(meta)) continue;

    const manifest = `${path}/package.json`;
    if (!existsFn(manifest)) {
      if (meta.optional === true) continue;
      findings.push({
        kind: 'installed_missing',
        path,
        lock_version: meta.version,
        installed_version: null,
      });
      continue;
    }

    scanned += 1;
    const installed = readVersionFn(manifest);
    if (typeof installed !== 'string' || !installed) {
      unreadable += 1;
      continue;
    }
    if (installed !== meta.version) {
      findings.push({
        kind: 'installed_version_drift',
        path,
        lock_version: meta.version,
        installed_version: installed,
      });
    }
  }

  findings.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));
  return { scanned, unreadable, findings };
}

/** One-line human-readable summary of drift finding. */
export function describeDrift(f) {
  if (f.kind === 'installed_missing') {
    return `${f.path} — lockfile specifies ${f.lock_version} but installed package is missing`;
  }
  return `${f.path} — lockfile ${f.lock_version} vs installed ${f.installed_version}`;
}

/**
 * Remediation guidance text (SSOT). Names two scopes because a bare `npm ci` never converged:
 * run in a worktree without its own install, it shadows main's tree for that worktree only and
 * leaves the stale tree that hooks and every other worktree load in place. The confirmation
 * requirement names the target, not the spelling: a bare `npm ci` run from main empties the
 * shared tree exactly like the `--prefix` form does. `npm install` is offered first for the tree
 * itself because it does not empty it — npm ci alone left main drifted for 9 hours (2026-10-07)
 * since other sessions were always running.
 */
export const DRIFT_REMEDIATION =
  'Run `npm ci` in your own worktree, not main: that worktree then stops loading the shared tree (fixes that checkout only; required when this branch changes package-lock.json). ' +
  'To repair the tree itself while other sessions run, preview with `npm install --prefix <tree root> --dry-run` and, when it changes only the drifted packages, run it without --dry-run: it swaps only those packages, so a run loading one of them at that moment may fail once (package-lock.json must stay unchanged — check git status). ' +
  'Otherwise run `npm ci --prefix <tree root>`. npm ci empties node_modules first, so any npm ci aimed at that tree, a bare `npm ci` in main included, needs user confirmation with no other session running. ' +
  'If this is an intended change, update lockfile via `npm install` and commit. ' +
  'Passing tests in a drifted state does not provide valid evidence for CI (R-CM-010).';

/**
 * Why runInstalledTreeCheck skipped (fail-open). Exported so callers branch on the reason by identity
 * instead of re-typing the text (lib/toolchain.mjs tells "nothing installed" from "nothing to compare").
 */
export const TREE_SKIP = Object.freeze({
  NO_LOCKFILE: 'package-lock.json missing',
  LOCKFILE_UNREADABLE: 'package-lock.json read/parse failure',
  NOT_INSTALLED: 'Installed packages unresolved (pre-installation)',
  NOTHING_TO_COMPARE: '0 comparison targets',
});

/**
 * Checks installed tree drift — parses lockfile, resolves package installations, delegates pure determination.
 *
 * Both lockfile and installations are **relative to `cwd`** — lockfile is `<cwd>/package-lock.json`,
 * installations start upwards traversal from `cwd`. Since worktrees lack their own installations
 * and Node loads main repository's, pointing to different trees is expected and the delta is tested.
 *
 * Skip (fail-open, R-CM-006 Rule 2) conditions:
 *   - Missing lockfile → No baseline for comparison
 *   - Lockfile read/parse failure → Check 2 (lockfile drift) domain
 *   - 0 comparison targets → No basis for determination
 *   - **No packages resolved** → Pre-installation state. Since execution tree is absent,
 *     premise of "audit tree != execution tree" cannot hold. *Partial* installation is a violation, not skip —
 *     tests passing on partially installed trees are not valid evidence.
 *
 * @returns {{skipped: string|null, tree_roots: string[], scanned: number, unreadable: number, findings: Array}}
 */
export function runInstalledTreeCheck({
  existsFn = existsSync,
  readFn = (p) => readFileSync(p, 'utf-8'),
  cwd = process.cwd(),
} = {}) {
  // Caution: spreading `...empty` after fields overwrites with initial values — always spread first.
  const empty = { tree_roots: [], scanned: 0, unreadable: 0, findings: [] };
  const lockPath = join(cwd, 'package-lock.json');
  if (!existsFn(lockPath)) return { ...empty, skipped: TREE_SKIP.NO_LOCKFILE };

  let lockJson;
  try {
    lockJson = JSON.parse(readFn(lockPath));
  } catch {
    return { ...empty, skipped: TREE_SKIP.LOCKFILE_UNREADABLE };
  }

  // Cache resolution results — avoids duplicate exists/read calls for same manifest.
  const cache = new Map();
  // Diagnostic: Set of tree roots for actually resolved installations.
  const treeRoots = new Set();
  const find = (rel) => {
    if (!cache.has(rel)) {
      const abs = resolveInstalledManifest(cwd, rel, {
        existsFn,
        joinFn: join,
        dirnameFn: dirname,
      });
      cache.set(rel, abs);
      const relNative = rel.split('/').join(sep);
      if (abs && abs.endsWith(relNative)) {
        treeRoots.add(abs.slice(0, abs.length - relNative.length - 1));
      }
    }
    return cache.get(rel);
  };

  const result = checkInstalledTreeDrift({
    lockJson,
    existsFn: (rel) => find(rel) !== null,
    readVersionFn: (rel) => {
      try {
        const v = JSON.parse(readFn(find(rel))).version;
        return typeof v === 'string' ? v : null;
      } catch {
        return null; // Corrupted installation → unreadable counter
      }
    },
  });
  if (result.scanned === 0) {
    const reason = result.findings.length > 0 ? TREE_SKIP.NOT_INSTALLED : TREE_SKIP.NOTHING_TO_COMPARE;
    return { ...empty, skipped: reason };
  }
  return { ...result, tree_roots: [...treeRoots].sort(), skipped: null };
}
