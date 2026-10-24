import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classifyChanges, computeFilesFingerprint, ensureAgentScratchpad, getStageVerdict, isAppBuildAffecting, isE2eAffecting, isHarnessAffecting, isLintAffecting, isUnitTestAffecting, recordStageVerdict, resolveCheckoutRoot, resolveMainRepoRoot, runVerifyGate, withScratchpadLock } from '../../scripts/verify-gate.mjs';

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
    expect(r1.results.map((r: { stage: string; mode: string }) => [r.stage, r.mode])).toEqual([['lint', 'skipped-diff'], ['test', 'full'], ['build', 'skipped-diff']]);
    expect(calls).toEqual(['npx vitest']);

    calls.length = 0;
    const r2 = runVerifyGate({ rootDir: repoDir, changedFiles: ['AGENTS.md'], allFiles: ['src/index.ts', 'AGENTS.md'], scratchpadDir, runner });
    expect(r2.results.map((r: { stage: string; mode: string }) => r.mode)).toEqual(['cached', 'cached', 'cached']);
    expect(calls).toEqual([]);
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
