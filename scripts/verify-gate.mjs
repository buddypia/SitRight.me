#!/usr/bin/env node
// Invariants (guarded by tests/unit/verify-gate.test.ts):
//  - Node built-ins only: `--ci-diff-check` runs in CI before `npm ci`, so no third-party import may load here.
//  - Fingerprinting reads through one file descriptor (openSync → fstatSync → readFileSync(fd)), never
//    existsSync/statSync followed by a path read: that check-then-use gap is CodeQL js/file-system-race.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveCheckoutRoot(startDir = process.cwd()) {
  for (let cur = path.resolve(startDir); ; ) {
    if (existsSync(path.join(cur, '.git'))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) return path.resolve(startDir);
    cur = parent;
  }
}
export function resolveMainRepoRoot(startDir = process.cwd()) {
  const root = resolveCheckoutRoot(startDir);
  try {
    const m = /^gitdir:\s*(.+)$/i.exec(readFileSync(path.join(root, '.git'), 'utf8').trim());
    if (m) {
      const gitDir = path.resolve(root, m[1].trim());
      try { return path.dirname(path.resolve(gitDir, readFileSync(path.join(gitDir, 'commondir'), 'utf8').trim())); } catch { /* fallback */ }
      if (gitDir.includes(`${path.sep}.git${path.sep}worktrees${path.sep}`)) return path.resolve(gitDir, '../../..');
    }
  } catch { /* .git is a directory or unreadable */ }
  return root;
}
export function ensureAgentScratchpad(startDir = process.cwd()) {
  if (process.env.SITRIGHT_AGENT_SCRATCHPAD_DIR) {
    const dir = path.resolve(process.env.SITRIGHT_AGENT_SCRATCHPAD_DIR);
    mkdirSync(dir, { recursive: true });
    return dir;
  }
  const mainRoot = resolveMainRepoRoot(startDir), wtRoot = resolveCheckoutRoot(startDir), shared = path.join(mainRoot, '.tmp/agent-scratchpad');
  mkdirSync(shared, { recursive: true });
  if (wtRoot !== mainRoot) {
    const link = path.join(wtRoot, '.tmp/agent-scratchpad');
    mkdirSync(path.dirname(link), { recursive: true });
    try { symlinkSync(shared, link, 'dir'); } catch { /* ignore existing */ }
  }
  return shared;
}
const readJson = (p, fb) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fb; } };
const writeJson = (p, data) => {
  mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data) + '\n', 'utf8');
  renameSync(tmp, p);
};
export function computeFilesFingerprint(rootDir, relPaths, { scratchpadDir = ensureAgentScratchpad(rootDir) } = {}) {
  const cachePath = path.join(scratchpadDir, 'file-hash-cache.json'), files = readJson(cachePath, { files: {} }).files || {};
  let dirty = false;
  const h = createHash('sha256');
  for (const rel of [...new Set(relPaths.map((p) => p.replace(/\\/g, '/')))].sort()) {
    const abs = path.join(rootDir, rel);
    let fd = -1;
    try {
      fd = openSync(abs, 'r');
      const st = fstatSync(fd);
      if (!st.isFile()) continue;
      const sig = `${st.size}:${st.mtimeMs}`;
      if (files[abs]?.sig !== sig) { files[abs] = { sig, sha256: createHash('sha256').update(readFileSync(fd)).digest('hex') }; dirty = true; }
      h.update(`${rel}:${files[abs].sha256}\n`);
    } catch { h.update(`${rel}:missing\n`); } finally { if (fd >= 0) try { closeSync(fd); } catch { /* ignore */ } }
  }
  if (dirty) writeJson(cachePath, { files });
  return h.digest('hex');
}
export const getStageVerdict = (stage, hash, { scratchpadDir = ensureAgentScratchpad() } = {}) => {
  const hit = readJson(path.join(scratchpadDir, 'verify-cache.json'), { stages: {} })?.stages?.[stage]?.[hash];
  return hit?.status === 'pass' ? hit : null;
};
export function recordStageVerdict(stage, hash, info = {}, { scratchpadDir = ensureAgentScratchpad() } = {}) {
  const p = path.join(scratchpadDir, 'verify-cache.json'), cache = readJson(p, { stages: {} });
  cache.stages = { ...(cache.stages || {}), [stage]: { ...(cache.stages?.[stage] || {}), [hash]: { status: 'pass', ...info, at: Date.now() } } };
  writeJson(p, cache);
}
export function withScratchpadLock(name, fn, { scratchpadDir = ensureAgentScratchpad(), timeoutMs = 180_000 } = {}) {
  const lockDir = path.join(scratchpadDir, 'locks', `${name}.lock`), ownerFile = path.join(lockDir, 'owner.json');
  mkdirSync(path.dirname(lockDir), { recursive: true });
  let acquired = false;
  for (const t0 = Date.now(); Date.now() - t0 < timeoutMs; ) {
    try {
      mkdirSync(lockDir);
      writeFileSync(ownerFile, JSON.stringify({ pid: process.pid, acquiredAt: Date.now() }), 'utf8');
      acquired = true;
      break;
    } catch {
      const owner = readJson(ownerFile, null);
      let alive = false;
      try { if (owner?.pid) { process.kill(owner.pid, 0); alive = true; } } catch (e) { alive = e.code === 'EPERM'; }
      if (owner && !alive) { try { rmSync(lockDir, { recursive: true, force: true }); continue; } catch { /* ignore */ } }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  try { return fn({ acquired }); } finally { if (acquired) rmSync(lockDir, { recursive: true, force: true }); }
}
const APP_EXACT = new Set(['next.config.js', 'package.json', 'package-lock.json', 'tsconfig.json', 'postcss.config.mjs', 'scripts/copy-mediapipe-wasm.mjs', 'scripts/disable-third-party-telemetry.mjs', 'scripts/postbuild.mjs']);
const LINT_IGNORE = ['.next/', 'out/', 'node_modules/', 'public/mediapipe/', 'playwright-report/', 'test-results/', '.worktrees/', '.tmp/', '.cache/', '.wrangler/', 'tmp/', '.claude/', '.cli/', '.codex/', 'data/'];
const isHarness = (p) => /^(?:AGENTS\.md|CLAUDE\.md|(?:docs\/harness|\.claude|\.agents|\.cli|\.codex)\/)/.test(p);
export const isAppBuildAffecting = (p) => APP_EXACT.has(p) || /^(src|public|functions)\//.test(p);
export const isE2eAffecting = (p) => isAppBuildAffecting(p) || p === 'playwright.config.ts' || p === '.github/workflows/ci.yml' || p.startsWith('tests/e2e/');
export const isLintAffecting = (p) => p === 'eslint.config.mjs' || p === 'package.json' || (p !== 'next-env.d.ts' && !LINT_IGNORE.some((x) => p.startsWith(x)) && /\.(?:[cm]?[jt]sx?)$/.test(p));
export const isHarnessAffecting = (p) => isHarness(p) || p === 'scripts/check-agent-harness.mjs' || p === 'scripts/harness-library.mjs' || p === 'tests/unit/agent-harness.test.ts';
export const isUnitTestAffecting = (p) => isAppBuildAffecting(p) || isHarnessAffecting(p) || isLintAffecting(p) || p === 'vitest.config.mts' || p === 'docs/THIRD_PARTY_NOTICES.md' || /^(tests\/unit|scripts)\//.test(p);
export function classifyChanges(files) {
  const list = [...new Set(files.map((f) => f.replace(/\\/g, '/')).filter(Boolean))].sort();
  return { changedFiles: list, affectsAppBuild: list.some(isAppBuildAffecting), affectsE2e: list.some(isE2eAffecting), affectsLint: list.some(isLintAffecting), affectsHarness: list.some(isHarnessAffecting), affectsUnitTests: list.some(isUnitTestAffecting) };
}
const gitOut = (cwd, args) => { try { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
export function runVerifyGate({ rootDir = resolveCheckoutRoot(), full = false, base = '', changedFiles = /** @type {string[] | null} */ (null), allFiles: inputFiles = /** @type {string[] | null} */ (null), scratchpadDir = ensureAgentScratchpad(rootDir), runner = (c, a, d) => { const r = spawnSync(c, a, { cwd: d, stdio: 'inherit' }); if (r.status !== 0) throw new Error(`${c} failed`); } } = {}) {
  const isIgnored = (p) => !p || /^(\.tmp|\.worktrees|\.cache|out|\.next)\//.test(p);
  const baseRef = base || (changedFiles ? 'HEAD' : gitOut(rootDir, ['merge-base', 'HEAD', 'origin/main']) ? 'origin/main' : 'HEAD');
  const changed = new Set((changedFiles ?? gitOut(rootDir, ['diff', '--name-only', '--no-renames', baseRef]).split('\n')).map((s) => s.trim()).filter((p) => !isIgnored(p)));
  const allFiles = inputFiles ? inputFiles.filter((p) => !isIgnored(p)) : [];
  for (const line of inputFiles ? [] : gitOut(rootDir, ['ls-files', '-t', '--cached', '--others', '--exclude-standard']).split('\n')) {
    const rel = line.slice(2).trim();
    if (!isIgnored(rel)) { allFiles.push(rel); if (line[0] === '?') changed.add(rel); }
  }
  const info = classifyChanges([...changed]), results = [];
  const hashes = { lint: computeFilesFingerprint(rootDir, allFiles.filter(isLintAffecting), { scratchpadDir }), test: computeFilesFingerprint(rootDir, allFiles.filter(isUnitTestAffecting), { scratchpadDir }), build: computeFilesFingerprint(rootDir, allFiles.filter(isAppBuildAffecting), { scratchpadDir }) };
  const runStage = (stage, affects, fn) => {
    if (!full && getStageVerdict(stage, hashes[stage], { scratchpadDir })) return results.push({ stage, mode: 'cached' });
    if (!full && info.changedFiles.length > 0 && !affects) { recordStageVerdict(stage, hashes[stage], { worktree: rootDir }, { scratchpadDir }); return results.push({ stage, mode: 'skipped-diff' }); }
    fn();
    recordStageVerdict(stage, hashes[stage], { worktree: rootDir }, { scratchpadDir });
    results.push({ stage, mode: 'full' });
  };
  runStage('lint', info.affectsLint, () => runner('npx', ['eslint', '--cache', '--cache-location', path.join(scratchpadDir, 'eslint/.eslintcache'), '.'], rootDir));
  runStage('test', info.affectsUnitTests, () => runner('npx', ['vitest', 'run'], rootDir));
  runStage('build', info.affectsAppBuild, () => withScratchpadLock('next-build', () => { if (full || !getStageVerdict('build', hashes.build, { scratchpadDir })) runner('npm', ['run', 'build'], rootDir); }, { scratchpadDir }));
  mkdirSync(path.join(rootDir, '.tmp'), { recursive: true });
  writeFileSync(path.join(rootDir, '.tmp/quality-gate-passed'), new Date().toISOString() + '\n');
  return { ok: true, results, classification: info };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), baseIdx = args.indexOf('--base'), base = baseIdx >= 0 ? args[baseIdx + 1] : '';
  if (args.includes('--ci-diff-check')) {
    const isPr = process.env.GITHUB_EVENT_NAME === 'pull_request', diff = isPr ? gitOut(resolveCheckoutRoot(), ['diff', '--name-only', '--no-renames', base || 'HEAD^1']).split('\n').filter(Boolean) : [], c = classifyChanges(diff);
    const runBuild = !isPr || diff.length === 0 || c.affectsAppBuild, runE2e = !isPr || diff.length === 0 || c.affectsE2e;
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run_build=${runBuild}\nrun_e2e=${runE2e}\n`);
    console.log(JSON.stringify({ affects_app_build: runBuild, affects_e2e: runE2e }));
    process.exit(0);
  }
  const out = runVerifyGate({ full: args.includes('--full') || process.env.CI === 'true', base });
  for (const r of out.results) console.log(`  [${r.stage}] PASS (${r.mode})`);
}
