#!/usr/bin/env node
/**
 * harness の経験ライブラリ（docs/harness/）を検査し、INDEX.md を作り直す。
 * Harness²（Google Research）の harnessing-level recursion（harness2/core/library.py と prompts.py#experience）を
 * このリポジトリ向けに移したもの。harness を変えたら、部品ごとに何を変えて何が起きたかと、次の作業へ持ち越す
 * 教訓を 1 件残す。次に harness を変えるエージェントは、同じ領域のエントリを読んでから手を付ける。
 *
 * - docs/harness/experience/<YYYY-MM-DD>-<slug>.md  1 件 = 1 回の harness 変更
 * - docs/harness/INDEX.md                             エントリから作り直す（手で編集しない）
 *
 * 教訓は、部品ごとの観察が支えるときだけ書く。どの行も「切り分け不能」なら確度は「低」にする
 * （1 回の実行や複数部品の同時変更では、どの変更が効いたか言えない）。
 *
 * Usage:
 *   node scripts/harness-library.mjs [root]   # INDEX.md を作り直す
 *   npm run harness:index
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIBRARY_DIR = 'docs/harness';
export const EXPERIENCE_DIR = `${LIBRARY_DIR}/experience`;
export const INDEX_FILE = `${LIBRARY_DIR}/INDEX.md`;

export const VERDICTS = ['効いた', '悪化した', '効果なし', '切り分け不能'];
const CONFOUNDED = '切り分け不能';
const CONFIDENCE = /^(高|中|低)(?:\s|$|—)/;
const LESSON_FIELDS = ['きっかけ', '教訓', '根拠', '確度'];
const ENTRY_FILE = /^(\d{4}-\d{2}-\d{2})-[a-z0-9][a-z0-9-]*\.md$/;
const AREA = /^[a-z0-9][a-z0-9-]*$/;

function meta(src, key) {
  return src.match(new RegExp(`^- ${key}:\\s*(.+?)\\s*$`, 'm'))?.[1] ?? '';
}

function lessonField(src, key) {
  return src.match(new RegExp(`^- \\*\\*${key}\\*\\*:\\s*(.+?)\\s*$`, 'm'))?.[1] ?? '';
}

function section(src, heading) {
  const start = src.indexOf(`\n## ${heading}`);
  if (start < 0) return '';
  const rest = src.slice(start + 1);
  const end = rest.indexOf('\n## ', 1);
  return end < 0 ? rest : rest.slice(0, end);
}

function tableRows(block) {
  return block
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .slice(2)
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
}

/** エントリ 1 件を読む */
export function parseEntry(src) {
  return {
    title: src.match(/^# (.+?)\s*$/m)?.[1] ?? '',
    area: meta(src, '領域'),
    date: meta(src, '日付'),
    sources: meta(src, '出典'),
    rows: tableRows(section(src, '部品ごとの変更と観察')).map(([component, change, observed, verdict]) => ({
      component,
      change,
      observed,
      verdict,
    })),
    lesson: Object.fromEntries(LESSON_FIELDS.map((key) => [key, lessonField(src, key)])),
  };
}

function listEntries(root) {
  const dir = path.join(root, EXPERIENCE_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => ({ name, entry: parseEntry(readFileSync(path.join(dir, name), 'utf8')) }));
}

function checkEntry(name, entry) {
  const rel = `${EXPERIENCE_DIR}/${name}`;
  const errs = [];
  const fileDate = name.match(ENTRY_FILE)?.[1];
  if (!fileDate) errs.push(`${rel} のファイル名は \`<YYYY-MM-DD>-<slug>.md\`（slug は英小文字・数字・ハイフン）にしてください`);
  if (!entry.title) errs.push(`${rel} に \`# <見出し>\` がありません`);
  if (!AREA.test(entry.area)) errs.push(`${rel} の \`- 領域: <slug>\` がありません（英小文字・数字・ハイフン）`);
  if (fileDate && entry.date !== fileDate) errs.push(`${rel} の \`- 日付:\` がファイル名の日付 ${fileDate} と違います`);
  if (!entry.sources) errs.push(`${rel} の \`- 出典:\` がありません。PR・コミット・CI run など、観察を確かめられる場所を書いてください`);

  if (!entry.rows.length) {
    errs.push(`${rel} の「部品ごとの変更と観察」に表の行がありません。部品・変更・観察・判定を 1 行ずつ書いてください`);
  }
  for (const [i, row] of entry.rows.entries()) {
    if ([row.component, row.change, row.observed].some((cell) => !cell)) {
      errs.push(`${rel} の表 ${i + 1} 行目に空の列があります`);
    }
    if (!VERDICTS.includes(row.verdict)) {
      errs.push(`${rel} の表 ${i + 1} 行目の判定「${row.verdict ?? ''}」は ${VERDICTS.join(' / ')} のどれかにしてください`);
    }
  }

  for (const key of LESSON_FIELDS) {
    if (!entry.lesson[key]) errs.push(`${rel} の「持ち越す教訓」に \`- **${key}**:\` がありません`);
  }
  const confidence = entry.lesson['確度'];
  if (confidence && !CONFIDENCE.test(confidence)) {
    errs.push(`${rel} の確度は「高」「中」「低」のどれかで始め、理由を続けてください`);
  }
  if (entry.rows.length && entry.rows.every((row) => row.verdict === CONFOUNDED) && !confidence.startsWith('低')) {
    errs.push(`${rel} はどの行も「${CONFOUNDED}」なので、確度は「低」にしてください。観察で示せる範囲に教訓を絞ります`);
  }
  return errs;
}

/** エントリから INDEX.md の中身を作る */
export function buildIndex(root) {
  const entries = listEntries(root);
  const lines = [
    '# harness 経験ライブラリ',
    '',
    '`npm run harness:index` が `docs/harness/experience/` から作り直す。手で編集しない。',
    '',
    'harness（AGENTS.md・skill・スクリプト・hook）を変える前に、同じ領域のエントリを開いて教訓を読む。' +
      '前の作業で確かめた事実も、ここでは仮説として確かめ直す。書き方は `.agents/skills/agent-harness/SKILL.md`。',
    '',
  ];
  if (!entries.length) lines.push('_（まだエントリはありません）_', '');
  const areas = [...new Set(entries.map(({ entry }) => entry.area))].sort();
  for (const area of areas) {
    lines.push(`## ${area}`, '');
    for (const { name, entry } of entries.filter((e) => e.entry.area === area)) {
      const components = [...new Set(entry.rows.map((row) => row.component))].join(', ');
      const confidence = entry.lesson['確度'].match(CONFIDENCE)?.[1] ?? '?';
      lines.push(`- [${entry.title}](experience/${name}) — ${entry.date} · 確度 ${confidence} · 部品: ${components}`);
      lines.push(`  - きっかけ: ${entry.lesson['きっかけ']}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** 問題の一覧を返す（空なら合格） */
export function checkLibrary(root) {
  const entries = listEntries(root);
  const errs = entries.flatMap(({ name, entry }) => checkEntry(name, entry));
  if (!entries.length && !existsSync(path.join(root, INDEX_FILE))) return errs;
  let index = null;
  try {
    index = readFileSync(path.join(root, INDEX_FILE), 'utf8');
  } catch {
    // 下で「古い」として報告する
  }
  if (index !== buildIndex(root)) {
    errs.push(`${INDEX_FILE} がエントリと食い違っています。\`npm run harness:index\` で作り直してください`);
  }
  return errs;
}

function main() {
  const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  writeFileSync(path.join(root, INDEX_FILE), buildIndex(root));
  console.log(`${INDEX_FILE} を作り直しました（${listEntries(root).length} 件）`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
