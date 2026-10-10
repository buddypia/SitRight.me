#!/usr/bin/env node

/**
 * pre-ship-steps.mjs — Pre-ship review step verification CLI (one step at a time).
 *
 * Why: Establishes a deterministic sequential checklist for pre-ship prerequisites,
 * outputting only the **next single step** to prevent assumption leaps.
 * Determination logic SSOT: `lib/pre-ship-steps.mjs`.
 *
 * Usage:
 *   node .claude/scripts/pre-ship-steps.mjs next   --worktree .worktrees/<branch> [--json]
 *   node .claude/scripts/pre-ship-steps.mjs check  --worktree .worktrees/<branch> [--json]
 *   node .claude/scripts/pre-ship-steps.mjs answer --worktree .worktrees/<branch> \
 *        --step <id> --value "<actual human response>"   (--answer accepted as alias)
 *
 *   next   — Output only the **next single step** to process (READY if all pass)
 *   check  — Full step table overview
 *   answer — Record human response. Allowed only for the **current active step**
 *
 * Exit codes: 0 Success (including READY) / 1 Argument/path error / 2 Incomplete steps remaining (next/check)
 *
 * Boundary (R-CM-028): perspective1-only.
 */

import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inferBranchFromWorktreePath } from '../../.cli/lib/worktree-plan-path.mjs';
import { resolveMainRepoRoot } from '../../.cli/lib/worktree-path.mjs';
import { formatStreakWarning } from '../../.cli/lib/ship-quality-ledger.mjs';
import { resolveMainRoot } from './mark-pre-ship-confirmed.mjs';
import {
  STEP_STATUS,
  evaluateSteps,
  formatTrunkCensusLine,
  recordAnswer,
} from './lib/pre-ship-steps.mjs';

const STATUS_MARK = {
  [STEP_STATUS.OK]: 'PASS',
  [STEP_STATUS.BLOCKED]: 'BLOCKED',
  [STEP_STATUS.WARN]: 'WARN',
  [STEP_STATUS.NA]: 'N/A',
  [STEP_STATUS.AWAITING]: 'AWAITING',
};

/** Parses `--key value` arguments. */
export function parseArgs(argv) {
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

/**
 * Resolves worktree argument to {worktreeAbs, branch, projectDir}.
 *
 * projectDir is the repo owning the worktree, not the cwd repo: run from another checkout, the cwd
 * repo's approval-policy and answers were read and an unreviewed target diff came out Auto-approved.
 */
export function resolveTarget(rawWorktree, mainRoot, { existsFn = existsSync } = {}) {
  if (!rawWorktree) return { error: '--worktree <path> is required' };
  const worktreeAbs = isAbsolute(rawWorktree) ? resolve(rawWorktree) : resolve(join(mainRoot, rawWorktree));
  if (!existsFn(worktreeAbs)) return { error: `worktree path does not exist: ${worktreeAbs}` };
  const branch = inferBranchFromWorktreePath(worktreeAbs);
  if (!branch) return { error: `cannot infer branch from worktree path: ${worktreeAbs}` };
  return { worktreeAbs, branch, projectDir: resolveMainRepoRoot(worktreeAbs) || mainRoot };
}

/** Formats a single step into human-readable text. */
export function formatStep(step) {
  const lines = [
    `[${step.index}/${step.total}] ${step.title}`,
    `  Verdict: ${STATUS_MARK[step.status] ?? step.status}${step.kind === 'human' ? ' (human judgement)' : ' (machine check)'}`,
    `  Evidence: ${step.evidence || '(none)'}`,
  ];
  if (step.remedy) lines.push(`  Remedy: ${step.remedy}`);
  if (step.kind === 'human' && step.status === STEP_STATUS.AWAITING) {
    lines.push('', `  Question: ${step.question}`);
    lines.push(
      '  Record: node .claude/scripts/pre-ship-steps.mjs answer --worktree <path> ' +
        `--step ${step.id} --value "<actual human response>"`,
    );
  }
  return lines.join('\n');
}

/**
 * Formats cross-review streak advisory warning.
 */
export function formatStreakAdvisory(crossReview) {
  if (!crossReview?.counted) return null;
  return formatStreakWarning(crossReview, { projected: true });
}

function formatTable(steps) {
  return steps
    .map(
      (s) =>
        `  ${String(s.index).padStart(2)}. [${(STATUS_MARK[s.status] ?? s.status).padEnd(4)}] ${s.title}` +
        `\n        ${s.evidence || '(none)'}`,
    )
    .join('\n');
}

/**
 * Resolves the human response for `answer`, accepting `--answer` alongside `--value`.
 *
 * The subcommand is named `answer`, so callers reach for `--answer` — the CLI's own vocabulary
 * produces the wrong flag. Measured 2026-09-02: `--answer '승인'` was silently absorbed by
 * `parseArgs` (it accepts any `--key`), leaving `--value` undefined, and the resulting message said
 * "Answer is empty" — which points at the human's response, not at the flag. Nothing was
 * mis-recorded (the miss fails safe), but the misdirection cost a round trip mid-ship.
 *
 * Aligning the vocabulary here is cheaper than a flag whitelist and carries no upkeep: this repo has
 * 41 hand-rolled argument parsers that are near-all distinct implementations, so a shared validator
 * would have to re-verify 39 separate CLI contracts to buy back one round trip.
 *
 * `--value` wins on conflict — it is the documented flag, so a caller passing both meant that one.
 */
export function resolveAnswerValue(args) {
  return args?.value ?? args?.answer;
}

function main(argv) {
  const command = argv[0];
  const args = parseArgs(argv.slice(1));
  const mainRoot = resolveMainRoot();
  if (!mainRoot) {
    process.stderr.write('[pre-ship-steps] git repository not found\n');
    return 1;
  }
  if (!['next', 'check', 'answer'].includes(command)) {
    process.stderr.write(
      '[pre-ship-steps] Usage: pre-ship-steps.mjs <next|check|answer> --worktree <path> [--json]\n',
    );
    return 1;
  }

  const target = resolveTarget(args.worktree, mainRoot);
  if (target.error) {
    process.stderr.write(`[pre-ship-steps] ${target.error}\n`);
    return 1;
  }
  const base = { worktreeAbs: target.worktreeAbs, branch: target.branch, projectDir: target.projectDir };

  if (command === 'answer') {
    const value = resolveAnswerValue(args);
    if (value === undefined) {
      process.stderr.write(
        '[pre-ship-steps] answer requires --value "<human response>" (alias: --answer)\n',
      );
      return 1;
    }
    const res = recordAnswer({ ...base, stepId: args.step, value });
    if (!res.ok) {
      process.stderr.write(`[pre-ship-steps] Record answer rejected: ${res.error}\n`);
      return 1;
    }
    process.stdout.write(`[pre-ship-steps] "${args.step}" answer recorded → ${res.path}\n`);
    return emit('next', evaluateSteps(base), args, base);
  }

  return emit(command, evaluateSteps(base), args, base);
}

/** Machine-readable rendering — `next` and `check` differ only in which slot they fill. */
function renderJson(command, state, base) {
  return (
    JSON.stringify(
      {
        ok: true,
        ready: state.ready,
        branch: base.branch,
        head_sha: state.headSha,
        review_diff_id: state.reviewDiffId ?? null,
        scale: state.scale?.scale ?? null,
        cross_review: state.crossReview ?? null,
        next: command === 'next' ? state.next : undefined,
        steps: command === 'check' ? state.steps : undefined,
      },
      null,
      2,
    ) + '\n'
  );
}

/**
 * Output emitter + exit code handler.
 */
export function emit(command, state, args, base, writeFn = (s) => process.stdout.write(s)) {
  if (args.json) {
    writeFn(renderJson(command, state, base));
    return state.ready ? 0 : 2;
  }

  const header = `Pre-Ship Step Verification — ${base.branch} (HEAD ${String(state.headSha ?? '?').slice(0, 8)})`;
  const chunks = [];
  if (command === 'check') chunks.push(`${header}\n${formatTable(state.steps)}\n`);
  if (state.ready) {
    chunks.push(
      '\nREADY — All steps passed. Marker can now be created to proceed with ship.\n' +
        `  node .claude/scripts/mark-pre-ship-confirmed.mjs ${base.worktreeAbs} --quality <label>\n` +
        '  Run ship-worktree in a separate Bash call after the marker exists — hooks check the marker\n' +
        '  when a command starts, so `mark … && ship …` in one call is denied.\n',
    );
  } else if (command === 'next') {
    chunks.push(
      `${header}\n\n${formatStep(state.next)}\n\nApproval choices: ${state.approvalChoices.join(' / ')}\n`,
    );
  } else {
    chunks.push(`\nNext step: [${state.next.index}/${state.next.total}] ${state.next.title}\n`);
  }

  for (const w of state.settingsWarnings ?? []) chunks.push(`\n[config] ${w}\n`);
  // Rendered on every human-readable panel: the census is about the repository, not this ship's step.
  chunks.push(`\n${formatTrunkCensusLine(state.crossReview)}\n`);

  const advisory = formatStreakAdvisory(state.crossReview);
  if (advisory) chunks.push(`\n[Cross-Review Skip Streak Warning] ${advisory}\n`);

  writeFn(chunks.join(''));
  return state.ready ? 0 : 2;
}

export function isMainModule(moduleUrl, argv1) {
  return moduleUrl === pathToFileURL(argv1 ?? '').href;
}

if (isMainModule(import.meta.url, process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
