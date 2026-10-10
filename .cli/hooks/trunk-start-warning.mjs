#!/usr/bin/env node

/**
 * trunk-start-warning.mjs - SessionStart Hook
 *
 * Injects worktree guidance context when starting an AI session on trunk branches (main/master).
 *
 * Conforms to R-CM-006 Rule 1: SessionStart is a side-effect-only event and cannot block
 * the session flow directly (Claude Code Hooks spec).
 * Thus, this hook injects additionalContext rather than denying/blocking.
 *
 * Destructive operations (direct commits on main / branch creations / force pushes) are
 * blocked at PreToolUse by commit-guard, branch-create-guard, and destructive-git-guard.
 *
 * Bypass conditions:
 *   - `ALLOW_MAIN_SESSION=1` environment variable set
 *   - Current branch is not trunk (main/master) — with opt-in `enforce_worktree_all_branches: true`
 *     (worktree-policy.json) every branch of the non-worktree checkout warns
 *   - The session cwd is inside a worktree the guards also recognise (`isSessionInWorktree`: a git
 *     linked worktree under `.worktrees/`). `resolveProjectDir` strips `/.worktrees/…`, so the branch
 *     read above is the *root* checkout's; without this check a session started in
 *     `.worktrees/feature/x` was told it runs on main. A linked worktree elsewhere is not exempt,
 *     because commit-guard / worktree-policy-guard do not exempt it either.
 *
 * Trunk branch evaluation via `.cli/lib/trunk-branch.mjs` SSOT.
 */

import {
  readStdin,
  output,
  safeHookMainWithProfile,
  safeGit,
  resolveProjectDir,
} from '../lib/utils.mjs';
import { HookOutput } from '../lib/hook-output.mjs';
import { loadWorktreePolicy, requiresWorktree } from '../lib/trunk-branch.mjs';
import { resolveWorktreeRoot } from '../lib/worktree-path.mjs';

/**
 * Is the session in a worktree the guards also treat as one? Both must hold:
 *   - under `.worktrees/` (`resolveWorktreeRoot`) — what commit-guard and worktree-policy-guard
 *     recognise, so the warning never goes silent where they still block;
 *   - a real git linked worktree — `--git-dir` is `<common>/worktrees/<name>` there and equals
 *     `--git-common-dir` in the main checkout, so a plain directory named `.worktrees/x` is not one.
 * Any git failure (not a repo, timeout) answers false, i.e. the warning stays.
 * @param {string} dir
 * @param {(args: string, cwd: string, opts?: object) => string|null} [gitFn]
 * @returns {boolean}
 */
export function isSessionInWorktree(dir, gitFn = safeGit) {
  if (!resolveWorktreeRoot(dir)) return false;
  const out = gitFn('rev-parse --path-format=absolute --git-dir --git-common-dir', dir, { timeout: 2000 });
  const [gitDir, commonDir] = String(out || '').trim().split('\n');
  return Boolean(gitDir && commonDir) && gitDir.trim() !== commonDir.trim();
}

export async function run(data) {
  try {
    const projectDir = resolveProjectDir(data);
    const branch = safeGit('branch --show-current', projectDir, { timeout: 2000 });

    if (!branch) return HookOutput.passthrough();
    if (!requiresWorktree(branch, loadWorktreePolicy(projectDir))) return HookOutput.passthrough();

    // Bypass check
    if (process.env.ALLOW_MAIN_SESSION === '1' || process.env.ALLOW_MAIN_SESSION === 'true') {
      return HookOutput.passthrough();
    }
    if (isSessionInWorktree(data?.cwd || process.cwd())) return HookOutput.passthrough();

    const warningMessage =
      `[Trunk Warning] AI session is running on the ${branch} branch.\n\n` +
      `AI work is standardized to occur within isolated Git worktrees.\n` +
      `Direct commits on ${branch} / new branch creations / force pushes are blocked by dedicated guards.\n\n` +
      `→ Create worktree:\n` +
      `    make wt.new BR=feature/<task>\n\n` +
      `→ Suppress this warning (for read-only exploration, etc.):\n` +
      `    Set ALLOW_MAIN_SESSION=1 environment variable to hide this reminder`;

    return HookOutput.context(warningMessage, 'SessionStart');
  } catch (_) {
    return HookOutput.passthrough();
  }
}

if (!globalThis.__HOOK_ORCHESTRATOR__) {
  safeHookMainWithProfile('trunk-start-warning', async () => {
    const data = await readStdin();
    return output(await run(data));
  });
}
