#!/usr/bin/env node

/**
 * approval-trust.mjs — Auto-approval track record: escapes, demoted areas, prevention guards.
 *
 * Usage:
 *   node .claude/scripts/approval-trust.mjs status  [--json]   auto/human counts, escape rate, demoted areas
 *   node .claude/scripts/approval-trust.mjs scan    [--json]   status + persist newly detected escapes
 *   node .claude/scripts/approval-trust.mjs prevent --escape <id> --guard <path> --note "<what it catches>"
 *
 *   prevent — restores a demoted area. The guard (test / hook / audit) must be on origin/<base> and
 *             changed by the fix or after it. There is no dismiss (see lib/approval-trust.mjs).
 *
 * Reads the trunk's policy and ledger (main worktree), never a branch's — a branch cannot vouch for itself.
 * Exit codes: 0 ok / 1 usage or verification error.
 *
 * Boundary (R-CM-028): perspective1-only.
 */

import { execFileSync } from 'node:child_process';
import { readLedger } from '../../.cli/lib/ship-quality-ledger.mjs';
import { resolveShipBaseBranch } from '../../.cli/lib/ship-base-branch.mjs';
import { isDirectInvocation } from '../../.cli/lib/utils.mjs';
import { resolveMainRoot } from './mark-pre-ship-confirmed.mjs';
import { loadApprovalPolicy } from './lib/approval-policy.mjs';
import {
  approvalCounts,
  formatTrustStatus,
  loadTrust,
  saveTrustStore,
  trustState,
  verifyPreventionGuard,
} from './lib/approval-trust.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') out.json = true;
    else if (a.startsWith('--')) {
      out[a.slice(2)] = argv[i + 1];
      i += 1;
    } else out._.push(a);
  }
  return out;
}

const defaultGitIn = (cwd) => (args) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });

/**
 * Handles `prevent --escape <id> --guard <path> --note "<text>"`. Validates the escape id,
 * dedupes already-guarded escapes, requires a note, and verifies the guard before persisting.
 * @returns {number|null} exit code to return immediately, or null to continue to shared output.
 */
function runPreventCommand({ args, trust, policy, baseBranch, runGit, saveFn, write, writeErr, now }) {
  const escape = trust.store.escapes.find((e) => e.id === args.escape);
  if (!escape) {
    writeErr(`[approval-trust] unknown escape id: ${args.escape ?? '(missing --escape)'}\n`);
    return 1;
  }
  if (trust.store.preventions.some((p) => p.escape_id === escape.id)) {
    write(`${escape.id} already has a prevention guard — nothing to do\n`);
    return 0;
  }
  if (!args.note || !String(args.note).trim()) {
    writeErr('[approval-trust] --note is required: say what the guard catches, so the next reader can judge it\n');
    return 1;
  }
  const v = verifyPreventionGuard({ escape, guardPath: args.guard, policy, baseBranch, runGit });
  if (!v.ok) {
    writeErr(`[approval-trust] guard rejected: ${v.error}\n`);
    return 1;
  }
  trust.store.preventions.push({
    escape_id: escape.id,
    guard: String(args.guard).replace(/^\.\//, ''),
    guard_sha: v.guard_sha,
    note: String(args.note).trim(),
    at: now(),
  });
  saveFn(trust.storePath, trust.store);
  trust.state = trustState(trust.store);
  write(`Prevention registered for ${escape.id} (${args.guard} @ ${v.guard_sha.slice(0, 12)}).\n`);
  return null;
}

/**
 * Renders the shared status/scan/prevent output (JSON or human-readable) shown at the end of every command.
 */
function writeTrustSummary({ args, cmd, trust, ledger, write }) {
  const counts = approvalCounts(ledger);
  if (args.json) {
    write(`${JSON.stringify({ counts, ...trust.state, added: trust.added, persisted: cmd !== 'status' }, null, 2)}\n`);
  } else {
    write(`${formatTrustStatus({ counts, state: trust.state, added: trust.added })}\n`);
    if (cmd === 'status' && trust.added.length) write('(status does not persist — run `scan` to record them)\n');
  }
}

/**
 * Resolves policy, base branch, ledger, and trust state shared by every subcommand.
 * @returns {{ok: true, ctx: object}|{ok: false, exitCode: number}}
 */
function buildTrustContext({ args, deps, writeErr }) {
  const projectDir = deps.projectDir ?? args['project-dir'] ?? resolveMainRoot() ?? process.cwd();
  const { policy, error } = loadApprovalPolicy(projectDir);
  if (!policy) {
    writeErr(`[approval-trust] ${error}\n`);
    return { ok: false, exitCode: 1 };
  }
  const baseBranch = resolveShipBaseBranch(projectDir);
  const runGit = deps.runGit ?? defaultGitIn(projectDir);
  const ledger = (deps.readLedgerFn ?? readLedger)();
  const saveFn = deps.saveFn ?? saveTrustStore;
  try {
    const trust = loadTrust({ projectDir, baseBranch, ledger, policy, runGit, ...(deps.storePath ? { storePath: deps.storePath } : {}) });
    return { ok: true, ctx: { policy, baseBranch, runGit, ledger, saveFn, trust } };
  } catch (e) {
    writeErr(`[approval-trust] trust state unreadable: ${e?.message ?? e}\n`);
    return { ok: false, exitCode: 1 };
  }
}

/**
 * @param {string[]} argv
 * @param {{projectDir?: string, storePath?: string, runGit?: Function, readLedgerFn?: Function, saveFn?: Function, now?: () => string,
 *          write?: (s: string) => void, writeErr?: (s: string) => void}} [deps]
 */
export function main(argv, deps = {}) {
  const args = parseArgs(argv);
  const write = deps.write ?? ((s) => process.stdout.write(s));
  const writeErr = deps.writeErr ?? ((s) => process.stderr.write(s));
  const cmd = args._[0];
  if (!['status', 'scan', 'prevent'].includes(cmd)) {
    writeErr('usage: approval-trust.mjs status|scan [--json] | prevent --escape <id> --guard <path> --note "<text>"\n');
    return 1;
  }

  const built = buildTrustContext({ args, deps, writeErr });
  if (!built.ok) return built.exitCode;
  const { policy, baseBranch, runGit, ledger, saveFn, trust } = built.ctx;

  if (cmd === 'prevent') {
    const now = deps.now ?? (() => new Date().toISOString());
    const exitCode = runPreventCommand({ args, trust, policy, baseBranch, runGit, saveFn, write, writeErr, now });
    if (exitCode !== null) return exitCode;
  } else if (cmd === 'scan' && trust.added.length) {
    saveFn(trust.storePath, trust.store);
  }

  writeTrustSummary({ args, cmd, trust, ledger, write });
  return 0;
}

if (isDirectInvocation(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
