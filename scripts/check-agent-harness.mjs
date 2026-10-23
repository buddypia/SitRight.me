#!/usr/bin/env node
/**
 * エージェント向け指示（AGENTS.md・skill・hook）を検査する。
 * Google Research の Harness²（harness2/core/tree.py#validate）が harness の採用前に掛ける検査を、
 * このリポジトリの Claude Code / Codex 構成に合わせて移したもの。どれも、壊れていてもエラーにならず
 * 黙って効かなくなる種類の問題。
 *
 * - AGENTS.md は 8,000 字まで。毎ターン丸ごと注入され、エージェントの出力トークンと取り合う
 * - CLAUDE.md は `@AGENTS.md` の 1 行だけ（同じ指示を 2 か所に書かない）
 * - skill は `.claude/skills` と `.agents/skills` の両方にあり、description を持ち、name がディレクトリ名と
 *   一致し、AGENTS.md にトリガー行（`.agents/skills/<name>/SKILL.md`）がある。名前の出てこない skill は開かれない
 * - AGENTS.md と SKILL.md が呼ぶスクリプト、AGENTS.md が指すファイルは実在する
 * - hook 設定の形が正しく、呼ぶモジュールが実在し、構文として通る（ESLint は `.cli/**` を見ない）
 * - `.claude/config/hook-registry.local.json` の hook は `.claude/settings.json` と `.codex/hooks.json` にも登録されている
 * - subagent（`.claude/agents/*.md`）は description を持つ
 * - 経験ライブラリ（docs/harness/）のエントリが揃い、INDEX.md と食い違わない（scripts/harness-library.mjs）
 *
 * `--base <ref>` を付けると、ref からの harness の変更（追加・削除・変更）と AGENTS.md の字数の増減も出す
 * （harness2/core/tree.py#diff_summary）。常駐が増えた、または経験エントリなしで harness を変えたときは警告する。
 *
 * Usage:
 *   node scripts/check-agent-harness.mjs [root] [--base <ref>]
 *   npm run check:harness [-- --base origin/main]
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';
import { checkLibrary, EXPERIENCE_DIR, LIBRARY_DIR } from './harness-library.mjs';

export const ALWAYS_ON_MAX = 8000;

const SKILL_DIRS = ['.claude/skills', '.agents/skills'];
const TRIGGER_DIR = '.agents/skills';
const HOOK_FILES = ['.codex/hooks.json', '.claude/settings.json'];
const HOOK_REGISTRY = '.claude/config/hook-registry.local.json';
const SUBAGENT_DIR = '.claude/agents';

// Codex が発火させる hook イベント（harness2/substrate/codex.py#hook_events）
const CODEX_HOOK_EVENTS = new Set([
  'PreToolUse',
  'PostToolUse',
  'PermissionRequest',
  'PreCompact',
  'PostCompact',
  'SessionStart',
  'SubagentStart',
  'SubagentStop',
  'UserPromptSubmit',
  'Stop',
]);

// 実在しなくてよいスクリプト参照。ui-approval-gate はこの CLI が無ければ明示承認（T2）に落ちる作りで、
// brief2dev は承認ポリシーを持つプロジェクトにだけこれを配る
const OPTIONAL_SCRIPT_REFS = new Set(['.claude/scripts/approval-policy.mjs']);

const SCRIPT_REF = /(?:node|python3?)\s+((?:\.{1,2}\/)?[\w./-]+\.(?:mjs|cjs|js|py|sh))\b/g;
const PATH_REF = /`((?:docs|scripts|src|tests|\.agents|\.claude|\.codex|\.cli|\.github)\/[^`\s]*)`/g;
const HOOK_MODULE_REF = /((?:\.cli|\.claude)\/[\w./-]+\.mjs)/g;

/** 編集されたら検査し直すパス（リポジトリ相対） */
export function isHarnessPath(rel) {
  return (
    rel === 'AGENTS.md' ||
    rel === 'CLAUDE.md' ||
    HOOK_FILES.includes(rel) ||
    rel === HOOK_REGISTRY ||
    [...SKILL_DIRS, SUBAGENT_DIR, LIBRARY_DIR, '.cli/hooks'].some((dir) => rel.startsWith(`${dir}/`))
  );
}

function read(root, rel) {
  try {
    return readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return null;
  }
}

function listSkills(root, dir) {
  const abs = path.join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((name) => existsSync(path.join(abs, name, 'SKILL.md')))
    .sort();
}

function frontmatter(src) {
  return src.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
}

function checkAlwaysOn(root, errs) {
  const agents = read(root, 'AGENTS.md') ?? '';
  const chars = [...agents].length;
  if (!agents.trim()) {
    errs.push(
      'AGENTS.md が無いか空です。Codex が毎ターン読む唯一の常駐ファイルなので、消さずに削って収めてください',
    );
  } else if (chars > ALWAYS_ON_MAX) {
    errs.push(
      `AGENTS.md が ${chars} 字で上限 ${ALWAYS_ON_MAX} 字を超えています。毎ターン丸ごと注入され出力トークンと取り合うので、` +
        '手順は skill・スクリプト・hook に移してください（.agents/skills/agent-harness/SKILL.md）',
    );
  }
  if (read(root, 'CLAUDE.md')?.trim() !== '@AGENTS.md') {
    errs.push('CLAUDE.md は `@AGENTS.md` の 1 行だけにしてください。指示は AGENTS.md に一本化します');
  }
  return agents;
}

function checkSkills(root, body, errs) {
  const [claude, agents] = SKILL_DIRS.map((dir) => listSkills(root, dir));
  for (const name of claude.filter((n) => !agents.includes(n))) {
    errs.push(
      `${TRIGGER_DIR}/${name} がありません。Codex は ${TRIGGER_DIR} しか見ないので ` +
        `\`ln -s ../../.claude/skills/${name} ${TRIGGER_DIR}/${name}\` を作ってください`,
    );
  }
  for (const name of agents.filter((n) => !claude.includes(n))) {
    errs.push(`.claude/skills/${name} がありません。Claude Code は .claude/skills しか見ません`);
  }
  for (const name of [...new Set([...claude, ...agents])]) {
    const dir = claude.includes(name) ? SKILL_DIRS[0] : SKILL_DIRS[1];
    const src = read(root, `${dir}/${name}/SKILL.md`) ?? '';
    const fm = frontmatter(src);
    if (!/^description:\s*\S/m.test(fm)) {
      errs.push(`${dir}/${name}/SKILL.md の frontmatter に description がありません。無いと黙って読み込まれません`);
    }
    const declared = fm.match(/^name:\s*["']?([^\s"']+)["']?\s*$/m)?.[1];
    if (declared && declared !== name) {
      errs.push(
        `${dir}/${name}/SKILL.md の \`name: ${declared}\` がディレクトリ名と違います。` +
          `name がディレクトリ名を上書きし、トリガー行が当たらなくなります`,
      );
    }
    if (!body.includes(`${TRIGGER_DIR}/${name}/SKILL.md`)) {
      errs.push(
        `skill "${name}" のトリガー行が AGENTS.md にありません。名前の出てこない skill は開かれません。` +
          `\`- <場面>ときは \`${TRIGGER_DIR}/${name}/SKILL.md\` を読んで従う。\` を足してください`,
      );
    }
    checkScriptRefs(root, `${dir}/${name}/SKILL.md`, src, path.join(dir, name), errs);
  }
}

function checkScriptRefs(root, rel, src, localDir, errs) {
  for (const [, ref] of src.matchAll(SCRIPT_REF)) {
    if (ref.startsWith('node_modules/') || OPTIONAL_SCRIPT_REFS.has(ref)) continue;
    const found = [ref, path.join(localDir, ref)].some((p) => existsSync(path.join(root, p)));
    if (!found) errs.push(`${rel} が \`${ref}\` を呼んでいますが、そのファイルがありません`);
  }
}

function checkPathRefs(root, body, errs) {
  for (const [, ref] of body.matchAll(PATH_REF)) {
    if (/[<>*{}[\]]/.test(ref)) continue;
    if (!existsSync(path.join(root, ref))) errs.push(`AGENTS.md が指す \`${ref}\` がありません`);
  }
}

function checkHookEntry(file, event, entry, i, isCodex, root, errs) {
  if (!entry || typeof entry !== 'object' || !Array.isArray(entry.hooks)) {
    errs.push(`${file}: ${event}[${i}] に hooks の配列がありません`);
    return;
  }
  for (const hook of entry.hooks) {
    const type = hook?.type;
    if (isCodex && type !== 'command') {
      errs.push(`${file}: ${event}[${i}] の type は "command" にしてください（Codex は他の型を飛ばします）`);
      continue;
    }
    if (type !== 'command') continue;
    const command = String(hook.command ?? '').trim();
    if (!command) {
      errs.push(`${file}: ${event}[${i}] の command が空です`);
      continue;
    }
    for (const [, mod] of command.matchAll(HOOK_MODULE_REF)) {
      if (!existsSync(path.join(root, mod))) {
        errs.push(`${file}: ${event}[${i}] が呼ぶ \`${mod}\` がありません。hook は黙って発火しなくなります`);
      }
    }
  }
}

function checkHooks(root, errs) {
  for (const file of HOOK_FILES) {
    const src = read(root, file);
    if (src === null) continue;
    let doc;
    try {
      doc = JSON.parse(src);
    } catch (err) {
      errs.push(`${file} が JSON として読めません: ${err.message}`);
      continue;
    }
    const isCodex = file === '.codex/hooks.json';
    const hooks = doc?.hooks;
    if (hooks === undefined && !isCodex) continue;
    if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks) || !Object.keys(hooks).length) {
      errs.push(`${file} には {"hooks": {"<Event>": [...]}} の形が要ります`);
      continue;
    }
    for (const [event, entries] of Object.entries(hooks)) {
      if (isCodex && !CODEX_HOOK_EVENTS.has(event)) {
        errs.push(`${file}: 未知のイベント ${event}。Codex が発火させるのは ${[...CODEX_HOOK_EVENTS].join(', ')}`);
        continue;
      }
      if (!Array.isArray(entries)) {
        errs.push(`${file}: ${event} は matcher エントリの配列にしてください`);
        continue;
      }
      entries.forEach((entry, i) => checkHookEntry(file, event, entry, i, isCodex, root, errs));
    }
  }
}

function registeredCommands(root, file, event) {
  try {
    const entries = JSON.parse(read(root, file) ?? '{}')?.hooks?.[event];
    return Array.isArray(entries) ? entries.flatMap((e) => e?.hooks ?? []).map((h) => String(h?.command ?? '')) : [];
  } catch {
    return [];
  }
}

// hook-registry に載せた hook は、Claude Code と Codex の設定にも載っていないと片方で黙って発火しない
function checkHookRegistry(root, errs) {
  let registry;
  try {
    registry = JSON.parse(read(root, HOOK_REGISTRY) ?? 'null');
  } catch (err) {
    errs.push(`${HOOK_REGISTRY} が JSON として読めません: ${err.message}`);
    return;
  }
  for (const [event, entries] of Object.entries(registry?.hooks ?? {})) {
    for (const hook of (Array.isArray(entries) ? entries : []).flatMap((e) => e?.hooks ?? [])) {
      const { id, module } = hook ?? {};
      if (!id || !module) {
        errs.push(`${HOOK_REGISTRY}: ${event} の hook に id と module が要ります`);
        continue;
      }
      if (!existsSync(path.join(root, module))) errs.push(`${HOOK_REGISTRY}: ${id} の \`${module}\` がありません`);
      if (!registeredCommands(root, '.claude/settings.json', event).some((c) => c.includes(module))) {
        errs.push(
          `hook "${id}" が .claude/settings.json の ${event} にありません。` +
            `\`node "\${CLAUDE_PROJECT_DIR}/${module}"\` を登録してください`,
        );
      }
      const codexTarget = (hook.cliTargets ?? []).includes('codex');
      const inCodex = registeredCommands(root, '.codex/hooks.json', event).some((c) =>
        c.includes(` codex ${event} ${id}`),
      );
      if (codexTarget && !inCodex) {
        errs.push(
          `hook "${id}" が .codex/hooks.json の ${event} にありません。` +
            `\`.cli/_cli-dispatch.mjs ${module} codex ${event} ${id}\` を登録してください`,
        );
      }
    }
  }
}

function referencedHookModules(root) {
  const modules = new Set();
  for (const file of [...HOOK_FILES, HOOK_REGISTRY]) {
    for (const [, mod] of (read(root, file) ?? '').matchAll(HOOK_MODULE_REF)) modules.add(mod);
  }
  return [...modules].sort();
}

const HOOK_SYNTAX_CACHE = new Map();

/**
 * hook モジュールが構文として通るか（harness2/core/tree.py#_py_compiles に当たる）。構文エラーの hook は実行時に
 * 握りつぶされ、黙って発火しない。1 件ごとに node を起こすので、PostToolUse hook からは編集したものだけ渡す
 */
export function checkHookModulesCompile(root, modules = referencedHookModules(root)) {
  const errs = [];
  for (const mod of modules) {
    const abs = path.join(root, mod);
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, 'utf8');
    const hash = createHash('sha256').update(src).digest('hex');
    if (!HOOK_SYNTAX_CACHE.has(hash)) {
      try {
        espree.parse(src.replace(/^#![^\r\n]*/, ''), { ecmaVersion: 'latest', sourceType: 'module' });
        HOOK_SYNTAX_CACHE.set(hash, '');
      } catch (err) {
        HOOK_SYNTAX_CACHE.set(hash, `SyntaxError: ${err.message}`);
      }
    }
    const detail = HOOK_SYNTAX_CACHE.get(hash);
    if (detail) errs.push(`\`${mod}\` が構文として通りません（${detail}）。hook は黙って発火しなくなります`);
  }
  return errs;
}

function checkSubagents(root, errs) {
  const abs = path.join(root, SUBAGENT_DIR);
  if (!existsSync(abs)) return;
  for (const name of readdirSync(abs).filter((n) => n.endsWith('.md'))) {
    if (!/^description:\s*\S/m.test(frontmatter(read(root, `${SUBAGENT_DIR}/${name}`) ?? ''))) {
      errs.push(`${SUBAGENT_DIR}/${name} の frontmatter に description がありません。呼び出し元が使いどころを判断できません`);
    }
  }
}

/** 問題の一覧を返す（空なら合格）。`compile: false` で hook モジュールの構文検査を飛ばす */
export function validateHarness(root, { compile = true } = {}) {
  const errs = [];
  const body = checkAlwaysOn(root, errs);
  checkSkills(root, body, errs);
  checkScriptRefs(root, 'AGENTS.md', body, '.', errs);
  checkPathRefs(root, body, errs);
  checkHooks(root, errs);
  checkHookRegistry(root, errs);
  if (compile) errs.push(...checkHookModulesCompile(root));
  checkSubagents(root, errs);
  errs.push(...checkLibrary(root));
  return errs;
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** base からの harness の変更（作業ツリーと未追跡ファイルを含む）と、AGENTS.md の字数の増減 */
export function diffHarness(root, base) {
  const added = [];
  const removed = [];
  const modified = [];
  for (const line of git(root, ['diff', '--name-status', '--no-renames', base, '--']).split('\n')) {
    const [status, rel] = line.split('\t');
    if (!rel || !isHarnessPath(rel)) continue;
    ({ A: added, D: removed }[status] ?? modified).push(rel);
  }
  for (const rel of git(root, ['ls-files', '--others', '--exclude-standard']).split('\n')) {
    if (rel && isHarnessPath(rel)) added.push(rel);
  }
  let before = '';
  try {
    before = git(root, ['show', `${base}:AGENTS.md`]);
  } catch {
    // base に AGENTS.md が無い
  }
  const alwaysOnDelta = [...(read(root, 'AGENTS.md') ?? '')].length - [...before].length;
  return { added: added.sort(), removed: removed.sort(), modified: modified.sort(), alwaysOnDelta };
}

/** 差分から出す警告（落とさない）。文言の誤字直しや再移植まで記録を強いないため */
export function diffWarnings({ added, removed, modified, alwaysOnDelta }) {
  const warnings = [];
  const changed = [...added, ...removed, ...modified];
  const touchedHarness = changed.some((rel) => !rel.startsWith(`${LIBRARY_DIR}/`));
  const recorded = added.some((rel) => rel.startsWith(`${EXPERIENCE_DIR}/`));
  if (alwaysOnDelta > 0) {
    warnings.push(
      `AGENTS.md の常駐が ${alwaysOnDelta} 字増えています。足した分はほかを削って払うか、skill・スクリプト・hook に移せないか見直してください`,
    );
  }
  if (touchedHarness && !recorded) {
    warnings.push(
      `harness を変えていますが ${EXPERIENCE_DIR}/ にエントリがありません。観察で支えられる教訓があれば残してください（.agents/skills/agent-harness/SKILL.md）`,
    );
  }
  return warnings;
}

export function parseArgs(argv) {
  let base;
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base' || arg.startsWith('--base=')) {
      base = arg === '--base' ? argv[++i] : arg.slice('--base='.length);
      // 値の無い --base を黙って無視すると、CI で差分の警告が消えたことに気づけない
      if (!base || base.startsWith('--')) throw new Error('--base には比べる ref を渡してください（例: --base origin/main）');
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }
  return { rootArg: positional[0], base };
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`agent harness: ${err.message}`);
    process.exit(2);
  }
  const { rootArg, base } = args;
  const root = path.resolve(rootArg ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const errs = validateHarness(root);
  if (errs.length) {
    console.error(`agent harness: ${errs.length} 件の問題`);
    for (const e of errs) console.error(`- ${e}`);
    process.exit(1);
  }
  const chars = [...(read(root, 'AGENTS.md') ?? '')].length;
  const skills = listSkills(root, SKILL_DIRS[0]).length;
  console.log(`agent harness OK: AGENTS.md ${chars}/${ALWAYS_ON_MAX} 字, skill ${skills} 件`);
  if (!base) return;

  let diff;
  try {
    diff = diffHarness(root, base);
  } catch (err) {
    const detail = String(err.stderr ?? err.message).trim().split('\n')[0];
    console.error(`agent harness: ${base} と比べられません（${detail}）`);
    process.exit(2);
  }
  const sign = diff.alwaysOnDelta > 0 ? '+' : '';
  console.log(`harness diff vs ${base}: 常駐 ${sign}${diff.alwaysOnDelta} 字`);
  for (const [label, files] of [
    ['追加', diff.added],
    ['削除', diff.removed],
    ['変更', diff.modified],
  ]) {
    if (files.length) console.log(`  ${label}: ${files.join(', ')}`);
  }
  const prefix = process.env.GITHUB_ACTIONS ? '::warning title=agent harness::' : 'warning: ';
  for (const w of diffWarnings(diff)) console.log(`${prefix}${w}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
