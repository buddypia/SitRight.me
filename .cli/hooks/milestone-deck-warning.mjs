#!/usr/bin/env node

/**
 * milestone-deck-warning.mjs — PostToolUse Hook (advisory, strictly non-blocking). Two trigger points:
 *
 *   ① **Edit-time** (Write|Edit) — The moment the worktree's real diff reaches the large threshold
 *      (merge-base → working tree: committed + staged + unstaged + untracked, measured with git — never estimated
 *      from the tool payload, which over-counts small edits inside big payloads and never sees reverts or scripts).
 *   ② **Commit-time** (Bash `git commit`) — Measures cumulative worktree diff via git (`<base>...HEAD`).
 *
 * In either case, if large threshold is reached + CP-MILESTONE review deck traces are 0 + ship deck is 0,
 * sends a 1-time reminder via additionalContext (shared one-shot marker prevents duplicate firing).
 * Suppression is evaluated first, so once the marker exists an edit event spawns no git process at all.
 *
 * **Obligation Promotion (Root resolution)**: Simultaneously plants the obligation as unchecked checkboxes
 * in the dedicated section of worktree PLAN.md (`plan-obligation.mjs`). While reminder strings vanish after the turn,
 * PLAN.md persists, caught on both sides by Stop hooks (`worktree-shipping-guard` planBlocked) and `create-pr verify-plan` —
 * connecting to existing gates **without creating new blocking points**.
 * To waive, append `(dropped: reason)` to the line: silent omission becomes a *recorded decision*.
 * Empirical rationale: Across #1050, #1054, #1056, #1057, and #1063 (5 consecutive large ships), decks were 0; in #1063,
 * quality-gate PROOF was missed through the same volatile mechanism.
 *
 * Boundary (R-CM-028): Perspective 1 only — brief2dev internal worktree workflow (R-CM-030/034 are never_deploy).
 * Not distributed to scaffold targets.
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { readStdin, output, safeHookMainWithProfile, resolveProjectDir } from '../lib/utils.mjs';
import { HookOutput } from '../lib/hook-output.mjs';
import {
  safeBranchKey,
  inferBranchFromWorktreePath,
  resolveMilestoneReminderPath,
  resolveWorktreePlanPath,
} from '../lib/worktree-plan-path.mjs';
// Volatile reminder → PLAN.md checkbox obligation promotion SSOT.
import { plantObligations } from '../lib/plan-obligation.mjs';
// Commit detection / attribution SSOT (shared with worktree-session-owner-guard).
import { commitTargets } from '../lib/git-commit-target.mjs';
// Worktree root evaluation SSOT (R-CM-037).
import { resolveMainRepoRoot, resolveWorktreeRoot } from '../lib/worktree-path.mjs';
import {
  defaultGit,
  measureShipScale,
  measureWorktreeScale,
  hasMilestoneDeckTrace,
  shipDeckIndexPath,
} from '../lib/ship-scale.mjs';

/** Edit-time target tools — same set as the `milestone-deck-warning-edit` registry matcher (a test compares them). */
export const EDIT_TOOLS = new Set(['Write', 'Edit']);

/**
 * Extracts target worktree context from commit commands — composition of 2 existing SSOTs:
 *   commitTargets → Directories the commit may land in (advisory: the first worktree among them)
 *   resolveWorktreeRoot → Normalizes deep cwd / relative -C to worktree root
 * @returns {{worktreeAbs:string, branch:string}|null} null on non-targets (silently skipped)
 */
export function extractCommitWorktree(command, cwd, projectDir) {
  const cwdStr = typeof cwd === 'string' && cwd ? cwd : null;
  const targets = commitTargets(command, cwdStr || projectDir);
  // Non-worktree targets (main repo) are commit-guard territory.
  const worktreeAbs = targets?.bases.map((dir) => resolveWorktreeRoot(dir)).find(Boolean);
  if (!worktreeAbs) return null;
  const branch = inferBranchFromWorktreePath(worktreeAbs);
  if (!branch) return null;
  return { worktreeAbs, branch };
}

/**
 * List of obligations planted in PLAN.md upon reaching large threshold (SSOT).
 */
export const LARGE_SCALE_OBLIGATIONS = [
  {
    id: 'cp-milestone-deck',
    text:
      'Create CP-MILESTONE mid-implementation review deck — ' +
      '`node .claude/scripts/review-deck.mjs --stage milestone` (R-CM-030 Rule 12)',
  },
  {
    id: 'quality-gate-proof',
    text:
      'Record Pre-Ship Quality Gate evaluation PROOF — ' +
      "`node .claude/scripts/record-quality-gate.mjs <branch> --json '<record>'` (R-CM-030 Rule 8)",
  },
];

/**
 * Evaluates suppression conditions (shared across both trigger paths).
 * @returns {{suppressed: boolean, markerAbs: string, planAbs: string}}
 */
function checkSuppressed({ worktreeAbs, branch, projectDir, existsFn, readdirFn }) {
  const key = safeBranchKey(branch);
  const markerAbs = resolveMilestoneReminderPath(worktreeAbs, branch);
  const planAbs = resolveWorktreePlanPath(worktreeAbs, branch);
  // The deck CLIs write under the repo that owns the worktree — not the session repo when it is another repo's.
  const deckRoot = resolveMainRepoRoot(worktreeAbs) || projectDir;
  const suppressed =
    existsFn(markerAbs) || // One-shot — already reminded
    hasMilestoneDeckTrace(deckRoot, key, { existsFn, readdirFn }) ||
    existsFn(shipDeckIndexPath(deckRoot, key)); // Already in ship deck phase
  return { suppressed, markerAbs, planAbs };
}

/** Reminder message (shared across both paths — only origin differs). */
function buildReminderMessage(reason, origin) {
  return [
    `[milestone-deck-warning] ${origin} reached large-scale threshold (${reason}).`,
    'Time for mid-implementation visual review (CP-MILESTONE) — if this milestone is complete:',
    '  node .claude/scripts/review-deck.mjs --stage milestone',
    '(R-CM-030 Rule 12 Stage Generalization — 1-time advisory, non-blocking. Separate from ship deck obligation.)',
  ].join('\n');
}

/**
 * Converts obligation promotion result to text appended after reminder.
 */
export function formatObligationNote(plan) {
  if (plan?.planted) {
    return [
      '',
      `Planted the above obligations as checkboxes in PLAN.md (${plan.added.join(', ')}).`,
      'If left incomplete, Stop hooks and ship PLAN verification will catch them — if not applicable,',
      'append `(dropped: reason)` to the end of that line to explicitly waive (do not simply delete and skip).',
    ].join('\n');
  }
  if (plan?.reason === 'already_present') return '\n(Obligation checkboxes are already present in PLAN.md.)';
  if (plan?.reason === 'plan_absent') {
    return '\n(Could not plant obligations because PLAN.md is missing — add manually after authoring PLAN.md.)';
  }
  return '\n(Failed to record obligation checkboxes — add manually to PLAN.md.)';
}

/**
 * ① Edit-time evaluation — fires the moment the worktree's real diff reaches the large threshold
 * (the DEBT-248 trigger, now measured instead of estimated).
 *
 * PostToolUse runs after the edit landed on disk, so git already sees it. Suppression is evaluated
 * before any measurement: this runs on every edit until the one-shot marker exists (which is
 * the common case for the rest of the worktree's life), and a measurement costs ~4 git spawns.
 *
 * @returns {{markerAbs:string, message:string}|null} null = firing conditions not met or unmeasurable (silently skipped)
 */
export function evaluateEditReminder({
  toolName,
  toolInput,
  projectDir,
  gitFn = defaultGit,
  existsFn = existsSync,
  readdirFn = readdirSync,
}) {
  if (!EDIT_TOOLS.has(toolName)) return null;
  const filePath = toolInput?.file_path;
  if (typeof filePath !== 'string' || !filePath || !isAbsolute(filePath)) return null;
  const worktreeAbs = resolveWorktreeRoot(dirname(filePath));
  if (!worktreeAbs) return null; // Main repo edit, etc. — worktree-policy-guard territory
  const branch = inferBranchFromWorktreePath(worktreeAbs);
  if (!branch) return null;

  const { suppressed, markerAbs, planAbs } = checkSuppressed({
    worktreeAbs,
    branch,
    projectDir,
    existsFn,
    readdirFn,
  });
  if (suppressed) return null;

  const scale = measureWorktreeScale(worktreeAbs, gitFn);
  if (scale?.scale !== 'large') return null; // Sub-large or unevaluable (fail-open)
  return {
    markerAbs,
    planAbs,
    message: buildReminderMessage(
      scale.reason,
      `Worktree changes against ${scale.base} (committed + uncommitted + untracked)`,
    ),
  };
}

/**
 * ② Commit-time evaluation (pure evaluation unit).
 * @returns {{markerAbs:string, message:string}|null} null = firing conditions not met (silently skipped)
 */
export function evaluateMilestoneReminder({
  command,
  cwd,
  projectDir,
  gitFn = defaultGit,
  existsFn = existsSync,
  readdirFn = readdirSync,
}) {
  const ctx = extractCommitWorktree(command, cwd, projectDir);
  if (!ctx) return null;
  const { suppressed, markerAbs, planAbs } = checkSuppressed({
    worktreeAbs: ctx.worktreeAbs,
    branch: ctx.branch,
    projectDir,
    existsFn,
    readdirFn,
  });
  if (suppressed) return null;
  const scale = measureShipScale(ctx.worktreeAbs, gitFn);
  if (scale?.scale !== 'large') return null; // Sub-large or unevaluable (fail-open)
  return { markerAbs, planAbs, message: buildReminderMessage(scale.reason, 'Cumulative changes') };
}

export async function run(data) {
  try {
    const toolName = data?.tool_name;
    const isEdit = EDIT_TOOLS.has(toolName);
    if (toolName !== 'Bash' && !isEdit) return HookOutput.passthrough();
    const projectDir = resolveProjectDir(data);
    const reminder = isEdit
      ? evaluateEditReminder({ toolName, toolInput: data?.tool_input, projectDir })
      : evaluateMilestoneReminder({
          command: data?.tool_input?.command || '',
          cwd: data?.cwd,
          projectDir,
        });
    if (!reminder) return HookOutput.passthrough();
    // Plant obligation before recording marker
    const plan = plantObligations(reminder.planAbs, LARGE_SCALE_OBLIGATIONS);
    try {
      mkdirSync(dirname(reminder.markerAbs), { recursive: true });
      writeFileSync(reminder.markerAbs, new Date().toISOString() + '\n');
    } catch {
      // Ignore marker write failure (advisory prioritized)
    }
    return HookOutput.context(reminder.message + formatObligationNote(plan), 'PostToolUse');
  } catch {
    return HookOutput.passthrough(); // R-CM-006 Rule 2 fail-open
  }
}

if (!globalThis.__HOOK_ORCHESTRATOR__) {
  safeHookMainWithProfile('milestone-deck-warning', async () => {
    const data = await readStdin();
    return output(await run(data));
  });
}
