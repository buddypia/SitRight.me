import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classifyChanges, computeFilesFingerprint, ensureAgentScratchpad, getStageVerdict, isAppBuildAffecting, isE2eAffecting, isHarnessAffecting, isLintAffecting, isUnitTestAffecting, recordStageVerdict, resolveCheckoutRoot, resolveMainRepoRoot, runVerifyGate, withScratchpadLock } from '../../scripts/verify-gate.mjs';
import { validateHarness } from '../../scripts/check-agent-harness.mjs';

describe('verify-gate and shared agent-scratchpad', () => {
  let sandboxDir: string;
  beforeEach(() => { sandboxDir = mkdtempSync(path.join(tmpdir(), 'sitright-verify-')); });
  afterEach(() => { delete process.env.SITRIGHT_AGENT_SCRATCHPAD_DIR; rmSync(sandboxDir, { recursive: true, force: true }); });

  it('resolves main repo root from worktree .git file, fingerprints files, and reaps stale locks', () => {
    const mainRoot = path.join(sandboxDir, 'main'), wtGitDir = path.join(mainRoot, '.git/worktrees/feat-a'), wtRoot = path.join(mainRoot, '.worktrees/feat-a');
    mkdirSync(wtGitDir, { recursive: true });
    mkdirSync(wtRoot, { recursive: true });
    writeFileSync(path.join(wtGitDir, 'commondir'), '../..\n');
    writeFileSync(path.join(wtRoot, '.git'), `gitdir: ${wtGitDir}\n`);

    expect(resolveCheckoutRoot(wtRoot)).toBe(wtRoot);
    expect(resolveMainRepoRoot(wtRoot)).toBe(mainRoot);
    const scratchpadDir = ensureAgentScratchpad(wtRoot);
    expect(lstatSync(path.join(wtRoot, '.tmp/agent-scratchpad')).isSymbolicLink()).toBe(true);

    writeFileSync(path.join(mainRoot, 'a.ts'), 'export const x = 1;\n');
    writeFileSync(path.join(wtRoot, 'a.ts'), 'export const x = 1;\n');
    const past = new Date(Date.now() - 60_000);
    utimesSync(path.join(mainRoot, 'a.ts'), past, past);
    expect(computeFilesFingerprint(mainRoot, ['a.ts'], { scratchpadDir })).toBe(computeFilesFingerprint(wtRoot, ['a.ts'], { scratchpadDir }));

    const staleLock = path.join(scratchpadDir, 'locks/next-build.lock');
    mkdirSync(staleLock, { recursive: true });
    writeFileSync(path.join(staleLock, 'owner.json'), JSON.stringify({ pid: 99999999, acquiredAt: 1 }));
    expect(withScratchpadLock('next-build', ({ acquired }: { acquired: boolean }) => acquired, { scratchpadDir })).toBe(true);
    expect(existsSync(staleLock)).toBe(false);

    recordStageVerdict('build', 'h1', { worktree: wtRoot }, { scratchpadDir });
    expect(getStageVerdict('build', 'h1', { scratchpadDir })?.status).toBe('pass');
  });

  it('classifies changed paths and skips unaffected or cached stages across runs', () => {
    expect(isAppBuildAffecting('src/app/page.tsx')).toBe(true);
    expect(isAppBuildAffecting('docs/ARCHITECTURE.md')).toBe(false);
    expect(isE2eAffecting('tests/e2e/posture.spec.ts')).toBe(true);
    expect(isLintAffecting('src/utils/pose.ts')).toBe(true);
    expect(isHarnessAffecting('AGENTS.md')).toBe(true);
    expect(isUnitTestAffecting('docs/ARCHITECTURE.md')).toBe(false);
    expect(classifyChanges(['AGENTS.md'])).toMatchObject({ affectsAppBuild: false, affectsE2e: false, affectsLint: false, affectsHarness: true, affectsUnitTests: true });

    const repoDir = path.join(sandboxDir, 'repo'), scratchpadDir = path.join(sandboxDir, 'sp');
    mkdirSync(path.join(repoDir, 'src'), { recursive: true });
    mkdirSync(scratchpadDir, { recursive: true });
    writeFileSync(path.join(repoDir, 'src/index.ts'), 'export const v = 1;\n');
    writeFileSync(path.join(repoDir, 'AGENTS.md'), '# Rules\n- updated\n');

    const calls: string[] = [];
    const runner = (c: string, a: string[]) => { calls.push(`${c} ${a[0]}`); return 0; };
    const r1 = runVerifyGate({ rootDir: repoDir, changedFiles: ['AGENTS.md'], allFiles: ['src/index.ts', 'AGENTS.md'], scratchpadDir, runner });
    expect(r1.results.map((r: { stage: string; mode: string }) => [r.stage, r.mode])).toEqual([['lint', 'skipped-diff'], ['type-check', 'skipped-diff'], ['harness', 'full'], ['test', 'full'], ['build', 'skipped-diff']]);
    expect(calls).toEqual(['npm run', 'npx vitest']);

    calls.length = 0;
    const r2 = runVerifyGate({ rootDir: repoDir, changedFiles: ['AGENTS.md'], allFiles: ['src/index.ts', 'AGENTS.md'], scratchpadDir, runner });
    expect(r2.results.map((r: { stage: string; mode: string }) => r.mode)).toEqual(['skipped-diff', 'skipped-diff', 'cached', 'cached', 'skipped-diff']);
    expect(calls).toEqual([]);
  });

  it('does not reuse a diff skip as proof when that stage becomes required', () => {
    const rootDir = path.join(sandboxDir, 'repo'), scratchpadDir = path.join(sandboxDir, 'sp');
    mkdirSync(rootDir);
    writeFileSync(path.join(rootDir, 'a.ts'), 'const a: number = 1;');
    const calls: string[] = [];
    const options = { rootDir, scratchpadDir, allFiles: ['a.ts'], runner: (c: string, a: string[]) => { calls.push([c, ...a].join(' ')); } };
    runVerifyGate({ ...options, changedFiles: ['docs/readme.md'] });
    expect(calls).toEqual(['npm run check:harness']);
    runVerifyGate({ ...options, changedFiles: ['a.ts'] });
    expect(calls.some((c) => c.startsWith('npx eslint'))).toBe(true);
    expect(calls).toContain('npm run type-check');
    expect(calls).toContain('npx vitest run');
  });

  it('records stage evidence and removes an old success marker when validation fails', () => {
    const rootDir = path.join(sandboxDir, 'repo'), scratchpadDir = path.join(sandboxDir, 'sp');
    mkdirSync(rootDir);
    const options = { rootDir, scratchpadDir, allFiles: [], changedFiles: ['AGENTS.md'], full: true };
    runVerifyGate({ ...options, runner: () => {} });
    expect(existsSync(path.join(rootDir, '.tmp/quality-gate-passed'))).toBe(true);
    expect(() => runVerifyGate({ ...options, runner: (c: string, a: string[]) => {
      if (c === 'npm' && a[1] === 'check:harness') throw new Error('invalid hook');
    } })).toThrow('invalid hook');
    expect(existsSync(path.join(rootDir, '.tmp/quality-gate-passed'))).toBe(false);
    const receipt = JSON.parse(readFileSync(path.join(rootDir, '.tmp/quality-gate-receipt.json'), 'utf8'));
    expect(receipt).toMatchObject({ ok: false, classification: { affectsHarness: true } });
    expect(receipt.results.map((r: { stage: string; status: string }) => [r.stage, r.status])).toEqual([
      ['lint', 'pass'], ['type-check', 'pass'], ['harness', 'fail'],
    ]);
    expect(receipt.results[2]).toMatchObject({ command: ['npm', 'run', 'check:harness'], mode: 'full', fingerprint: expect.any(String), durationMs: expect.any(Number) });
    expect(receipt.results[2]).not.toHaveProperty('error'); // command output may contain secrets
    expect(receipt.startedAt).toEqual(expect.any(String));
    expect(receipt.finishedAt).toEqual(expect.any(String));
    const history = readFileSync(path.join(rootDir, '.tmp/quality-gate-history.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(history.map((run) => run.ok)).toEqual([true, false]);
    const rerun: string[] = [];
    runVerifyGate({ ...options, full: false, runner: (c: string, a: string[]) => { rerun.push([c, ...a].join(' ')); } });
    expect(rerun).toContain('npm run check:harness');
  });

  it('invalidates type and harness proof when their source inputs change', () => {
    const rootDir = path.join(sandboxDir, 'repo'), scratchpadDir = path.join(sandboxDir, 'sp');
    mkdirSync(rootDir);
    writeFileSync(path.join(rootDir, 'tsconfig.json'), '{"strict":false}');
    writeFileSync(path.join(rootDir, 'AGENTS.md'), '# old');
    const options = { rootDir, scratchpadDir, allFiles: ['tsconfig.json', 'AGENTS.md'] };
    runVerifyGate({ ...options, full: true, runner: () => {} });
    writeFileSync(path.join(rootDir, 'tsconfig.json'), '{"strict":true}');
    writeFileSync(path.join(rootDir, 'AGENTS.md'), '# new instructions');
    const calls: string[] = [];
    runVerifyGate({ ...options, changedFiles: ['tsconfig.json', 'AGENTS.md'], runner: (c: string, a: string[]) => { calls.push([c, ...a].join(' ')); } });
    expect(calls).toContain('npm run type-check');
    expect(calls).toContain('npm run check:harness');
  });

  it('refuses to overwrite shared verdicts without owning the cache lock', () => {
    const scratchpadDir = path.join(sandboxDir, 'sp');
    recordStageVerdict('lint', 'first', {}, { scratchpadDir });
    const lock = path.join(scratchpadDir, 'locks/verify-cache.lock');
    mkdirSync(lock, { recursive: true });
    writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid }));
    const before = readFileSync(path.join(scratchpadDir, 'verify-cache.json'), 'utf8');
    expect(() => recordStageVerdict('test', 'second', {}, { scratchpadDir, timeoutMs: 0 })).toThrow(/lock/i);
    expect(readFileSync(path.join(scratchpadDir, 'verify-cache.json'), 'utf8')).toBe(before);
    rmSync(lock, { recursive: true });
    recordStageVerdict('test', 'second', {}, { scratchpadDir });
    expect(getStageVerdict('lint', 'first', { scratchpadDir })?.status).toBe('pass');
    expect(getStageVerdict('test', 'second', { scratchpadDir })?.status).toBe('pass');
  });

  it('rejects deleting a referenced document instead of reusing harness proof', () => {
    const rootDir = path.join(sandboxDir, 'repo'), scratchpadDir = path.join(sandboxDir, 'sp');
    mkdirSync(path.join(rootDir, 'docs'), { recursive: true });
    writeFileSync(path.join(rootDir, 'AGENTS.md'), '# Rules\nRead `docs/ARCHITECTURE.md`.\n');
    writeFileSync(path.join(rootDir, 'CLAUDE.md'), '@AGENTS.md\n');
    writeFileSync(path.join(rootDir, 'docs/ARCHITECTURE.md'), '# Architecture\n');
    const options = {
      rootDir, scratchpadDir, allFiles: ['AGENTS.md', 'CLAUDE.md', 'docs/ARCHITECTURE.md'],
      runner: (c: string, a: string[]) => {
        if (c === 'npm' && a[1] === 'check:harness') {
          const errors = validateHarness(rootDir);
          if (errors.length) throw new Error(errors.join('\n'));
        }
      },
    };
    runVerifyGate({ ...options, full: true });
    rmSync(path.join(rootDir, 'docs/ARCHITECTURE.md'));
    expect(() => runVerifyGate({ ...options, changedFiles: ['docs/ARCHITECTURE.md'] })).toThrow(/ARCHITECTURE/);
    expect(existsSync(path.join(rootDir, '.tmp/quality-gate-passed'))).toBe(false);
  });

  it('keeps zero external dependencies and fd-bound fingerprint reads (CodeQL js/file-system-race)', () => {
    const src = readFileSync(path.resolve(__dirname, '../../scripts/verify-gate.mjs'), 'utf8');
    const specifiers = [...src.matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.filter((s) => !s.startsWith('node:'))).toEqual([]);

    const body = /export function computeFilesFingerprint[\s\S]*?\n}\n/.exec(src)?.[0] ?? '';
    expect(body).toMatch(/openSync\([^)]*\)[\s\S]*fstatSync\(fd\)[\s\S]*readFileSync\(fd\)/);
    expect(body).not.toMatch(/\b(?:existsSync|statSync|lstatSync|accessSync)\(/);
  });
});
