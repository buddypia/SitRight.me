import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ESLint } from 'eslint';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ALWAYS_ON_MAX,
  diffHarness,
  diffWarnings,
  parseArgs,
  validateHarness,
} from '../../scripts/check-agent-harness.mjs';
import { buildIndex, parseEntry } from '../../scripts/harness-library.mjs';
import { findSceneBackdrop } from '../../scripts/lib/scene-backdrop.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');

const TRIGGER = '- デモのときは `.agents/skills/demo/SKILL.md` を読んで従う。\n';
const SKILL = '---\nname: demo\ndescription: デモ用の skill\n---\n\n# demo\n';

// #42 で e2e を止めた要素と同じ形
const OVERLAY_42 =
  '<div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]" />';

const ENTRY = `# デモの教訓

- 領域: demo
- 日付: 2026-10-20
- 出典: #1

## 部品ごとの変更と観察

| 部品 | 変更 | 観察 | 判定 |
|---|---|---|---|
| \`AGENTS.md\` | 規則を 1 行足した | 3 回中 3 回で手順が揃った | 効いた |

## 持ち越す教訓

- **きっかけ**: 実行ごとに手順が分かれる
- **教訓**: 分かれた手順を AGENTS.md に 1 行で書く
- **根拠**: 1 行目
- **確度**: 中 — 1 件だけ
`;

// ESLint の初回読み込み（ローカルで 8 秒前後）と node プロセスの起動（1 件 1〜5 秒）は既定の 5 秒に収まらない
const SLOW = { timeout: 30_000 };

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

describe('check-agent-harness: hook の登録と subagent', () => {
  const registry = (cliTargets: string[]) =>
    JSON.stringify({
      hooks: {
        PostToolUse: [
          { matcher: 'Edit', hooks: [{ id: 'demo-guard', module: '.cli/hooks/demo-guard.mjs', cliTargets }] },
        ],
      },
    });
  const settings = (command: string) =>
    JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command }] }] } });

  it('hook-registry の hook が settings.json と .codex/hooks.json の両方に無ければ落ちる', () => {
    scaffold();
    write('.cli/hooks/demo-guard.mjs', 'export {};\n');
    write('.claude/config/hook-registry.local.json', registry(['codex']));
    const errs = validateHarness(root).join('\n');
    expect(errs).toMatch(/hook "demo-guard" が \.claude\/settings\.json の PostToolUse にありません/);
    expect(errs).toMatch(/hook "demo-guard" が \.codex\/hooks\.json の PostToolUse にありません/);
  });

  it('3 か所に登録された hook は通り、codex を対象にしない hook は .codex/hooks.json を求めない', () => {
    scaffold();
    write('.cli/hooks/demo-guard.mjs', 'export {};\n');
    write('.cli/_cli-dispatch.mjs', 'export {};\n');
    write('.claude/config/hook-registry.local.json', registry(['codex']));
    write('.claude/settings.json', settings('node "${CLAUDE_PROJECT_DIR}/.cli/hooks/demo-guard.mjs"'));
    write(
      '.codex/hooks.json',
      settings('node .cli/_cli-dispatch.mjs .cli/hooks/demo-guard.mjs codex PostToolUse demo-guard'),
    );
    expect(validateHarness(root)).toEqual([]);

    rmSync(path.join(root, '.codex/hooks.json'));
    write('.claude/config/hook-registry.local.json', registry([]));
    expect(validateHarness(root)).toEqual([]);
  });

  it('構文として通らない hook モジュールは落ちる', () => {
    scaffold();
    write('.cli/hooks/demo-guard.mjs', 'export function run( {\n');
    write('.claude/settings.json', settings('node "${CLAUDE_PROJECT_DIR}/.cli/hooks/demo-guard.mjs"'));
    expect(validateHarness(root).join('\n')).toMatch(/`\.cli\/hooks\/demo-guard\.mjs` が構文として通りません（SyntaxError/);
  });

  it('description の無い subagent は落ちる', () => {
    scaffold();
    write('.claude/agents/reviewer.md', '---\nname: reviewer\n---\n\n本文\n');
    expect(validateHarness(root).join('\n')).toMatch(/\.claude\/agents\/reviewer\.md の frontmatter に description/);
  });
});

describe('harness-library', () => {
  const entryPath = 'docs/harness/experience/2026-10-20-demo.md';

  function withEntry(entry: string) {
    if (!existsSync(path.join(root, 'AGENTS.md'))) scaffold();
    write(entryPath, entry);
    write('docs/harness/INDEX.md', buildIndex(root));
  }

  it('エントリを読み、INDEX.md に領域・確度・きっかけを載せる', () => {
    const entry = parseEntry(ENTRY);
    expect(entry.area).toBe('demo');
    expect(entry.rows).toEqual([
      { component: '`AGENTS.md`', change: '規則を 1 行足した', observed: '3 回中 3 回で手順が揃った', verdict: '効いた' },
    ]);
    withEntry(ENTRY);
    expect(validateHarness(root)).toEqual([]);
    const index = buildIndex(root);
    expect(index).toMatch(/## demo/);
    expect(index).toMatch(/\(experience\/2026-10-20-demo\.md\) — 2026-10-20 · 確度 中/);
    expect(index).toMatch(/きっかけ: 実行ごとに手順が分かれる/);
  });

  it('値の空いた教訓の欄は、次の行を値として拾わずに落ちる', () => {
    withEntry(ENTRY.replace('- **教訓**: 分かれた手順を AGENTS.md に 1 行で書く', '- **教訓**:'));
    expect(validateHarness(root).join('\n')).toMatch(/`- \*\*教訓\*\*:` がありません/);
  });

  it('判定の語・教訓の欄・日付が崩れたエントリは落ちる', () => {
    withEntry(
      ENTRY.replace('| 効いた |', '| たぶん効いた |')
        .replace(/^- \*\*根拠\*\*:.*\n/m, '')
        .replace('- 日付: 2026-10-20', '- 日付: 2026-10-21'),
    );
    const errs = validateHarness(root).join('\n');
    expect(errs).toMatch(/判定「たぶん効いた」は/);
    expect(errs).toMatch(/`- \*\*根拠\*\*:` がありません/);
    expect(errs).toMatch(/ファイル名の日付 2026-10-20 と違います/);
  });

  it('どの行も「切り分け不能」なのに確度が「低」でなければ落ちる', () => {
    withEntry(ENTRY.replace('| 効いた |', '| 切り分け不能 |'));
    expect(validateHarness(root).join('\n')).toMatch(/確度は「低」にしてください/);
    withEntry(ENTRY.replace('| 効いた |', '| 切り分け不能 |').replace('**確度**: 中', '**確度**: 低'));
    expect(validateHarness(root)).toEqual([]);
  });

  it('INDEX.md がエントリと食い違うと落ちる', () => {
    withEntry(ENTRY);
    write('docs/harness/experience/2026-10-21-more.md', ENTRY.replace('2026-10-20', '2026-10-21'));
    expect(validateHarness(root).join('\n')).toMatch(/npm run harness:index/);
  });
});

describe('check-agent-harness --base', SLOW, () => {
  it('--base <ref> と --base=<ref> を受け、値の無い --base は誤りにする', () => {
    expect(parseArgs(['--base', 'origin/main'])).toEqual({ rootArg: undefined, base: 'origin/main' });
    expect(parseArgs(['/repo', '--base=HEAD^1'])).toEqual({ rootArg: '/repo', base: 'HEAD^1' });
    expect(() => parseArgs(['--base'])).toThrow(/--base には/);
    expect(() => parseArgs(['--base='])).toThrow(/--base には/);
  });

  function git(...args: string[]) {
    const res = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
  }

  it('harness の追加・変更と常駐の増減を出し、常駐の増加とエントリなしの変更を警告する', () => {
    scaffold();
    write('src/a.ts', 'export {};\n');
    git('init', '-q');
    git('add', '-A');
    git('commit', '-qm', 'base');

    write('AGENTS.md', `# demo\n\n${TRIGGER}- 追加の規則。\n`);
    write('.cli/hooks/new-guard.mjs', 'export {};\n');
    write('src/a.ts', 'export const a = 1;\n');
    const diff = diffHarness(root, 'HEAD');
    expect(diff).toEqual({
      added: ['.cli/hooks/new-guard.mjs'],
      removed: [],
      modified: ['AGENTS.md'],
      alwaysOnDelta: [...'- 追加の規則。\n'].length,
    });
    const warnings = diffWarnings(diff).join('\n');
    expect(warnings).toMatch(/常駐が 9 字増えています/);
    expect(warnings).toMatch(/エントリがありません/);

    write('docs/harness/experience/2026-10-20-demo.md', ENTRY);
    expect(diffWarnings(diffHarness(root, 'HEAD')).join('\n')).not.toMatch(/エントリがありません/);
  });
});

describe('scene-backdrop', SLOW, () => {
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

describe('PostToolUse hooks', SLOW, () => {
  function gitInit() {
    spawnSync('git', ['init', '-q'], { cwd: root });
  }

  function runHook(args: string[], payload: object) {
    const res = spawnSync('node', args, {
      cwd: root,
      input: JSON.stringify({ cwd: root, ...payload }),
      encoding: 'utf8',
      // 高負荷では hook 内の git（rev-parse 2 秒）が時間切れになり passthrough する。待ち時間だけを広げる（.cli/lib/utils.mjs）
      env: { ...process.env, CLAUDE_PROJECT_DIR: root, ECC_DISABLED_HOOKS: '', BRIEF2DEV_EXEC_TIMEOUT_FLOOR_MS: '20000' },
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

  it('agent-harness-check: 経験ライブラリのエントリを崩す編集を block する', () => {
    gitInit();
    scaffold();
    write('docs/harness/experience/2026-10-20-demo.md', ENTRY.replace('| 効いた |', '| 良さそう |'));
    write('docs/harness/INDEX.md', buildIndex(root));
    const out = runHook(claude('agent-harness-check'), {
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'docs/harness/experience/2026-10-20-demo.md') },
    });
    expect(out.decision).toBe('block');
    expect(out.reason).toMatch(/判定「良さそう」は/);
  });

  it('agent-harness-check: 構文の壊れた hook モジュールの編集を block する', () => {
    gitInit();
    scaffold();
    write('.cli/hooks/demo-guard.mjs', 'export function run( {\n');
    const out = runHook(claude('agent-harness-check'), {
      tool_name: 'Edit',
      tool_input: { file_path: path.join(root, '.cli/hooks/demo-guard.mjs') },
    });
    expect(out.decision).toBe('block');
    expect(out.reason).toMatch(/demo-guard\.mjs` が構文として通りません/);
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
