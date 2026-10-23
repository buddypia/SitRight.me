#!/usr/bin/env node

/**
 * audit-self-improving-loop.mjs — CLI entrypoint for self-improving loop discipline (R-CM-041)
 *
 * Does not make determinations — `.cli/lib/self-improving-loop.mjs` is the determination SSOT;
 * this file handles input collection (reading git diff / vitest reports) and output formatting.
 *
 * Two sub-checks:
 *   --flaky <report.json>   Rule 5. Finds retry-passed test cases in vitest `--retry` reports.
 *     [--spawn-latency <record.json>]  the run's in-run process-start reading
 *     (`lib/vitest-spawn-latency-reporter.mjs`); without a usable one the machine is probed after the run.
 *   --bar-move [--base ref] Rule 6. Finds diff signals that lower standards/bars.
 *
 * Why a separate CLI is needed (Perspective 1 already inspected by ship): Perspective 2 (generated projects)
 * is measured in CI/PR rather than local ship workflows, and Perspective 1 also needs a place for manual pre-ship checks.
 * Since determination is unified in one place, any entrypoint yields the identical result (R-CM-028: uniform determination,
 * divergent entrypoints).
 *
 * Usage:
 *   node .claude/scripts/audit-self-improving-loop.mjs --flaky .tmp/vitest-report.json --strict
 *   node .claude/scripts/audit-self-improving-loop.mjs --bar-move --base origin/main --json
 *
 * Exit: 0 pass / 1 `--strict` with findings / 2 argument or input error
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { isAbsolute, join } from 'node:path';
import {
  classifyLoadMeasurability,
  detectBarMove,
  detectFlakyTests,
  formatBarMoveWarning,
  liveTokensIn,
  retirementCandidates,
} from '../../.cli/lib/self-improving-loop.mjs';
import { measureSpawnLatencyMs } from '../../.cli/lib/utils.mjs';
import { readSpawnLatency } from './lib/vitest-spawn-latency-reporter.mjs';

/**
 * Relative paths are resolved against **invoking cwd** — not `resolveProjectDir()`.
 * That function strips worktree suffixes (`/.worktrees/<br>`) to return the main root
 * (behavior specified in R-CM-006 Rule 7 as "side-effect awareness"), searching for
 * `.tmp/vitest-report.json` generated in a worktree under main root, resulting in **false "missing report" errors**.
 * Empirical measurement 2026-08-11 — Report existed but was reported as unmeasured.
 * Standard behavior resolves CLI argument paths against where the user invoked the command, which is correct here.
 */
const BASE_DIR = process.cwd();

/** Parses `--key value` / `--flag` (same convention as pre-ship-steps.mjs — `--key=value` not supported). */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function usage() {
  console.error(
    'Usage:\n'
    + '  audit-self-improving-loop.mjs --flaky <vitest-report.json> [--spawn-latency <record.json>] [--strict] [--json]\n'
    + '  audit-self-improving-loop.mjs --bar-move [--base <ref>] [--cwd <path>] [--strict] [--json]',
  );
}

const fromBase = (path) => (isAbsolute(path) ? path : join(BASE_DIR, path));

/**
 * Rule 5 — Retry-passed test cases in vitest json report.
 *
 * @param {string} reportPath
 * @param {{env?: {loadAvg?: number[], cpuCount?: number, spawnMs?: number|null}, spawnLatency?: string}} [options]
 *   `env` stands in for the machine (no probe); `spawnLatency` is the run's in-run record, which wins over
 *   either when it holds a reading
 */
export function runFlaky(reportPath, { env, spawnLatency } = {}) {
  const abs = fromBase(reportPath);
  if (!existsSync(abs)) {
    // Missing report is "unmeasured", not "no flakiness" — conflating the two
    // turns missing instrumentation into silent passes (learnings `metric-write-path-must-match-read-path`).
    return { check: 'flaky', measured: false, reason: `Report missing: ${reportPath}`, findings: [] };
  }
  let report;
  try {
    report = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    return { check: 'flaky', measured: false, reason: `Report parsing failed: ${e.message}`, findings: [] };
  }
  const findings = detectFlakyTests(report);
  if (findings.length === 0) return { check: 'flaky', measured: true, reason: null, findings };
  // A retry-pass only implicates the *test* if the machine gave it a fair shot. Findings are kept
  // either way so a genuine flake surfacing on a busy box is not lost — only the verdict softens.
  // The machine is probed only once there is something to judge, so a clean report costs nothing.
  // The run's own reading, when it has one, is what the run met; a probe now only says how the box is now.
  const inRun = spawnLatency ? readSpawnLatency(fromBase(spawnLatency)) : null;
  const machine = env ?? { loadAvg: loadavg(), cpuCount: cpus().length, spawnMs: inRun ? null : measureSpawnLatencyMs() };
  const load = classifyLoadMeasurability(inRun ? { ...machine, spawnMs: inRun.spawnMs } : machine);
  if (load.saturated) {
    // The spawn clause is the last one in `evidence`, so the window lands right after the reading it qualifies.
    const window = inRun ? ` — the median of ${inRun.samples} samples taken during the run` : '';
    return {
      check: 'flaky',
      measured: false,
      reason: `Machine saturated during the run (${load.evidence}${window}). Re-run on an idle machine to judge these cases.`,
      findings,
    };
  }
  return { check: 'flaky', measured: true, reason: null, findings };
}

/** Files larger than this are data or generated bundles, not code a test exercises. */
const MAX_SCANNED_FILE_BYTES = 2 * 1024 * 1024;

/**
 * Which of the diff's retirement candidates still live in the tracked tree at `repoDir`.
 * Returns undefined when the tree cannot be read — detectBarMove then proves nothing retired
 * and reports every deletion as before (unproven retirement must stay visible).
 */
export function liveRetirementTokens(diff, repoDir) {
  const tokens = retirementCandidates(diff);
  if (tokens.length === 0) return new Set();
  try {
    const paths = execFileSync('git', ['ls-files', '-z'], {
      cwd: repoDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    }).split('\0').filter(Boolean);
    function* tree() {
      for (const path of paths) {
        let buf;
        try { buf = readFileSync(join(repoDir, path)); } catch { continue; }
        if (buf.length > MAX_SCANNED_FILE_BYTES || buf.includes(0)) continue;
        yield { path, text: buf.toString('utf8') };
      }
    }
    return liveTokensIn(tree(), tokens);
  } catch {
    return undefined;
  }
}

/** Rule 6 — Standard-lowering signals in base..HEAD diff. */
function runBarMove({ base, cwd }) {
  const repoDir = cwd ? (isAbsolute(cwd) ? cwd : join(BASE_DIR, cwd)) : BASE_DIR;
  let diff;
  try {
    diff = execFileSync('git', ['diff', `${base}...HEAD`], {
      cwd: repoDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    return { check: 'bar_move', measured: false, reason: `git diff failed: ${e.message}`, findings: [] };
  }
  const findings = detectBarMove(diff, { liveTokens: liveRetirementTokens(diff, repoDir) });
  return { check: 'bar_move', measured: true, reason: null, findings };
}

function printFlakyFindings(findings) {
  for (const f of findings) console.log(`  - ${f.name}\n      ${f.file}\n      ${f.message}`);
}

export function reportFlakyHuman(result) {
  if (!result.measured) {
    console.log(`[flaky] Unmeasured — ${result.reason}`);
    if (result.findings.length === 0) {
      console.log('        (Run vitest with --retry and specify the --reporter=json artifact)');
      return;
    }
    // Observed, not condemned. Dropping these would hide a real flake that happened to surface
    // on a busy machine — the opposite failure from the one this branch closes. Notice lines because
    // this exits 0, and the gate runner shows a passing step only through those
    // (`ci-local-status.mjs#gateNotices`).
    console.log(`        ${result.findings.length} retry-passed tests observed but not judged:`);
    for (const f of result.findings) {
      console.log(`::notice::passed only on retry, not judged (machine saturated): ${f.file} › ${f.name} — ${f.message}`);
    }
    return;
  }
  if (result.findings.length === 0) {
    console.log('[flaky] No retry-passed test cases (0 items)');
    return;
  }
  console.log(`[flaky] ${result.findings.length} retry-passed tests — investigate rather than delete/skip (R-CM-041 Rule 5)`);
  printFlakyFindings(result.findings);
}

function reportBarMoveHuman(result) {
  if (!result.measured) {
    console.log(`[bar-move] Unmeasured — ${result.reason}`);
    return;
  }
  const text = formatBarMoveWarning(result.findings);
  console.log(text ?? '[bar-move] No bar-lowering signals (0 items)');
}

/** Argument validation. Returns null if valid, error message for stderr if invalid. */
function validateArgs(args) {
  if (!args.flaky && !args['bar-move']) return 'NO_CHECK';
  if (args.flaky === true) return '--flaky requires a vitest json report path.';
  if (args['spawn-latency'] === true) return '--spawn-latency requires a record path.';
  return null;
}

/** Runs only requested checks in order. */
function runChecks(args) {
  const results = [];
  if (args.flaky) {
    const spawnLatency = typeof args['spawn-latency'] === 'string' ? args['spawn-latency'] : undefined;
    results.push(runFlaky(String(args.flaky), { spawnLatency }));
  }
  if (args['bar-move']) {
    results.push(
      runBarMove({
        base: typeof args.base === 'string' ? args.base : 'origin/main',
        cwd: typeof args.cwd === 'string' ? args.cwd : null,
      }),
    );
  }
  return results;
}

/**
 * Findings the run is entitled to judge. Unmeasured checks still carry findings (see `runFlaky`),
 * but counting them would let an unjudgeable run fail the gate — the exact conflation this module's
 * `measured` flag exists to prevent.
 */
function countJudgeable(results) {
  return results.reduce((n, r) => n + (r.measured ? r.findings.length : 0), 0);
}

function report(results, asJson) {
  if (asJson) {
    const total = countJudgeable(results);
    const observed = results.reduce((n, r) => n + r.findings.length, 0);
    console.log(JSON.stringify({ ok: total === 0, total, observed, results }, null, 2));
    return;
  }
  for (const result of results) {
    if (result.check === 'flaky') reportFlakyHuman(result);
    else reportBarMoveHuman(result);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const invalid = validateArgs(args);
  if (invalid === 'NO_CHECK') {
    usage();
    process.exit(2);
  }
  if (invalid) {
    console.error(invalid);
    process.exit(2);
  }

  const results = runChecks(args);
  report(results, Boolean(args.json));

  // Even with strict, *unmeasured* does not trigger failure — unmeasured is distinct from a violation.
  // Failing on unmeasured pollutes signals by treating typos in report paths as "flakiness detected".
  const total = countJudgeable(results);
  process.exit(args.strict && total > 0 ? 1 : 0);
}

// Only run main on direct execution to prevent running CLI when tests import this module
// (learnings `hook-module-runs-on-import`).
if (process.argv[1] && process.argv[1].endsWith('audit-self-improving-loop.mjs')) {
  main();
}
