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
 * - hook 設定の形が正しく、呼ぶモジュールが実在する
 *
 * Usage:
 *   node scripts/check-agent-harness.mjs [root]
 *   npm run check:harness
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ALWAYS_ON_MAX = 8000;

const SKILL_DIRS = ['.claude/skills', '.agents/skills'];
const TRIGGER_DIR = '.agents/skills';
const HOOK_FILES = ['.codex/hooks.json', '.claude/settings.json'];

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
    SKILL_DIRS.some((dir) => rel.startsWith(`${dir}/`))
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

/** 問題の一覧を返す（空なら合格） */
export function validateHarness(root) {
  const errs = [];
  const body = checkAlwaysOn(root, errs);
  checkSkills(root, body, errs);
  checkScriptRefs(root, 'AGENTS.md', body, '.', errs);
  checkPathRefs(root, body, errs);
  checkHooks(root, errs);
  return errs;
}

function main() {
  const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const errs = validateHarness(root);
  if (errs.length) {
    console.error(`agent harness: ${errs.length} 件の問題`);
    for (const e of errs) console.error(`- ${e}`);
    process.exit(1);
  }
  const chars = [...(read(root, 'AGENTS.md') ?? '')].length;
  const skills = listSkills(root, SKILL_DIRS[0]).length;
  console.log(`agent harness OK: AGENTS.md ${chars}/${ALWAYS_ON_MAX} 字, skill ${skills} 件`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
