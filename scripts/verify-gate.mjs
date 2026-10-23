#!/usr/bin/env node
/**
 * verify-gate.mjs — Diff-aware, importance-tiered, cross-worktree cached verification gate.
 *
 * Optimizes `make q.check` for parallel AI CLI sessions working in isolated `.worktrees/<branch>`:
 *   1. Shares verification verdicts (`lint`, `harness`, `test`, `build`) across all worktrees via
 *      `<mainRepoRoot>/.tmp/agent-scratchpad/verify-cache.json` keyed by content SHA-256 fingerprints.
 *   2. Skips heavy production `next build` (~23s, 14 workers) in feature worktrees when zero
 *      application/build-affecting files changed relative to base (`origin/main`), deferring full
 *      bundle verification to `main` / CI or when app files actually change.
 *   3. Scopes ESLint to changed lintable files with a shared `--cache-location` when eslint config
 *      itself is untouched, and skips `tests/unit/agent-harness.test.ts` when no harness files
 *      changed and the harness input hash is already verified in the shared scratchpad.
 *   4. Serializes concurrent `next build` executions across parallel worktrees via `withScratchpadLock`
 *      so multiple 14-worker builds never thrash CPU or starve PreToolUse hooks.
 *
 * Usage:
 *   node scripts/verify-gate.mjs [--full] [--base <ref>] [--json] [--ci-diff-check]
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isHarnessPath } from './check-agent-harness.mjs';
import {
  computeFilesFingerprint,
  ensureAgentScratchpad,
  getStageVerdict,
  recordStageVerdict,
  resolveCheckoutRoot,
  withScratchpadLock,
} from './lib/agent-scratchpad.mjs';

const APP_BUILD_EXACT = new Set([
  'next.config.js',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'postcss.config.js',
  'postcss.config.mjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'scripts/copy-mediapipe-wasm.mjs',
  'scripts/disable-third-party-telemetry.mjs',
  'scripts/postbuild.mjs',
]);

const LINT_CONFIG_EXACT = new Set([
  'eslint.config.mjs',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'scripts/lib/scene-backdrop.mjs',
]);

const HARNESS_EXTRA_EXACT = new Set([
  'scripts/check-agent-harness.mjs',
  'scripts/harness-library.mjs',
  'scripts/index-harness-experience.mjs',
  'scripts/lib/scene-backdrop.mjs',
  'tests/unit/agent-harness.test.ts',
  'eslint.config.mjs',
]);

const LINT_IGNORED_PREFIXES = [
  '.next/',
  'out/',
  'node_modules/',
  'public/mediapipe/',
  'playwright-report/',
  'test-results/',
  '.worktrees/',
  '.tmp/',
  '.cache/',
  '.wrangler/',
  'tmp/',
  '.claude/',
  '.cli/',
  '.codex/',
  'data/',
];

export function isAppBuildAffecting(relPath) {
  const rel = relPath.replace(/\\/g, '/');
  if (APP_BUILD_EXACT.has(rel)) return true;
  return rel.startsWith('src/') || rel.startsWith('public/') || rel.startsWith('functions/');
}

export function isE2eAffecting(relPath) {
  const rel = relPath.replace(/\\/g, '/');
  if (isAppBuildAffecting(rel)) return true;
  if (rel === 'playwright.config.ts' || rel === '.github/workflows/ci.yml') return true;
  return rel.startsWith('tests/e2e/');
}

export function isLintConfigAffecting(relPath) {
  return LINT_CONFIG_EXACT.has(relPath.replace(/\\/g, '/'));
}

export function isLintTargetFile(relPath) {
  const rel = relPath.replace(/\\/g, '/');
  if (rel === 'next-env.d.ts') return false;
  if (LINT_IGNORED_PREFIXES.some((prefix) => rel.startsWith(prefix))) return false;
  return /\.(?:[cm]?[jt]sx?)$/.test(rel);
}

export function isLintAffecting(relPath) {
  return isLintConfigAffecting(relPath) || isLintTargetFile(relPath);
}

export function isHarnessAffecting(relPath) {
  const rel = relPath.replace(/\\/g, '/');
  return isHarnessPath(rel) || HARNESS_EXTRA_EXACT.has(rel);
}

export function isUnitTestAffecting(relPath) {
  const rel = relPath.replace(/\\/g, '/');
  if (isAppBuildAffecting(rel) || isHarnessAffecting(rel) || isLintAffecting(rel)) return true;
  if (rel === 'vitest.config.mts' || rel === 'docs/THIRD_PARTY_NOTICES.md') return true;
  return rel.startsWith('tests/unit/') || rel.startsWith('scripts/');
}

export function isTypecheckAffecting(relPath) {
  const rel = relPath.replace(/\\/g, '/');
  if (rel === 'tsconfig.json' || rel === 'package.json' || rel === 'package-lock.json') return true;
  if (LINT_IGNORED_PREFIXES.some((prefix) => rel.startsWith(prefix))) return false;
  return /\.(?:[cm]?ts|tsx)$/.test(rel);
}

export function classifyChanges(changedFiles) {
  const normalized = [...new Set(changedFiles.map((f) => f.replace(/\\/g, '/')).filter(Boolean))].sort();
  const changedLintTargetFiles = normalized.filter(isLintTargetFile);
  return {
    changedFiles: normalized,
    affectsAppBuild: normalized.some(isAppBuildAffecting),
    affectsTypecheck: normalized.some(isTypecheckAffecting),
    affectsE2e: normalized.some(isE2eAffecting),
    affectsLint: normalized.some(isLintAffecting),
    affectsLintConfig: normalized.some(isLintConfigAffecting),
    changedLintTargetFiles,
    affectsHarness: normalized.some(isHarnessAffecting),
    affectsUnitTests: normalized.some(isUnitTestAffecting),
  };
}

function gitOut(rootDir, args) {
  try {
    return execFileSync('git', ['-C', rootDir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function readBranchFast(rootDir) {
  try {
    const dotGit = path.join(rootDir, '.git');
    const st = statSync(dotGit);
    let gitDir = dotGit;
    if (st.isFile()) {
      const m = /^gitdir:\s*(.+)$/i.exec(readFileSync(dotGit, 'utf8').trim());
      if (m) gitDir = path.resolve(rootDir, m[1].trim());
    }
    const headRaw = readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (headRaw.startsWith('ref: refs/heads/')) {
      return headRaw.slice('ref: refs/heads/'.length);
    }
  } catch {
    // fallback below
  }
  return gitOut(rootDir, ['rev-parse', '--abbrev-ref', 'HEAD']) || 'HEAD';
}

export function resolveBaseCommit(rootDir, explicitBase = '') {
  if (explicitBase === 'HEAD') return 'HEAD';
  const candidates = explicitBase ? [explicitBase] : ['origin/main', 'main', 'HEAD^1', 'HEAD'];
  for (const ref of candidates) {
    if (ref === 'HEAD') return 'HEAD';
    const mb = gitOut(rootDir, ['merge-base', 'HEAD', ref]);
    if (mb) return mb;
    const rev = gitOut(rootDir, ['rev-parse', '--verify', '--quiet', ref]);
    if (rev) return rev;
  }
  return 'HEAD';
}

function isIgnoredVerifyRel(rel) {
  return (
    !rel ||
    rel.startsWith('.tmp/') ||
    rel.startsWith('.worktrees/') ||
    rel.startsWith('.cache/') ||
    rel.startsWith('out/') ||
    rel.startsWith('.next/')
  );
}

export function scanRepoAndChangedFiles(rootDir, explicitBase = '') {
  const baseCommit = resolveBaseCommit(rootDir, explicitBase);
  const changed = new Set();
  const allFiles = [];

  const diffOut = gitOut(rootDir, ['diff', '--name-only', '--no-renames', baseCommit]);
  for (const line of diffOut.split('\n')) {
    const rel = line.trim();
    if (!isIgnoredVerifyRel(rel)) changed.add(rel);
  }

  const lsOut = gitOut(rootDir, ['ls-files', '-t', '--cached', '--others', '--exclude-standard']);
  for (const line of lsOut.split('\n')) {
    if (!line) continue;
    const tag = line[0];
    const rel = line.slice(2).trim();
    if (isIgnoredVerifyRel(rel)) continue;
    allFiles.push(rel);
    if (tag === '?') changed.add(rel);
  }

  return { changedFiles: [...changed], allFiles };
}

export function collectChangedFiles(rootDir, explicitBase = '') {
  return scanRepoAndChangedFiles(rootDir, explicitBase).changedFiles;
}

export function listRepoFiles(rootDir) {
  return scanRepoAndChangedFiles(rootDir, 'HEAD').allFiles;
}

function runCommand(cmd, args, cwd) {
  const start = Date.now();
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  const durationMs = Date.now() - start;
  if (res.status !== 0) {
    const err = new Error(`Command failed (${res.status ?? 'signal'}): ${cmd} ${args.join(' ')}`);
    err.exitCode = res.status || 1;
    throw err;
  }
  return durationMs;
}

export function parseVerifyArgs(argv = process.argv.slice(2)) {
  let full = process.env.VERIFY_GATE_FULL === '1' || process.env.CI === 'true';
  let base = '';
  let json = false;
  let ciDiffCheck = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--full') full = true;
    else if (arg === '--json') json = true;
    else if (arg === '--ci-diff-check') ciDiffCheck = true;
    else if (arg === '--base' && argv[i + 1]) base = argv[++i];
    else if (arg.startsWith('--base=')) base = arg.slice('--base='.length);
  }

  return { full, base, json, ciDiffCheck };
}

export function runVerifyGate({
  rootDir = resolveCheckoutRoot(process.cwd()),
  full = false,
  base = '',
  scratchpadDir = ensureAgentScratchpad(rootDir),
  runner = runCommand,
} = {}) {
  const totalStart = Date.now();
  const branch = readBranchFast(rootDir);
  const { changedFiles, allFiles } = scanRepoAndChangedFiles(rootDir, base);
  const classification = classifyChanges(changedFiles);

  const lintInputHash = computeFilesFingerprint(rootDir, allFiles.filter(isLintAffecting), { scratchpadDir });
  const harnessInputHash = computeFilesFingerprint(rootDir, allFiles.filter(isHarnessAffecting), { scratchpadDir });
  const testInputHash = computeFilesFingerprint(rootDir, allFiles.filter(isUnitTestAffecting), { scratchpadDir });
  const typecheckInputHash = computeFilesFingerprint(rootDir, allFiles.filter(isTypecheckAffecting), {
    scratchpadDir,
  });
  const buildInputHash = computeFilesFingerprint(rootDir, allFiles.filter(isAppBuildAffecting), { scratchpadDir });

  const results = [];

  // --- Stage 1: Lint ---
  const cachedLint = !full ? getStageVerdict('lint', lintInputHash, { scratchpadDir }) : null;
  if (cachedLint) {
    results.push({
      stage: 'lint',
      status: 'pass',
      mode: 'cached',
      durationMs: 0,
      detail: `cache hit (${lintInputHash.slice(0, 12)})`,
    });
  } else if (!full && changedFiles.length > 0 && !classification.affectsLint) {
    recordStageVerdict(
      'lint',
      lintInputHash,
      { status: 'pass', worktree: rootDir, durationMs: 0, detail: 'no lintable files changed' },
      { scratchpadDir },
    );
    results.push({
      stage: 'lint',
      status: 'pass',
      mode: 'skipped-diff',
      durationMs: 0,
      detail: 'no lintable files changed',
    });
  } else {
    const eslintCacheDir = path.join(scratchpadDir, 'eslint');
    mkdirSync(eslintCacheDir, { recursive: true });
    const eslintCacheFile = path.join(eslintCacheDir, '.eslintcache');
    const existingTargets = classification.changedLintTargetFiles.filter((rel) =>
      existsSync(path.join(rootDir, rel)),
    );
    const useScopedTargets =
      !full &&
      !classification.affectsLintConfig &&
      changedFiles.length > 0 &&
      existingTargets.length > 0 &&
      existingTargets.length <= 25;

    if (!full && !classification.affectsLintConfig && changedFiles.length > 0 && existingTargets.length === 0) {
      recordStageVerdict(
        'lint',
        lintInputHash,
        { status: 'pass', worktree: rootDir, durationMs: 0, detail: 'only deleted lintable files' },
        { scratchpadDir },
      );
      results.push({
        stage: 'lint',
        status: 'pass',
        mode: 'skipped-diff',
        durationMs: 0,
        detail: 'only deleted lintable files',
      });
    } else {
      const lintArgs = useScopedTargets
        ? ['eslint', '--cache', '--cache-location', eslintCacheFile, ...existingTargets]
        : ['eslint', '--cache', '--cache-location', eslintCacheFile, '.'];
      console.log(`>> npx ${lintArgs.join(' ')}`);
      const durationMs = runner('npx', lintArgs, rootDir);
      const mode = useScopedTargets ? `scoped (${existingTargets.length} files)` : 'full';
      recordStageVerdict(
        'lint',
        lintInputHash,
        { status: 'pass', worktree: rootDir, durationMs, detail: mode },
        { scratchpadDir },
      );
      results.push({ stage: 'lint', status: 'pass', mode, durationMs, detail: mode });
    }
  }

  // --- Stage 2: Unit Tests & Harness ---
  const cachedTest = !full ? getStageVerdict('test', testInputHash, { scratchpadDir }) : null;
  if (cachedTest) {
    results.push({
      stage: 'test',
      status: 'pass',
      mode: 'cached',
      durationMs: 0,
      detail: `cache hit (${testInputHash.slice(0, 12)})`,
    });
  } else if (!full && changedFiles.length > 0 && !classification.affectsUnitTests) {
    recordStageVerdict(
      'test',
      testInputHash,
      { status: 'pass', worktree: rootDir, durationMs: 0, detail: 'no test-affecting files changed' },
      { scratchpadDir },
    );
    results.push({
      stage: 'test',
      status: 'pass',
      mode: 'skipped-diff',
      durationMs: 0,
      detail: 'no test-affecting files changed',
    });
  } else {
    const cachedHarness = !full ? getStageVerdict('harness', harnessInputHash, { scratchpadDir }) : null;
    const skipHarnessSuite = !full && !classification.affectsHarness && Boolean(cachedHarness);
    const vitestArgs = skipHarnessSuite
      ? ['vitest', 'run', '--exclude', 'tests/unit/agent-harness.test.ts']
      : ['vitest', 'run'];
    console.log(`>> npx ${vitestArgs.join(' ')}`);
    const durationMs = runner('npx', vitestArgs, rootDir);
    const mode = skipHarnessSuite ? 'fast (harness cached)' : 'full';
    if (!skipHarnessSuite) {
      recordStageVerdict(
        'harness',
        harnessInputHash,
        { status: 'pass', worktree: rootDir, durationMs, detail: 'agent-harness suite passed' },
        { scratchpadDir },
      );
    }
    recordStageVerdict(
      'test',
      testInputHash,
      { status: 'pass', worktree: rootDir, durationMs, detail: mode },
      { scratchpadDir },
    );
    results.push({ stage: 'test', status: 'pass', mode, durationMs, detail: mode });
  }

  // --- Stage 3: Build ---
  const cachedBuild = !full ? getStageVerdict('build', buildInputHash, { scratchpadDir }) : null;
  const cachedTypecheck = !full ? getStageVerdict('typecheck', typecheckInputHash, { scratchpadDir }) : null;
  if (cachedBuild) {
    if (classification.affectsTypecheck && !cachedTypecheck) {
      console.log('>> npm run type-check');
      const tcMs = runner('npm', ['run', 'type-check'], rootDir);
      recordStageVerdict(
        'typecheck',
        typecheckInputHash,
        { status: 'pass', worktree: rootDir, durationMs: tcMs, detail: 'tsc --noEmit' },
        { scratchpadDir },
      );
    }
    results.push({
      stage: 'build',
      status: 'pass',
      mode: 'cached',
      durationMs: 0,
      detail: `cache hit (${buildInputHash.slice(0, 12)})`,
    });
  } else if (!full && changedFiles.length > 0 && !classification.affectsAppBuild) {
    let tcMs = 0;
    if (classification.affectsTypecheck && !cachedTypecheck) {
      console.log('>> npm run type-check');
      tcMs = runner('npm', ['run', 'type-check'], rootDir);
      recordStageVerdict(
        'typecheck',
        typecheckInputHash,
        { status: 'pass', worktree: rootDir, durationMs: tcMs, detail: 'tsc --noEmit' },
        { scratchpadDir },
      );
    }
    recordStageVerdict(
      'build',
      buildInputHash,
      { status: 'pass', worktree: rootDir, durationMs: tcMs, detail: 'no app/build files changed' },
      { scratchpadDir },
    );
    results.push({
      stage: 'build',
      status: 'pass',
      mode: 'skipped-diff',
      durationMs: tcMs,
      detail: 'no app/build files changed',
    });
  } else {
    withScratchpadLock(
      'next-build',
      () => {
        const hitAfterLock = !full ? getStageVerdict('build', buildInputHash, { scratchpadDir }) : null;
        if (hitAfterLock) {
          results.push({
            stage: 'build',
            status: 'pass',
            mode: 'cached-after-lock',
            durationMs: 0,
            detail: `cache hit after lock (${buildInputHash.slice(0, 12)})`,
          });
          return;
        }
        console.log('>> npm run build');
        const durationMs = runner('npm', ['run', 'build'], rootDir);
        recordStageVerdict(
          'typecheck',
          typecheckInputHash,
          { status: 'pass', worktree: rootDir, durationMs, detail: 'next build' },
          { scratchpadDir },
        );
        recordStageVerdict(
          'build',
          buildInputHash,
          { status: 'pass', worktree: rootDir, durationMs, detail: 'next build' },
          { scratchpadDir },
        );
        results.push({ stage: 'build', status: 'pass', mode: 'full', durationMs, detail: 'next build' });
      },
      { scratchpadDir },
    );
  }

  const stampDir = path.join(rootDir, '.tmp');
  mkdirSync(stampDir, { recursive: true });
  writeFileSync(path.join(stampDir, 'quality-gate-passed'), new Date().toISOString() + '\n', 'utf8');

  const totalDurationMs = Date.now() - totalStart;
  return {
    ok: true,
    branch,
    full,
    scratchpadDir,
    changedFilesCount: classification.changedFiles.length,
    classification,
    hashes: {
      lint: lintInputHash.slice(0, 12),
      harness: harnessInputHash.slice(0, 12),
      test: testInputHash.slice(0, 12),
      build: buildInputHash.slice(0, 12),
    },
    results,
    totalDurationMs,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opts = parseVerifyArgs();
  const rootDir = resolveCheckoutRoot(process.cwd());

  if (opts.ciDiffCheck) {
    const changed = collectChangedFiles(rootDir, opts.base);
    const info = classifyChanges(changed);
    const out = {
      changed_count: info.changedFiles.length,
      affects_app_build: info.affectsAppBuild || info.changedFiles.length === 0,
      affects_e2e: info.affectsE2e || info.changedFiles.length === 0,
      changed_files: info.changedFiles,
    };
    console.log(JSON.stringify(out));
    process.exit(0);
  }

  try {
    const summary = runVerifyGate({ rootDir, full: opts.full, base: opts.base });
    if (opts.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      for (const r of summary.results) {
        console.log(`  [${r.stage}] ${r.status.toUpperCase()} (${r.mode}, ${r.durationMs}ms) — ${r.detail}`);
      }
      console.log(
        `[verify-gate] Completed in ${summary.totalDurationMs}ms (scratchpad: ${summary.scratchpadDir})`,
      );
    }
  } catch (err) {
    console.error(`[verify-gate] FAILED: ${err.message}`);
    process.exit(err.exitCode || 1);
  }
}
