#!/usr/bin/env node
/**
 * wt-run.mjs — Redirect command execution to the active worktree.
 *
 * Automatically locates the active worktree and executes verification/check
 * commands inside it when the AI session CWD resets to the main repository root.
 */

import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { constants } from 'node:os';
import { resolve, join, dirname, relative, sep } from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bashHookCommands, evaluateBashHooks } from './lib/wt-run-guards.mjs';
import { readOwnerLease } from '../../.cli/lib/worktree-owner-lease.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

function parseArgs(args) {
  let worktree = null;
  const cmdArgs = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--worktree' || arg === '-w') {
      worktree = args[++i] || null;
    } else {
      cmdArgs.push(arg);
    }
  }

  return { worktree, cmdArgs };
}

/**
 * Is `p` the repository root or somewhere beneath it?
 *
 * `resolve()` follows `..` without complaint, so `--worktree ../../other-project` used to hand an
 * arbitrary cwd to `spawnSync(cmd, {shell: true})` — wt-run exists to run verification *inside* the
 * worktree (R-CM-034 Rule 10), and a target outside the repo voids that whole premise.
 *
 * Three details the obvious one-liner gets wrong:
 *   - Compared with a trailing separator, not `startsWith(REPO_ROOT)`: the bare prefix test also
 *     accepts the sibling `<repo>-evil`.
 *   - Resolved through `realpathSync` first: a symlink *inside* the repo may point outside it, and
 *     the lexical path alone says nothing about where the command would actually run (measured —
 *     `.tmp/<link→/tmp/x>` passed and `pwd` printed `/private/tmp/...`).
 *   - `REPO_ROOT` is already real: Node resolves module paths through the filesystem, so the two
 *     sides of the comparison are canonicalized the same way (this is what makes macOS
 *     `/tmp`→`/private/tmp` a non-issue rather than a false rejection).
 *
 * A path that does not exist yet cannot be canonicalized and is judged lexically; `resolveActiveWorktree`
 * refuses it right after, so the weaker answer costs nothing.
 */
function isInsideRepo(p) {
  let real = p;
  try {
    real = realpathSync(p);
  } catch {
    // Does not exist — fall back to the lexical form.
  }
  return real === REPO_ROOT || real.startsWith(REPO_ROOT + sep);
}

/** Worktrees under `.worktrees/`, in `git worktree list` order. Empty when git fails. */
function listWorktrees() {
  try {
    const stdout = execSync('git worktree list --porcelain', { cwd: REPO_ROOT, encoding: 'utf-8' });
    return stdout
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length).trim())
      .filter((p) => p.includes('/.worktrees/'));
  } catch {
    return [];
  }
}

/**
 * Which worktree did we pick, and where did the value come from?
 *
 * Source selection only — deliberately no validation here. Containment is enforced once, at the single
 * point where these branches rejoin (`resolveActiveWorktree`), because a check attached per branch is a
 * check the next source will be added without.
 *
 * Never guesses between several worktrees. This used to warn and take the first one in
 * `git worktree list`; with several AI sessions each in its own worktree, the first one usually
 * belongs to another session, and `make wt.run` from main ran build, test and commit in a worktree the
 * caller had never seen (design-lookbook, 2026-10-22). So the order runs from the most specific clue
 * to the least, and with several worktrees and no clue the caller is asked to name one.
 *
 * - A copy inside a worktree (`<wt>/.claude/scripts/wt-run.mjs`) makes REPO_ROOT that worktree, and
 *   the caller meant that one. Picking from the list instead chose a sibling, which containment then
 *   rejected as "outside the repository".
 * - The owner lease (R-CM-036) is the one record that ties a worktree to a session. Only a fresh lease
 *   counts, and only when exactly one worktree holds it: an expired lease may be taken over by
 *   anyone, and two leases say nothing about which one is meant — so two of them refuse instead of
 *   falling through to a weaker clue.
 * - CONTEXT.json is a single file on main, so it cannot tell sessions apart; it comes after the lease.
 * - The lease also says whose a worktree is *not*: CONTEXT.json or the only worktree is skipped while
 *   another session holds a fresh lease on it.
 *
 * Only Claude Code puts its session id in the shell environment (`CLAUDE_CODE_SESSION_ID`, the hook
 * payload's `session_id`). Without it no lease can be read as "mine" or "someone else's", so the
 * lease steps are skipped and several worktrees need `--worktree`.
 *
 * @returns {{ raw: string, source: string } | { ambiguous: string[] } | null}
 */
function pickWorktree(explicitWt) {
  if (explicitWt) return { raw: explicitWt, source: '--worktree' };

  if (REPO_ROOT.includes(`${sep}.worktrees${sep}`)) {
    return { raw: REPO_ROOT, source: 'the worktree wt-run was started from' };
  }

  const wtPaths = listWorktrees();

  const session = process.env.CLAUDE_CODE_SESSION_ID;
  if (session) {
    const owned = wtPaths.filter((p) => {
      const lease = readOwnerLease(p);
      return lease.fresh && lease.owner === session;
    });
    if (owned.length === 1) return { raw: owned[0], source: 'owner lease of this session' };
    if (owned.length > 1) return { ambiguous: owned };
  }

  const ctxRaw = contextWorktree();
  if (ctxRaw && !heldByOtherSession(resolve(REPO_ROOT, ctxRaw), session)) {
    return { raw: ctxRaw, source: 'CONTEXT.json#execution.worktree.worktree_path' };
  }

  if (wtPaths.length === 1 && !heldByOtherSession(wtPaths[0], session)) {
    return { raw: wtPaths[0], source: 'git worktree list' };
  }
  if (wtPaths.length > 0) return { ambiguous: wtPaths };
  return null;
}

function contextWorktree() {
  const ctxPath = join(REPO_ROOT, 'CONTEXT.json');
  if (!existsSync(ctxPath)) return null;
  try {
    return JSON.parse(readFileSync(ctxPath, 'utf-8')).execution?.worktree?.worktree_path || null;
  } catch {
    return null;
  }
}

/** A path outside the repo is never skipped here: it goes on to the containment check, which refuses it. */
function heldByOtherSession(wt, session) {
  if (!session || !isInsideRepo(wt)) return false;
  const lease = readOwnerLease(wt);
  return lease.fresh && lease.owner !== session;
}

function resolveActiveWorktree(explicitWt) {
  const picked = pickWorktree(explicitWt);
  if (!picked) return null;
  if (picked.ambiguous) {
    const session = process.env.CLAUDE_CODE_SESSION_ID;
    console.error(
      `❌ wt-run: cannot tell which worktree is yours — name it:\n` +
        `   make wt.run WT=.worktrees/<branch> CMD="<command>"   (or wt-run.mjs --worktree <path>)\n` +
        picked.ambiguous
          .map((p) => {
            const note = heldByOtherSession(p, session) ? "   (another session's lease)" : '';
            return `   · ${relative(REPO_ROOT, p)}${note}`;
          })
          .join('\n'),
    );
    process.exit(2);
  }

  const target = resolve(REPO_ROOT, picked.raw);
  if (!isInsideRepo(target)) {
    console.error(
      `❌ wt-run: the target worktree must stay inside the repository.\n` +
        `   source:      ${picked.source}\n` +
        `   given:       ${picked.raw}\n` +
        `   resolved to: ${target}\n` +
        `   repo root:   ${REPO_ROOT}`,
    );
    process.exit(2);
  }
  // Checked here, before the Bash guards: they spawn each hook with this cwd, so a missing directory
  // came back as "refused by <hook> — no verdict", which sends the reader after the wrong hook.
  const unusable = whyNotDirectory(target);
  if (unusable) {
    console.error(
      `❌ wt-run: the target worktree ${unusable}.\n` +
        `   source:      ${picked.source}\n` +
        `   given:       ${picked.raw}\n` +
        `   resolved to: ${target}\n` +
        `   a relative path is resolved from the repo root: ${REPO_ROOT}`,
    );
    process.exit(2);
  }
  return target;
}

/** null for a directory; otherwise the reason, so an unreadable parent is not reported as "does not exist". */
function whyNotDirectory(p) {
  try {
    return statSync(p).isDirectory() ? null : 'is not a directory';
  } catch (err) {
    // ENOTDIR: a parent component is a file (`a-file/x`), so the path does not exist either.
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return 'does not exist';
    return `cannot be read (${err.code || err.message})`;
  }
}

const { worktree: explicitWt, cmdArgs } = parseArgs(process.argv.slice(2));

if (cmdArgs.length === 0) {
  console.error('❌ wt-run: Command required. Example: node .claude/scripts/wt-run.mjs npm run test');
  process.exit(2);
}

const active = resolveActiveWorktree(explicitWt);
const targetCwd = active || REPO_ROOT;

// Not `targetCwd === REPO_ROOT`: started from a worktree's own copy, REPO_ROOT is that worktree.
if (!active) {
  console.warn(`[wt-run] Warning: No active worktree found. Executing at main repository root (${targetCwd}).`);
} else {
  console.log(`[wt-run] CWD redirection: ${targetCwd}`);
}

const cmdString = cmdArgs.join(' ');

// The hooks only saw `wt-run.mjs <cmd>`; the wrapped command gets the same Bash guards here
// (DEBT-455 — rationale in lib/wt-run-guards.mjs). An unreadable registration refuses: no list, no check.
let hooks;
try {
  hooks = bashHookCommands(JSON.parse(readFileSync(join(REPO_ROOT, '.claude', 'settings.json'), 'utf-8')));
} catch (err) {
  console.error(`❌ wt-run: cannot read the Bash hook registration (.claude/settings.json): ${err.message}`);
  process.exit(2);
}
const verdict = evaluateBashHooks({
  command: cmdString,
  cwd: targetCwd,
  projectDir: REPO_ROOT,
  env: process.env,
  hooks,
});
if (!verdict.allowed) {
  console.error(`❌ wt-run: refused by ${verdict.hook}\n${verdict.reason}`);
  process.exit(2);
}

console.log(`[wt-run] Executing command: ${cmdString}`);

const child = spawnSync(cmdString, {
  cwd: targetCwd,
  stdio: 'inherit',
  shell: true,
});

// `status` is null both when the command never started and when a signal killed it; `?? 0` reported
// both as success, and a wrapped build or test that never ran read as a pass. A signal exits 128+n,
// as the shell would have.
if (child.error) {
  console.error(`❌ wt-run: could not run the command: ${child.error.message}`);
  process.exit(2);
}
if (child.signal) {
  console.error(`❌ wt-run: the command was killed by ${child.signal}`);
  process.exit(128 + (constants.signals[child.signal] ?? 0));
}
process.exit(child.status);
