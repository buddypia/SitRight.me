import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli as runScratchpadCli } from '../../scripts/agent-scratchpad.mjs';
import {
  clearScratchpadCache,
  computeFilesFingerprint,
  ensureAgentScratchpad,
  getStageVerdict,
  readSharedNotes,
  recordStageVerdict,
  resolveCheckoutRoot,
  resolveMainRepoRoot,
  setSharedNote,
  withScratchpadLock,
} from '../../scripts/lib/agent-scratchpad.mjs';
import {
  classifyChanges,
  isAppBuildAffecting,
  isE2eAffecting,
  isHarnessAffecting,
  isLintAffecting,
  isUnitTestAffecting,
  parseVerifyArgs,
  runVerifyGate,
} from '../../scripts/verify-gate.mjs';

describe('agent-scratchpad', () => {
  let sandboxDir: string;

  beforeEach(() => {
    sandboxDir = mkdtempSync(path.join(tmpdir(), 'sitright-scratchpad-'));
  });

  afterEach(() => {
    delete process.env.SITRIGHT_AGENT_SCRATCHPAD_DIR;
    rmSync(sandboxDir, { recursive: true, force: true });
  });

  it('resolves main repo root from linked worktree .git file without spawning git', () => {
    const mainRoot = path.join(sandboxDir, 'main-repo');
    const gitCommon = path.join(mainRoot, '.git');
    const wtGitDir = path.join(gitCommon, 'worktrees', 'feature-x');
    const wtRoot = path.join(mainRoot, '.worktrees', 'feature-x');

    mkdirSync(wtGitDir, { recursive: true });
    mkdirSync(wtRoot, { recursive: true });
    writeFileSync(path.join(wtGitDir, 'commondir'), '../..\n', 'utf8');
    writeFileSync(path.join(wtRoot, '.git'), `gitdir: ${wtGitDir}\n`, 'utf8');

    expect(resolveCheckoutRoot(wtRoot)).toBe(wtRoot);
    expect(resolveMainRepoRoot(wtRoot)).toBe(mainRoot);

    const scratchpad = ensureAgentScratchpad(wtRoot);
    expect(scratchpad).toBe(path.join(mainRoot, '.tmp', 'agent-scratchpad'));
    expect(existsSync(scratchpad)).toBe(true);
    const wtLink = path.join(wtRoot, '.tmp', 'agent-scratchpad');
    expect(lstatSync(wtLink).isSymbolicLink()).toBe(true);
  });

  it('computes identical content fingerprints across worktrees with different mtimes', () => {
    const scratchpadDir = path.join(sandboxDir, 'scratchpad');
    mkdirSync(scratchpadDir, { recursive: true });

    const wtA = path.join(sandboxDir, 'wt-a');
    const wtB = path.join(sandboxDir, 'wt-b');
    mkdirSync(path.join(wtA, 'src'), { recursive: true });
    mkdirSync(path.join(wtB, 'src'), { recursive: true });

    writeFileSync(path.join(wtA, 'src/a.ts'), 'export const x = 1;\n', 'utf8');
    writeFileSync(path.join(wtB, 'src/a.ts'), 'export const x = 1;\n', 'utf8');
    const past = new Date(Date.now() - 60_000);
    utimesSync(path.join(wtA, 'src/a.ts'), past, past);

    const hashA = computeFilesFingerprint(wtA, ['src/a.ts'], { scratchpadDir });
    const hashB = computeFilesFingerprint(wtB, ['src/a.ts'], { scratchpadDir });
    expect(hashA).toBe(hashB);

    writeFileSync(path.join(wtB, 'src/a.ts'), 'export const x = 2;\n', 'utf8');
    const hashBModified = computeFilesFingerprint(wtB, ['src/a.ts'], { scratchpadDir });
    expect(hashBModified).not.toBe(hashA);
  });

  it('stores and retrieves stage verdicts, notes, and reaps stale dead-PID locks', () => {
    const scratchpadDir = path.join(sandboxDir, 'scratchpad');
    mkdirSync(scratchpadDir, { recursive: true });

    expect(getStageVerdict('build', 'abc123', { scratchpadDir })).toBeNull();
    recordStageVerdict(
      'build',
      'abc123',
      { status: 'pass', worktree: '/repo/.worktrees/feat-1', durationMs: 1200, detail: 'next build' },
      { scratchpadDir },
    );
    const hit = getStageVerdict('build', 'abc123', { scratchpadDir });
    expect(hit).toMatchObject({ status: 'pass', worktree: 'feat-1', durationMs: 1200 });

    // Create a stale lock owned by a non-existent PID and verify withScratchpadLock reaps it
    const staleLockDir = path.join(scratchpadDir, 'locks', 'next-build.lock');
    mkdirSync(staleLockDir, { recursive: true });
    writeFileSync(
      path.join(staleLockDir, 'owner.json'),
      JSON.stringify({ pid: 99999999, acquiredAt: Date.now() - 10_000 }),
      'utf8',
    );

    const lockResult = withScratchpadLock(
      'next-build',
      ({ acquired }: { acquired: boolean }) => acquired,
      {
        scratchpadDir,
        timeoutMs: 2000,
      },
    );
    expect(lockResult).toBe(true);
    expect(existsSync(staleLockDir)).toBe(false);

    setSharedNote('module-split', 'ready', { author: 'wt-1', scratchpadDir });
    expect(readSharedNotes(scratchpadDir)['module-split']?.value).toBe('ready');

    process.env.SITRIGHT_AGENT_SCRATCHPAD_DIR = scratchpadDir;
    const statusOut = runScratchpadCli(['status'], sandboxDir);
    expect(statusOut.ok).toBe(true);
    expect((statusOut.cached_verdicts as Record<string, number> | undefined)?.build).toBe(1);

    clearScratchpadCache(scratchpadDir);
    expect(getStageVerdict('build', 'abc123', { scratchpadDir })).toBeNull();
  });
});

describe('verify-gate classification and caching', () => {
  let repoDir: string;
  let scratchpadDir: string;

  beforeEach(() => {
    const base = mkdtempSync(path.join(tmpdir(), 'sitright-verify-gate-'));
    repoDir = path.join(base, 'repo');
    scratchpadDir = path.join(base, 'scratchpad');
    mkdirSync(repoDir, { recursive: true });
    mkdirSync(scratchpadDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(path.dirname(repoDir), { recursive: true, force: true });
  });

  it('classifies changed paths by impact across lint, harness, unit test, build, and e2e', () => {
    expect(isAppBuildAffecting('src/components/CameraView.tsx')).toBe(true);
    expect(isAppBuildAffecting('public/og-image.png')).toBe(true);
    expect(isAppBuildAffecting('docs/ARCHITECTURE.md')).toBe(false);
    expect(isAppBuildAffecting('.claude/settings.json')).toBe(false);

    expect(isE2eAffecting('tests/e2e/posture.spec.ts')).toBe(true);
    expect(isE2eAffecting('AGENTS.md')).toBe(false);

    expect(isLintAffecting('src/utils/pose.ts')).toBe(true);
    expect(isLintAffecting('.cli/hooks/commit-guard.mjs')).toBe(false);
    expect(isLintAffecting('eslint.config.mjs')).toBe(true);

    expect(isHarnessAffecting('AGENTS.md')).toBe(true);
    expect(isHarnessAffecting('docs/harness/INDEX.md')).toBe(true);
    expect(isHarnessAffecting('src/app/page.tsx')).toBe(false);

    expect(isUnitTestAffecting('docs/ARCHITECTURE.md')).toBe(false);
    expect(isUnitTestAffecting('docs/THIRD_PARTY_NOTICES.md')).toBe(true);

    const harnessOnly = classifyChanges(['AGENTS.md', 'docs/harness/INDEX.md']);
    expect(harnessOnly).toMatchObject({
      affectsAppBuild: false,
      affectsE2e: false,
      affectsLint: false,
      affectsHarness: true,
      affectsUnitTests: true,
    });

    const docsOnly = classifyChanges(['docs/ARCHITECTURE.md', 'README.md']);
    expect(docsOnly).toMatchObject({
      affectsAppBuild: false,
      affectsE2e: false,
      affectsLint: false,
      affectsHarness: false,
      affectsUnitTests: false,
    });
  });

  it('parses CLI flags accurately', () => {
    expect(parseVerifyArgs(['--full', '--base', 'origin/main', '--json'])).toEqual({
      full: true,
      base: 'origin/main',
      json: true,
      ciDiffCheck: false,
    });
    expect(parseVerifyArgs(['--base=HEAD^1', '--ci-diff-check'])).toEqual({
      full: Boolean(process.env.CI === 'true'),
      base: 'HEAD^1',
      json: false,
      ciDiffCheck: true,
    });
  });

  it('skips unaffected stages on diff and reuses cached verdicts on repeat / sibling runs', () => {
    const git = (...args: string[]) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], {
        cwd: repoDir,
        stdio: 'ignore',
      });

    mkdirSync(path.join(repoDir, 'src'), { recursive: true });
    mkdirSync(path.join(repoDir, 'docs/harness'), { recursive: true });
    writeFileSync(path.join(repoDir, 'src/index.ts'), 'export const app = 1;\n', 'utf8');
    writeFileSync(path.join(repoDir, 'AGENTS.md'), '# Rules\n', 'utf8');

    git('init', '-q', '-b', 'main');
    git('add', '-A');
    git('commit', '-qm', 'initial');

    // Modify only AGENTS.md (harness change, no lintable JS/TS change, no app build change)
    writeFileSync(path.join(repoDir, 'AGENTS.md'), '# Rules\n- updated\n', 'utf8');

    const calls: string[] = [];
    const mockRunner = (cmd: string, args: string[]) => {
      calls.push(`${cmd} ${args.join(' ')}`);
      return 15;
    };

    const firstRun = runVerifyGate({
      rootDir: repoDir,
      base: 'HEAD',
      scratchpadDir,
      runner: mockRunner,
    });

    expect(firstRun.ok).toBe(true);
    expect(firstRun.results.map((r) => [r.stage, r.mode])).toEqual([
      ['lint', 'skipped-diff'],
      ['test', 'full'],
      ['build', 'skipped-diff'],
    ]);
    expect(calls).toEqual(['npx vitest run']);
    expect(existsSync(path.join(repoDir, '.tmp', 'quality-gate-passed'))).toBe(true);

    // Second run with the same working tree state hits the shared scratchpad cache for all 3 stages
    calls.length = 0;
    const secondRun = runVerifyGate({
      rootDir: repoDir,
      base: 'HEAD',
      scratchpadDir,
      runner: mockRunner,
    });
    expect(secondRun.results.map((r) => [r.stage, r.mode])).toEqual([
      ['lint', 'cached'],
      ['test', 'cached'],
      ['build', 'cached'],
    ]);
    expect(calls).toEqual([]);

    // Full mode forces execution of all stages even when cached
    calls.length = 0;
    const fullRun = runVerifyGate({
      rootDir: repoDir,
      full: true,
      base: 'HEAD',
      scratchpadDir,
      runner: mockRunner,
    });
    expect(fullRun.results.map((r) => [r.stage, r.mode])).toEqual([
      ['lint', 'full'],
      ['test', 'full'],
      ['build', 'full'],
    ]);
    expect(calls.length).toBe(3);
  });
});
