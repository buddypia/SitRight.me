/**
 * edited-files.mjs — Files an Edit/Write/MultiEdit (Claude) or apply_patch (Codex) call just touched (pure lib SSOT)
 *
 * Shared by the PostToolUse checks that re-read a file after it was written (agent-harness-check,
 * scene-backdrop-guard). R-CM-037 Rule 5: hooks never import each other, they share this library.
 *
 * Each file is resolved to the checkout that owns it (`git rev-parse --show-toplevel` from the file's
 * nearest existing directory), not to the session cwd: a session started in the main checkout may edit
 * a worktree, and the rules must be checked against the tree the file lives in.
 */

import { existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { safeGit } from './utils.mjs';
import { extractApplyPatchFilePaths } from './apply-patch-paths.mjs';

function findCheckoutRootFast(startDir) {
  let cur = startDir;
  while (true) {
    if (existsSync(join(cur, '.git'))) {
      try {
        return realpathSync(cur);
      } catch {
        return cur;
      }
    }
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

/**
 * @param {object} data - normalized hook payload (`tool_input.file_path` / `tool_input.command`)
 * @param {(args: string, cwd: string, opts?: object) => string|null} [gitFn]
 * @returns {{abs: string, root: string, rel: string}[]} rel uses `/` separators
 */
export function editedFiles(data, gitFn = safeGit) {
  const input = data?.tool_input || {};
  const cwd = typeof data?.cwd === 'string' && data.cwd ? data.cwd : process.cwd();
  const paths = extractApplyPatchFilePaths(input.command, cwd);
  if (typeof input.file_path === 'string' && input.file_path) {
    paths.push(isAbsolute(input.file_path) ? input.file_path : resolve(cwd, input.file_path));
  }

  const roots = new Map();
  const files = [];
  for (const abs of new Set(paths)) {
    let dir = dirname(abs);
    while (!existsSync(dir) && dirname(dir) !== dir) dir = dirname(dir);
    if (!roots.has(dir)) {
      const fastRoot = gitFn === safeGit ? findCheckoutRootFast(dir) : null;
      roots.set(
        dir,
        fastRoot || String(gitFn('rev-parse --show-toplevel', dir, { timeout: 2000 }) || '').trim(),
      );
    }
    const root = roots.get(dir);
    if (!root) continue;
    // git prints the resolved path; compare against the file's resolved path too, or a checkout reached
    // through a symlink (/tmp → /private/tmp, a symlinked ~/dev) yields `../…` and every file is skipped.
    const rel = relative(root, join(realpathSync(dir), relative(dir, abs)));
    if (!rel || rel.startsWith('..')) continue;
    files.push({ abs, root, rel: rel.split(sep).join('/') });
  }
  return files;
}
