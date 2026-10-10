/**
 * wt-run-guards.mjs — replay the Bash PreToolUse hooks on the command wt-run is about to run (DEBT-455).
 *
 * The hooks only ever see `node .claude/scripts/wt-run.mjs <cmd>`; their anchors look for `git …` at
 * the start of a command or after a chain operator, so the wrapped command passed unchecked (measured
 * 2026-10-07: destructive-git-guard returned `{}` for a wrapped force push, deny for the same command
 * given directly). The fix is not a second guard implementation: the registration in
 * `.claude/settings.json` is the list, replayed with the payload Claude Code would have sent — a
 * hard-coded copy of that list is one that drifts the day a guard is added.
 *
 * Fail-closed: wt-run runs with no human in the loop, so a hook that cannot give a verdict (crash,
 * timeout, unparseable output) refuses rather than waves the command through. `ask` refuses too —
 * there is nobody to ask.
 */

import { spawnSync } from 'node:child_process';

const DEFAULT_TIMEOUT_SEC = 60;

// Variables that switch hooks off for a session. A wrapped command must not inherit them: the point
// of the replay is that wrapping is no way around a guard.
const HOOK_DISABLING_VARS = ['ECC_DISABLED_HOOKS', 'ECC_HOOK_PROFILE'];

// Claude Code reads a missing, empty or `*` matcher as "every tool"; anchoring those as a regex
// would match nothing (or throw) and drop the guard from the replay.
function matchesBash(matcher) {
  if (matcher === undefined || matcher === '' || matcher === '*') return true;
  try {
    return new RegExp(`^(?:${matcher})$`).test('Bash');
  } catch {
    return false;
  }
}

/**
 * Hook commands registered for PreToolUse on `Bash`, in registration order.
 *
 * Matchers are anchored the way Claude Code reads them (a matcher is a regex over the tool name), so
 * `BashOutput` does not count. The per-hook `if` filter is ignored on purpose: running a guard on a
 * command it would have skipped only costs time, while reimplementing the permission-rule syntax is
 * a second parser to keep in step.
 *
 * @returns {{ command: string, timeoutSec: number }[]}
 */
export function bashHookCommands(settings) {
  const out = [];
  for (const entry of settings?.hooks?.PreToolUse ?? []) {
    if (!matchesBash(entry.matcher)) continue;
    for (const h of entry.hooks ?? []) {
      if (h.type && h.type !== 'command') continue;
      if (typeof h.command !== 'string') continue;
      out.push({ command: h.command, timeoutSec: h.timeout ?? DEFAULT_TIMEOUT_SEC });
    }
  }
  return out;
}

export function hookEnvironment(env, projectDir) {
  const out = { ...env, CLAUDE_PROJECT_DIR: projectDir };
  for (const k of HOOK_DISABLING_VARS) delete out[k];
  return out;
}

// The stderr tail is the only trace of *why* a hook gave no verdict (a module that failed to load
// after a transplant, say); without it the refusal reads "exit 1" and nothing else.
function noVerdict(what, r) {
  const tail = (r.stderr || '').trim().split('\n').slice(-5).join('\n');
  return { allowed: false, reason: tail ? `no verdict (${what})\n${tail}` : `no verdict (${what})` };
}

function exitVerdict(r) {
  if (r.error || r.signal || r.status === null) return noVerdict('timeout or spawn failure', r);
  if (r.status === 2) return { allowed: false, reason: (r.stderr || '').trim() || 'exit 2' };
  if (r.status !== 0) return noVerdict(`exit ${r.status}`, r);
  return null;
}

function outputVerdict(stdout) {
  const text = (stdout || '').trim();
  if (!text) return { allowed: true };
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    return { allowed: false, reason: 'no verdict (output is not JSON)' };
  }
  const specific = out?.hookSpecificOutput ?? {};
  const decision = specific.permissionDecision;
  if (decision === 'deny' || decision === 'ask' || out?.decision === 'block') {
    return { allowed: false, reason: specific.permissionDecisionReason || out?.reason || decision || 'block' };
  }
  return { allowed: true };
}

const verdictOf = (r) => exitVerdict(r) ?? outputVerdict(r.stdout);

/**
 * @returns {{ allowed: true } | { allowed: false, hook: string, reason: string }}
 */
export function evaluateBashHooks({ command, cwd, projectDir, env, hooks, spawn = spawnSync }) {
  const input = JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
    cwd,
    session_id: env.CLAUDE_CODE_SESSION_ID,
  });
  const hookEnv = hookEnvironment(env, projectDir);
  for (const h of hooks) {
    const r = spawn(h.command, {
      input,
      cwd,
      env: hookEnv,
      shell: true,
      encoding: 'utf-8',
      timeout: h.timeoutSec * 1000,
    });
    const v = verdictOf(r);
    if (!v.allowed) return { allowed: false, hook: h.command, reason: v.reason };
  }
  return { allowed: true };
}
