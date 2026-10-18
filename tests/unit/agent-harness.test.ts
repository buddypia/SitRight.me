import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ESLint } from 'eslint';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ALWAYS_ON_MAX, validateHarness } from '../../scripts/check-agent-harness.mjs';
import { findSceneBackdrop } from '../../scripts/lib/scene-backdrop.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');

const TRIGGER = '- デモのときは `.agents/skills/demo/SKILL.md` を読んで従う。\n';
const SKILL = '---\nname: demo\ndescription: デモ用の skill\n---\n\n# demo\n';

// #42 で e2e を止めた要素と同じ形
const OVERLAY_42 =
  '<div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]" />';

let root: string;

function write(rel: string, content: string) {
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function scaffold({ agents = `# demo\n\n${TRIGGER}`, skill = SKILL } = {}) {
  write('AGENTS.md', agents);
  write('CLAUDE.md', '@AGENTS.md\n');
  write('.claude/skills/demo/SKILL.md', skill);
  mkdirSync(path.join(root, '.agents/skills'), { recursive: true });
  symlinkSync('../../.claude/skills/demo', path.join(root, '.agents/skills/demo'));
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'agent-harness-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('check-agent-harness', () => {
  it('このリポジトリの harness は通る', () => {
    expect(validateHarness(REPO)).toEqual([]);
  });

  it('トリガー行・symlink・frontmatter が揃った skill は通る', () => {
    scaffold();
    expect(validateHarness(root)).toEqual([]);
  });

  it('AGENTS.md が 8,000 字を超えると落ちる', () => {
    scaffold({ agents: TRIGGER + 'あ'.repeat(ALWAYS_ON_MAX) });
    expect(validateHarness(root).join('\n')).toMatch(/上限 8000 字/);
  });

  it('AGENTS.md が無い、CLAUDE.md に指示を書いた、のどちらも落ちる', () => {
    scaffold();
    rmSync(path.join(root, 'AGENTS.md'));
    write('CLAUDE.md', '@AGENTS.md\n\n- 追加の規則\n');
    const errs = validateHarness(root).join('\n');
    expect(errs).toMatch(/AGENTS\.md が無いか空/);
    expect(errs).toMatch(/CLAUDE\.md は `@AGENTS\.md` の 1 行だけ/);
  });

  it('AGENTS.md にトリガー行の無い skill は落ちる', () => {
    scaffold({ agents: '# demo\n\ndemo という skill がある。\n' });
    expect(validateHarness(root).join('\n')).toMatch(/skill "demo" のトリガー行/);
  });

  it('description が無い、name がディレクトリ名と違う skill は落ちる', () => {
    scaffold({ skill: '---\nname: other\n---\n' });
    const errs = validateHarness(root).join('\n');
    expect(errs).toMatch(/description がありません/);
    expect(errs).toMatch(/`name: other` がディレクトリ名と違います/);
  });

  it('.agents/skills に symlink の無い skill は落ちる', () => {
    scaffold();
    rmSync(path.join(root, '.agents/skills/demo'));
    expect(validateHarness(root).join('\n')).toMatch(/\.agents\/skills\/demo がありません/);
  });

  it('SKILL.md が呼ぶスクリプトと AGENTS.md が指すファイルは実在しなければ落ちる', () => {
    scaffold({
      agents: `# demo\n\n${TRIGGER}- 詳しくは \`docs/MISSING.md\`。\n`,
      skill: `${SKILL}\n\`\`\`bash\nnode scripts/missing.mjs\npython3 scripts/local.py\n\`\`\`\n`,
    });
    write('.claude/skills/demo/scripts/local.py', 'print(1)\n');
    const errs = validateHarness(root);
    expect(errs).toHaveLength(2);
    expect(errs.join('\n')).toMatch(/`scripts\/missing\.mjs` を呼んでいますが/);
    expect(errs.join('\n')).toMatch(/`docs\/MISSING\.md` がありません/);
  });

  it('.codex/hooks.json の未知のイベント・command 以外の型・無いモジュールは落ちる', () => {
    scaffold();
    write(
      '.codex/hooks.json',
      JSON.stringify({
        hooks: {
          OnEdit: [],
          PostToolUse: [
            { matcher: 'Bash', hooks: [{ type: 'prompt', prompt: 'x' }] },
            { matcher: 'Bash', hooks: [{ type: 'command', command: 'node .cli/hooks/missing.mjs' }] },
          ],
        },
      }),
    );
    const errs = validateHarness(root).join('\n');
    expect(errs).toMatch(/未知のイベント OnEdit/);
    expect(errs).toMatch(/type は "command"/);
    expect(errs).toMatch(/`\.cli\/hooks\/missing\.mjs` がありません/);
  });
});

describe('scene-backdrop', () => {
  it('全面配置と backdrop-filter を併せ持つ文字列だけを拾う', () => {
    const source = [
      OVERLAY_42,
      '<div className={`fixed inset-0 ${open ? "opacity-100" : "opacity-0"} backdrop-blur-md`} />',
      '<div className="absolute bottom-3 right-3 rounded-full bg-black/30 backdrop-blur-sm" />',
      '<div className="absolute inset-0 bg-black/60" />',
      '// inset-0 の上に backdrop-filter を置かない',
    ].join('\n');
    expect(findSceneBackdrop(source)).toEqual([1, 2]);
  });

  it('ESLint が src/ の違反を error にし、小さい要素のぼかしは通す', async () => {
    const eslint = new ESLint({ cwd: REPO });
    const code = [
      `export const A = () => ${OVERLAY_42};`,
      'export const B = ({ on }: { on: boolean }) => <div className={`fixed inset-0 ${on ? "a" : "b"} backdrop-blur-md`} />;',
      'export const C = () => <div className="absolute bottom-3 right-3 backdrop-blur-sm" />;',
    ].join('\n');
    const [result] = await eslint.lintText(code, { filePath: path.join(REPO, 'src/components/Probe/Probe.tsx') });
    const hits = result.messages.filter((m) => m.ruleId === 'no-restricted-syntax');
    expect(hits.map((m) => m.line)).toEqual([1, 2]);
    expect(hits.every((m) => m.severity === 2)).toBe(true);
  });
});

describe('PostToolUse hooks', () => {
  function gitInit() {
    spawnSync('git', ['init', '-q'], { cwd: root });
  }

  function runHook(args: string[], payload: object) {
    const res = spawnSync('node', args, {
      cwd: root,
      input: JSON.stringify({ cwd: root, ...payload }),
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_PROJECT_DIR: root, ECC_DISABLED_HOOKS: '' },
    });
    expect(res.status).toBe(0);
    const out = res.stdout.trim();
    return out ? JSON.parse(out) : {};
  }

  const claude = (id: string) => [path.join(REPO, `.cli/hooks/${id}.mjs`)];
  const codex = (id: string) => [
    path.join(REPO, '.cli/_cli-dispatch.mjs'),
    `.cli/hooks/${id}.mjs`,
    'codex',
    'PostToolUse',
    id,
  ];

  it('scene-backdrop-guard: Claude の Write で違反を block し、理由に場所と直し方を返す', () => {
    gitInit();
    write('src/components/Overlay.tsx', `export const O = () => ${OVERLAY_42};\n`);
    const out = runHook(claude('scene-backdrop-guard'), {
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'src/components/Overlay.tsx') },
    });
    expect(out.decision).toBe('block');
    expect(out.reason).toMatch(/src\/components\/Overlay\.tsx:1/);
    expect(out.reason).toMatch(/bg-black\/60/);
  });

  it('scene-backdrop-guard: Codex の apply_patch でも block し、src/ の外は見ない', () => {
    gitInit();
    write('src/components/Overlay.tsx', `export const O = () => ${OVERLAY_42};\n`);
    write('docs/note.tsx', OVERLAY_42);
    const patch = (file: string) => `*** Begin Patch\n*** Update File: ${file}\n@@\n-x\n+y\n*** End Patch\n`;
    const hit = runHook(codex('scene-backdrop-guard'), {
      tool_name: 'apply_patch',
      tool_input: { command: patch('src/components/Overlay.tsx') },
    });
    expect(hit.decision).toBe('block');
    const miss = runHook(codex('scene-backdrop-guard'), {
      tool_name: 'apply_patch',
      tool_input: { command: patch('docs/note.tsx') },
    });
    expect(miss).toEqual({});
  });

  it('agent-harness-check: トリガー行を消す編集を block し、直せば通す', () => {
    gitInit();
    scaffold({ agents: '# demo\n' });
    const payload = { tool_name: 'Edit', tool_input: { file_path: path.join(root, 'AGENTS.md') } };
    const broken = runHook(claude('agent-harness-check'), payload);
    expect(broken.decision).toBe('block');
    expect(broken.reason).toMatch(/skill "demo" のトリガー行/);

    write('AGENTS.md', `# demo\n\n${TRIGGER}`);
    expect(runHook(claude('agent-harness-check'), payload)).toEqual({});
  });

  it('agent-harness-check: harness 以外のファイルの編集では検査しない', () => {
    gitInit();
    scaffold({ agents: '# demo\n' });
    write('src/a.ts', 'export {};\n');
    const out = runHook(codex('agent-harness-check'), {
      tool_name: 'apply_patch',
      tool_input: { command: '*** Begin Patch\n*** Update File: src/a.ts\n@@\n-x\n+y\n*** End Patch\n' },
    });
    expect(out).toEqual({});
  });
});
