/**
 * ship-deck-render.mjs — Deck model → Self-contained HTML renderer (0 CDN/external dependencies)
 *
 * Input contract: Model returned by `ship-deck-core.mjs#buildDeckModel`.
 * Output: Single index.html string — inline CSS/JS, fully functional offline.
 *
 * Screen structure (2026-10-28, third rewrite: a reading column with the key points on top):
 *   Header: branch, size and reach on one line → the change in one sentence → who it is for.
 *   Brief:  three points (why · how · the one thing to check) → the diagram when written →
 *           the trade-off as chosen / gave up / the cost → review checklist → risks with a status
 *           → rollback, then one-line folds: reach and exposure (computed from git paths),
 *           what was not verified, what was left out, risk details.
 *   Below:  machine warnings (only when any) → <details> folds: original request · changed files
 *           · requirements trace · impact notes · impact map · glossary · sources.
 *
 *   Why (user feedback 2026-10-28): the previous deck opened with four tables at the same weight,
 *   internal vocabulary and flows spelled out in prose, and read as generated filler. An engineer
 *   who was not part of the work should see in one look what changed, why, which trade-off to
 *   judge and where to look. The words matter as much as the layout: narrative-quality.mjs rejects
 *   file paths and code identifiers in first-screen prose, and plain-language.mjs no longer skips
 *   its term check when a repository has no glossary file.
 *
 * Boundary (R-CM-028): perspective1-only. Not deployed to scaffold targets.
 */

import { escapeHtml } from './ship-deck-core.mjs';
import { applyDeckTheme } from './deck-theme.mjs';
import { splitPathMention } from './narrative-quality.mjs';
import { escapeRegExp } from './plain-language.mjs';
import { PASSPORT_RELPATH } from './review-origin.mjs';
import {
  DECK_VISUAL_CSS,
  renderImpactMapSection,
  renderOriginSection,
  renderScorecardSection,
  renderTraceMapSvg,
  renderVisualFigure,
  severityBadge,
} from './deck-visuals.mjs';

export { DECK_VISUAL_CSS };

/**
 * Wraps matched glossary terms in escaped prose with `? icon + CSS tooltip` structure:
 * `<span class="term">Term<sup class="term-icon">?</sup><span class="term-tip">Definition</span></span>`.
 * Hovering or keyboard focusing immediately displays the definition without delay.
 */
export function annotateGlossaryTerms(escapedText, glossaryEntries) {
  const entries = Array.isArray(glossaryEntries) ? glossaryEntries : [];
  if (!escapedText || !entries.length) return escapedText;
  const ranges = [];
  for (const entry of entries) {
    for (const alias of entry.aliases ?? []) {
      if (!/[A-Za-z]/.test(alias)) continue;
      const re = new RegExp(
        `(?<![A-Za-z0-9_])${escapeRegExp(alias)}(?![A-Za-z0-9_])`,
        'gi',
      );
      for (const m of escapedText.matchAll(re)) {
        ranges.push({ start: m.index, end: m.index + m[0].length, plain: entry.plain });
      }
    }
    if (entry.pattern) {
      try {
        for (const m of escapedText.matchAll(new RegExp(entry.pattern, 'g'))) {
          ranges.push({ start: m.index, end: m.index + m[0].length, plain: entry.plain });
        }
      } catch {
        /* skip invalid pattern */
      }
    }
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const parts = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    parts.push(escapedText.slice(cursor, r.start));
    parts.push(
      `<span class="term" tabindex="0" aria-label="${escapedText.slice(r.start, r.end)}: ${escapeHtml(r.plain)}">${escapedText.slice(r.start, r.end)}<sup class="term-icon" aria-hidden="true">?</sup><span class="term-tip" role="tooltip">${escapeHtml(r.plain)}</span></span>`,
    );
    cursor = r.end;
  }
  parts.push(escapedText.slice(cursor));
  return parts.join('');
}

function proseHtml(value, glossary) {
  return annotateGlossaryTerms(escapeHtml(value), glossary);
}

/**
 * Glossary section — Lists glossary terms actually present in this deck's prose.
 */
export function renderGlossarySection(model) {
  const entries = Array.isArray(model.glossary) ? model.glossary : [];
  if (!entries.length) return '';
  const rows = entries
    .map((e) => `<dt>${escapeHtml(e.label)}</dt><dd>${escapeHtml(e.plain)}</dd>`)
    .join('\n');
  return `<section class="card" id="glossary">
  <h2>Glossary <span class="gen machine">Lexicon cross-reference — terms used in this document</span></h2>
  <p class="muted small">Hover over the ? icon next to any <span class="term" tabindex="0" aria-label="Dotted underlined term: Hovering displays the definition">dotted underlined term<sup class="term-icon" aria-hidden="true">?</sup><span class="term-tip" role="tooltip">Hovering displays the definition</span></span> to view its definition.</p>
  <dl class="glossary">
${rows}
  </dl>
</section>`;
}

/**
 * Serializes DECK_DATA inline, escaping `<` to prevent script injection.
 */
export function serializeDeckData(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function fileBadge(kind) {
  const colors = { NEW: '#2ea45f', DELETE: '#e5534b', RENAME: '#a371f7', EDIT: '#58a6ff' };
  const color = colors[kind] || colors.EDIT;
  return `<span class="badge" style="border-color:${color};color:${color}">${escapeHtml(kind)}</span>`;
}

export function renderChecklistSection(
  model,
  checklistKind = 'ship-deck',
  num = '⑤',
  title = 'Verdict — Review Checklist',
) {
  const items = model.checklist
    .map((item) => {
      const pass = item.passWhen
        ? `<span class="check-pass"><b>PASS Condition</b> ${escapeHtml(item.passWhen)}</span>`
        : '';
      const link = item.evidence
        ? ` <a class="check-jump" href="#${escapeHtml(item.evidence)}">View Evidence ↓</a>`
        : '';
      return `<li class="check-item" data-check-item="${escapeHtml(item.slug)}" data-severity="${escapeHtml(item.severity ?? 'major')}">
  <div class="check-label"><span class="check-title">${severityBadge(item.severity)}<b>${escapeHtml(item.label)}</b></span><span class="muted">${escapeHtml(item.desc)}${link}</span>${pass}</div>
  <div class="check-actions"></div>
</li>`;
    })
    .join('\n');
  return `<section class="card checklist" id="verdict" data-checklist="${escapeHtml(checklistKind)}">
  <div class="between">
    <h2>${num ? `${escapeHtml(num)} ` : ''}${escapeHtml(title)}</h2>
    <span class="badge" data-checklist-progress></span>
  </div>
  <ul class="check-list">
${items}
  </ul>
  <div class="check-footer">
    <button type="button" class="btn" data-copy-results>Copy Results</button>
  </div>
</section>`;
}

export function renderAppendix(model) {
  const parts = [];
  if (model.commits.length) {
    parts.push(
      `<details><summary>Commits (${model.commits.length})</summary><pre>${escapeHtml(model.commits.join('\n'))}</pre></details>`,
    );
  }
  if (model.panelMarkdown) {
    parts.push(
      `<details><summary>Pre-Ship Human Review Panel Source (Full Panel Text)</summary><pre class="panel-md">${escapeHtml(model.panelMarkdown)}</pre></details>`,
    );
  }
  if (!parts.length) return '';
  return `<section class="card" id="appendix"><h2>Source Documents (Progressive Disclosure)</h2>${parts.join('\n')}</section>`;
}

export const DECK_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; background: #0d1117; color: #e6edf3;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
main { max-width: 920px; margin: 0 auto; display: grid; gap: 16px; }
h1 { font-size: 20px; margin: 0 0 4px; }
h2 { font-size: 16px; margin: 0 0 12px; }
h3 { font-size: 13px; margin: 16px 0 8px; color: #9da7b3; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px 18px; }
.muted { color: #8b949e; }
.small { font-size: 12px; }
.goal { font-size: 14px; white-space: pre-wrap; }
.badge { display: inline-block; border: 1px solid #30363d; border-radius: 999px; padding: 1px 9px; font-size: 12px; }
.gen { font-size: 11px; font-weight: normal; border-radius: 4px; padding: 2px 6px; vertical-align: middle; }
.gen.machine { background: #12261e; color: #3fb950; }
.gen.ai { background: #2b2111; color: #d4a72c; }
.stats { display: flex; gap: 12px; flex-wrap: wrap; margin: 10px 0; }
.stat { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 8px 14px; min-width: 88px; text-align: center; }
.stat-v { font-size: 20px; font-weight: 700; }
.stat-l { font-size: 11px; color: #8b949e; }
.hm-row { display: grid; grid-template-columns: 220px 1fr 130px; gap: 10px; align-items: center; margin: 4px 0; }
.hm-label { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
.hm-track { background: #0d1117; border-radius: 4px; height: 14px; }
.hm-bar { background: linear-gradient(90deg, #1f6feb, #e5534b); height: 100%; border-radius: 4px; }
.hm-num { font-size: 11px; color: #8b949e; text-align: right; }
.files { list-style: none; padding: 0; display: grid; gap: 4px; font-size: 12px; }
.between { display: flex; justify-content: space-between; align-items: center; }
.check-list { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 10px; }
.check-item { display: grid; grid-template-columns: 1fr auto; gap: 10px; background: #0d1117;
  border: 1px solid #30363d; border-radius: 8px; padding: 10px 12px; }
.check-item[data-state="ok"] { border-color: #2ea45f; }
.check-item[data-state="ng"] { border-color: #e5534b; }
.check-label { display: grid; gap: 3px; font-size: 13px; }
.check-actions { display: flex; gap: 6px; align-items: flex-start; }
.btn { background: #21262d; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px;
  padding: 4px 10px; font-size: 12px; cursor: pointer; }
.btn.active-ok { background: #12261e; border-color: #2ea45f; color: #3fb950; }
.btn.active-ng { background: #2d1416; border-color: #e5534b; color: #ff7b72; }
.check-note { grid-column: 1 / -1; width: 100%; background: #0d1117; color: #e6edf3;
  border: 1px solid #30363d; border-radius: 6px; padding: 6px 8px; font-size: 12px; }
.check-footer { display: flex; gap: 12px; align-items: center; margin-top: 14px; }
pre { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 10px;
  font-size: 12px; overflow: auto; white-space: pre-wrap; }
details > summary { cursor: pointer; font-size: 13px; color: #58a6ff; margin: 6px 0; }
.review-intro { border-left: 4px solid #58a6ff; }
.review-intro dl { display: grid; grid-template-columns: 92px 1fr; gap: 8px 14px; margin: 0; }
.review-intro dt { color: #9da7b3; font-size: 13px; }
.review-intro dd { margin: 0; line-height: 1.6; white-space: pre-wrap; }
.trace-list { display: grid; gap: 12px; }
.trace-card { border: 1px solid #30363d; border-radius: 8px; padding: 12px; background: #0d1117; }
.trace-card h3 { margin: 0 0 6px; color: #e6edf3; font-size: 14px; }
.trace-grid { display: grid; grid-template-columns: minmax(180px, 0.8fr) 34px minmax(260px, 1.5fr);
  gap: 10px; align-items: center; margin: 10px 0; }
.trace-arrow { color: #58a6ff; font-size: 22px; text-align: center; }
.trace-box { border: 1px solid #30363d; border-radius: 7px; padding: 9px 10px; line-height: 1.5; }
.trace-impl { display: grid; gap: 6px; }
.trace-validation { color: #9da7b3; font-size: 12px; margin-top: 8px; }
.tree { list-style: none; margin: 0; padding-left: 0; font-size: 13px; }
.tree .tree { margin: 5px 0 0 18px; padding-left: 14px; border-left: 1px solid #30363d; }
.tree-node { margin: 5px 0; }
.tree-dir-label { color: #9da7b3; font-weight: 650; }
.tree-file { border: 1px solid #30363d; border-radius: 7px; padding: 8px 10px; background: #0d1117; }
.tree-file-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tree-note { margin: 5px 0 0 0; line-height: 1.5; }
.tree-reason { color: #9da7b3; }
.decision-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.decision-table th, .decision-table td { border: 1px solid #30363d; padding: 8px 9px;
  text-align: left; vertical-align: top; line-height: 1.5; }
.decision-table th { color: #9da7b3; }
.term { position: relative; border-bottom: 1px dotted #d4a72c; cursor: help; }
.term-icon { display: inline-block; margin-left: 2px; padding: 0 4px; border-radius: 999px;
  background: #d4a72c; color: #0d1117; font-size: 9px; font-weight: 700; line-height: 1.5;
  vertical-align: super; user-select: none; }
.term-tip { display: none; position: absolute; left: 0; top: calc(100% + 6px); z-index: 20;
  width: max-content; max-width: min(340px, 78vw); background: #1c2128; border: 1px solid #d4a72c;
  border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 400; color: #e6edf3;
  line-height: 1.55; white-space: normal; pointer-events: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45); }
.term:hover .term-tip, .term:focus .term-tip, .term:focus-within .term-tip { display: block; }
.glossary { display: grid; grid-template-columns: minmax(140px, 240px) 1fr; gap: 6px 14px; margin: 0; font-size: 13px; }
.glossary dt { color: #d4a72c; }
.glossary dd { margin: 0; color: #9da7b3; line-height: 1.55; }
.risk-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.risk-box { border: 1px solid #30363d; border-radius: 8px; padding: 10px 12px; background: #0d1117; }
.risk-box h3 { margin: 0 0 6px; color: #9da7b3; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid #30363d; border-radius: 999px; padding: 3px 9px; font-size: 12px; }
@media (max-width: 720px) { .hm-row { grid-template-columns: 120px 1fr 110px; } }
@media (max-width: 720px) { .trace-grid { grid-template-columns: 1fr; } .trace-arrow { transform: rotate(90deg); }
  .risk-grid { grid-template-columns: 1fr; } .review-intro dl { grid-template-columns: 1fr; gap: 2px; } }
.evidence { border: 1px solid #30363d; border-radius: 10px; background: #161b22; }
.evidence > summary { padding: 12px 18px; font-size: 14px; color: #e6edf3; cursor: pointer;
  list-style: none; display: flex; justify-content: space-between; align-items: center; }
.evidence > summary::-webkit-details-marker { display: none; }
.evidence > summary::after { content: '▸'; color: #8b949e; }
.evidence[open] > summary::after { content: '▾'; }
.evidence > .card { border: 0; border-top: 1px solid #30363d; border-radius: 0; }
.evidence .muted-count { color: #8b949e; font-size: 12px; font-weight: normal; }
`;

export const DECK_JS = `
(function () {
  var data = window.DECK_DATA || { branch: '(unknown)', checklist: [] };
  var tool = data.tool || 'ship-deck';
  var storeKey = tool + ':' + (data.docKey || data.branch);
  var state = {};
  try { state = JSON.parse(localStorage.getItem(storeKey) || '{}') || {}; } catch (e) { state = {}; }
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-check-item]'));
  var progressEl = document.querySelector('[data-checklist-progress]');

  function itemMeta(li) {
    var slug = li.getAttribute('data-check-item');
    var labelEl = li.querySelector('.check-label b');
    var descEl = li.querySelector('.check-label .muted');
    return {
      slug: slug,
      label: labelEl ? labelEl.textContent : slug,
      desc: descEl ? descEl.textContent : '',
    };
  }

  function summary() {
    var total = items.length, ok = 0, ng = 0;
    items.forEach(function (li) {
      var s = state[li.getAttribute('data-check-item')];
      if (s && s.state === 'ok') ok += 1;
      if (s && s.state === 'ng') ng += 1;
    });
    return { total: total, checked: ok + ng, ok: ok, ng: ng };
  }

  function buildMarkdown() {
    var sum = summary();
    var lines = ['## Ship Deck Review Results — ' + data.branch, 'Verified ' + sum.checked + '/' + sum.total + ' · Issues ' + sum.ng];
    items.forEach(function (li) {
      var meta = itemMeta(li);
      var s = state[meta.slug] || {};
      var mark = s.state === 'ok' ? '[OK]' : s.state === 'ng' ? '[Needs Fix]' : '[Unverified]';
      var note = s.state === 'ng' && s.note ? ' — ' + s.note : '';
      lines.push('- ' + mark + ' ' + meta.label + ' (' + meta.slug + ')' + note);
    });
    return lines.join('\\n');
  }

  function updateProgress(sum) {
    if (!progressEl) return;
    sum = sum || summary();
    progressEl.textContent = 'Verified ' + sum.checked + '/' + sum.total + ' · Issues ' + sum.ng;
  }

  function save() {
    try { localStorage.setItem(storeKey, JSON.stringify(state)); } catch (e) { /* ignore storage error */ }
    updateProgress();
  }

  function renderItem(li) {
    var slug = li.getAttribute('data-check-item');
    var s = state[slug] || {};
    li.setAttribute('data-state', s.state || '');
    var actions = li.querySelector('.check-actions');
    actions.innerHTML = '';
    [['ok', 'OK'], ['ng', 'Needs Fix']].forEach(function (pair) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (s.state === pair[0] ? ' active-' + pair[0] : '');
      btn.textContent = pair[1];
      btn.addEventListener('click', function () {
        var cur = state[slug] || {};
        state[slug] = { state: cur.state === pair[0] ? null : pair[0], note: cur.note || '' };
        save();
        renderItem(li);
      });
      actions.appendChild(btn);
    });
    var existingNote = li.querySelector('.check-note');
    if (existingNote) existingNote.remove();
    if (s.state === 'ng') {
      var note = document.createElement('textarea');
      note.className = 'check-note';
      note.placeholder = 'What needs to be fixed and how (will be fed into AI remediation task)';
      note.value = s.note || '';
      note.addEventListener('change', function () {
        state[slug] = { state: 'ng', note: note.value };
        save();
      });
      li.appendChild(note);
    }
  }

  var copyBtn = document.querySelector('[data-copy-results]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var md = buildMarkdown();
      var done = function () { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy Results'; }, 1500); };
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = md; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove(); done();
        } catch (e) { copyBtn.textContent = 'Copy failed — select manually'; }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(md).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  }

  items.forEach(renderItem);
  updateProgress();
})();
`;

/**
 * Ship deck page styles — a reading column, not a dashboard. One accent, no cards, no chips; the
 * only boxes are the diagram steps, the trade-off and the "please check" row. Colours follow the
 * shared dark palette above so the folded evidence below the brief sits in the same page.
 */
export const SHIP_DECK_CSS = `
main.ship { max-width: 760px; display: block; padding: 24px 0 72px; }
.ship { --ink: #e6edf3; --sub: #9da7b3; --faint: #6e7681; --line: #30363d; --accent: #58a6ff;
  --accent-soft: #11233f; --warn: #e3b341; --warn-soft: #2b2111; --ok: #3fb950; line-height: 1.7; font-size: 16px; }
.ship code { font-size: 13.5px; }
.ship-head .meta { font-size: 13px; color: var(--faint); margin: 0 0 12px; }
.ship-head h1 { font-size: 27px; line-height: 1.38; letter-spacing: -0.02em; margin: 0 0 10px; }
.ship-head .for { margin: 0 0 34px; color: var(--sub); font-size: 15px; }
.undo .origin-note { font-size: 13px; color: var(--faint); }
.brief h2 { font-size: 18px; margin: 60px 0 16px; letter-spacing: -0.01em; color: var(--ink); }
.points { list-style: none; margin: 0; padding: 0; display: grid; gap: 24px; }
.points li { display: grid; grid-template-columns: 96px 1fr; gap: 20px; }
.points .k { font-size: 14px; font-weight: 700; color: var(--sub); padding-top: 2px; }
.points p { margin: 0; }
.points .lead { font-size: 17px; font-weight: 600; }
.points .rest { color: var(--sub); margin-top: 4px; }
.points li.look { background: var(--accent-soft); margin: 0 -20px; padding: 18px 20px; border-radius: 10px; }
.points li.look .k { color: var(--accent); }
.flow { list-style: none; margin: 0; padding: 0; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
.flow li { position: relative; padding-right: 22px; }
.flow li:last-child { padding-right: 0; }
.flow .box { border: 1.5px solid var(--line); border-radius: 10px; padding: 12px 14px; height: 100%; }
.flow .tag { display: block; font-size: 12px; font-weight: 700; color: var(--faint); }
.flow b { display: block; font-size: 15px; overflow-wrap: anywhere; }
.flow small { display: block; font-size: 13px; color: var(--sub); line-height: 1.5; margin-top: 2px; }
.flow .state-new .box, .flow .state-changed .box { border-color: var(--accent); }
.flow .state-new .tag, .flow .state-changed .tag { color: var(--accent); }
.flow .state-removed .box { border-style: dashed; } .flow .state-removed b { text-decoration: line-through; color: var(--sub); }
.flow .cond { display: block; font-size: 12px; font-weight: 700; color: var(--sub); margin-bottom: 6px; }
.flow .alts { display: grid; gap: 8px; border-left: 1.5px dashed var(--faint); padding-left: 8px; }
.flow .alts .box { height: auto; }
.flow li:not(:last-child)::after { content: ''; position: absolute; right: 7px; top: 50%; width: 8px; height: 8px;
  border-top: 1.5px solid var(--faint); border-right: 1.5px solid var(--faint); transform: translateY(-50%) rotate(45deg); }
.caption { font-size: 14px; color: var(--sub); margin: 12px 0 0; }
.ba { width: 100%; border-collapse: collapse; font-size: 15px; }
.ba th, .ba td { text-align: left; vertical-align: top; padding: 10px 12px 10px 0; border-bottom: 1px solid var(--line); }
.ba thead th { font-size: 13px; color: var(--faint); font-weight: 700; }
.ba tbody th { color: var(--sub); font-weight: 600; white-space: nowrap; }
.ba td.before { color: var(--sub); }
.q { font-weight: 600; margin: 0 0 12px; }
.trade { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid var(--line); border-radius: 10px; overflow: hidden; }
.trade > div { padding: 16px 20px; }
.trade > div + div { border-left: 1.5px solid var(--line); }
.trade h3 { font-size: 13px; margin: 0 0 6px; color: var(--sub); font-weight: 700; }
.trade p { margin: 0; }
.trade .why { color: var(--sub); font-size: 15px; }
.trade .cost { grid-column: 1 / -1; border-left: 0; border-top: 1.5px solid var(--line); background: var(--warn-soft); }
.trade .cost h3 { color: var(--warn); }
.minor { margin: 16px 0 0; color: var(--sub); font-size: 15px; }
.minor b { color: var(--ink); }
.check { list-style: none; margin: 0; padding: 0; display: grid; gap: 18px; }
.check li { display: grid; grid-template-columns: 22px 1fr; gap: 12px; }
.check li::before { content: ''; width: 18px; height: 18px; margin-top: 4px; border: 1.5px solid var(--faint); border-radius: 4px; }
.check p { margin: 0; }
.check .where { color: var(--sub); font-size: 14px; }
.check .where a { color: var(--accent); }
.check .risk { color: var(--sub); font-size: 14.5px; }
.risks { display: grid; gap: 14px; margin: 0; }
.risks div { display: grid; grid-template-columns: 96px 1fr; gap: 20px; }
.risks dt { font-size: 14px; font-weight: 700; color: var(--sub); }
.risks dt.s-fixed { color: var(--ok); } .risks dt.s-open { color: var(--warn); } .risks dt.s-out_of_scope { color: var(--faint); }
.risks dd { margin: 0; }
.risks small { display: block; color: var(--sub); font-size: 14px; }
.undo { margin-top: 60px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--sub); font-size: 15px; }
.undo p { margin: 0 0 6px; }
.more { margin-top: 10px; }
.more > summary { cursor: pointer; color: var(--sub); }
.more ul { margin: 10px 0 0; padding-left: 20px; font-size: 14.5px; }
.more .more-body { margin: 12px 0 4px; font-size: 14.5px; }
.facts { display: grid; grid-template-columns: 140px 1fr; gap: 6px 16px; margin: 12px 0 0; }
.facts dt { color: var(--faint); } .facts dd { margin: 0; color: var(--ink); }
.reach-line { margin: 0; color: var(--ink); }
.reach-line .reach-means { color: var(--sub); }
.reach-bar { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 2px 16px; font-size: 13.5px; color: var(--faint); }
.reach-bar .seg.on { color: var(--ink); } .reach-bar .seg.top { font-weight: 700; }
.reach-caveat { margin: 6px 0 0; font-size: 13px; color: var(--warn); }
.ship > .evidence, .ship > .card { margin-top: 12px; font-size: 14px; line-height: 1.55; }
.ship > .card.scorecard { margin-top: 48px; }
@media (max-width: 720px) {
  .ship-head h1 { font-size: 22px; }
  .points li, .risks div, .facts { grid-template-columns: 1fr; gap: 2px; }
  .flow { grid-auto-flow: row; gap: 20px; } .flow li { padding: 0; }
  .flow li:not(:last-child)::after { right: auto; left: 50%; top: auto; bottom: -14px; transform: rotate(135deg); }
  .trade { grid-template-columns: 1fr; } .trade > div + div { border-left: 0; border-top: 1.5px solid var(--line); }
}
`;

/**
 * Human-facing deck labels per locale. The locale comes from `.claude/reach-map.json#locale`
 * (carried on `model.reach.locale`); an unknown or absent locale renders English, which is the
 * pre-extension-point output byte for byte. `ko` is design-lookbook's shipped Korean copy, so a
 * target selects it with one config key instead of editing this managed file.
 */
export const DECK_LABELS = Object.freeze({
  en: {
    lang: 'en',
    files: (n) => `${n} file${n === 1 ? '' : 's'}`,
    builtinCaveat: 'Classified by builtin conventions (no <code>.claude/reach-map.json</code>), so production paths may look local.',
    reachTitle: 'Reach and exposure',
    reachLabel: 'Reach',
    exposureWho: 'Who sees it',
    exposureHowMany: 'How many',
    exposureWhen: 'From when',
    exposureReversible: 'Can it be undone',
    dataWhatMoves: 'Data that changes',
    dataCount: 'How much',
    dataIrreversible: 'Not undone by a revert',
    dataOrder: 'Order',
    dataConsumers: 'Who reads it',
    failuresTitle: 'Risks',
    failuresDetailTitle: 'Risk details',
    failuresWho: 'Who notices first',
    failuresDetect: 'How we find out',
    statusFixed: 'Fixed',
    statusOpen: 'Open',
    statusOutOfScope: 'Out of scope',
    statusWatch: 'Watch',
    flowTitle: 'How it works',
    flowChanged: 'Changed',
    flowNew: 'New',
    flowRemoved: 'Removed',
    flowSame: 'Existing',
    before: 'Before',
    after: 'After',
    ifWrong: 'If not',
    forWhom: 'For',
    why: 'Why',
    how: 'How',
    lookFirst: 'Please check',
    tradeoffsTitle: 'Trade-off',
    chosen: 'Chosen',
    rejected: 'Gave up',
    tradeoffCost: 'The cost',
    reviewFocusTitle: 'Review checklist',
    gapsTitle: 'Not verified',
    outOfScopeTitle: 'Left out on purpose',
    rollback: 'Rollback',
    next: 'Next',
    scorecardTitle: 'Machine-detected warnings',
    foldOrigin: 'Original request <span class="muted-count">verbatim, check against the AI interpretation</span>',
    foldChangedFiles: 'Changed files',
    foldRequirements: 'Requirements → implementation trace',
    foldImpact: 'Impact and regression notes <span class="muted-count">author notes</span>',
    foldImpactMap: 'Machine-measured impact map <span class="muted-count">feature ownership, contract surfaces</span>',
    foldGlossary: 'Glossary',
    foldSources: 'Source documents',
  },
  ko: {
    lang: 'ko',
    files: (n) => `파일 ${n}개`,
    builtinCaveat: '내장 규칙으로 분류했습니다(<code>.claude/reach-map.json</code> 없음). 프로덕션 경로가 로컬로 보일 수 있습니다.',
    reachTitle: '영향 범위',
    reachLabel: '도달 범위',
    exposureWho: '누가 보나',
    exposureHowMany: '얼마나',
    exposureWhen: '언제부터',
    exposureReversible: '되돌릴 수 있나',
    dataWhatMoves: '바뀌는 데이터',
    dataCount: '규모',
    dataIrreversible: '되돌려도 남는 것',
    dataOrder: '순서',
    dataConsumers: '읽는 쪽',
    failuresTitle: '위험 요소',
    failuresDetailTitle: '위험 상세',
    failuresWho: '먼저 알아채는 사람',
    failuresDetect: '알아내는 방법',
    statusFixed: '해결됨',
    statusOpen: '남아 있음',
    statusOutOfScope: '범위 밖',
    statusWatch: '주의',
    flowTitle: '어떻게 동작하나',
    flowChanged: '바뀜',
    flowNew: '새로 추가',
    flowRemoved: '없앰',
    flowSame: '기존',
    before: '전',
    after: '후',
    ifWrong: '안 되면',
    forWhom: '대상',
    why: '왜',
    how: '어떻게',
    lookFirst: '꼭 봐 주세요',
    tradeoffsTitle: '트레이드오프',
    chosen: '선택',
    rejected: '포기',
    tradeoffCost: '그 대가',
    reviewFocusTitle: '리뷰 체크리스트',
    gapsTitle: '확인하지 못한 것',
    outOfScopeTitle: '일부러 하지 않은 것',
    rollback: '되돌리기',
    next: '다음',
    scorecardTitle: '자동 검사 경고',
    foldOrigin: '원문 요청 <span class="muted-count">AI 해석과 대조</span>',
    foldChangedFiles: '변경 파일',
    foldRequirements: '요구사항 → 구현 추적',
    foldImpact: '영향과 회귀 메모 <span class="muted-count">작성자 메모</span>',
    foldImpactMap: '기계 측정 영향 지도 <span class="muted-count">기능 소유, 계약 표면</span>',
    foldGlossary: '용어',
    foldSources: '원본 문서',
  },
});

/** Labels for a deck model — `model.reach.locale` selects; anything unknown renders English. */
export function deckLabelsFor(model) {
  const locale = model?.reach?.locale;
  return typeof locale === 'string' && Object.hasOwn(DECK_LABELS, locale) ? DECK_LABELS[locale] : DECK_LABELS.en;
}

/** First sentence as the lead, the rest underneath. A text with one sentence is all lead. */
export function splitLead(text) {
  const t = String(text ?? '').trim();
  const m = t.match(/^(.+?[.!?。])\s+(\S[\s\S]*)$/);
  return m ? { lead: m[1], rest: m[2] } : { lead: t, rest: '' };
}

function point(key, text, g, cls = '') {
  const { lead, rest } = splitLead(text);
  return `<li${cls ? ` class="${cls}"` : ''}><span class="k">${key}</span><div><p class="lead">${proseHtml(lead, g)}</p>${rest ? `<p class="rest">${proseHtml(rest, g)}</p>` : ''}</div></li>`;
}

/**
 * Reach, machine-computed from git paths (change-reach.mjs) so the author cannot talk it up or
 * down: the top tier in words, then all four tiers with their file counts. Paths sit in a tooltip.
 */
function renderReachBanner(reach, L = DECK_LABELS.en) {
  if (!reach) return '';
  const segs = reach.tiers
    .map((t) => {
      const title = t.touched ? ` title="${escapeHtml(t.paths.slice(0, 12).join('\n'))}"` : '';
      return `<li class="seg tone-${t.tone}${t.touched ? ' on' : ''}${t.id === reach.tier ? ' top' : ''}"${title}>${escapeHtml(t.short)} ${t.touched ? t.files : 0}</li>`;
    })
    .join('');
  const caveat = reach.source === 'builtin' ? `<p class="reach-caveat">${L.builtinCaveat}</p>` : '';
  return `<div class="reach" id="reach">
  <p class="reach-line"><b>${escapeHtml(reach.label)}</b> <span class="reach-means">${escapeHtml(reach.means)}</span></p>
  <ol class="reach-bar" aria-label="${L.reachLabel}">${segs}</ol>
  ${caveat}
</div>`;
}

function factList(id, rows, g) {
  const items = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<dt>${k}</dt><dd>${proseHtml(v, g)}</dd>`)
    .join('');
  return items ? `<dl class="facts" id="${id}">${items}</dl>` : '';
}

/** Who sees it, how many, from when, can it be undone. Only when the narrative carries it. */
function renderExposure(exposure, g, L = DECK_LABELS.en) {
  if (!exposure) return '';
  return factList('exposure', [
    [L.exposureWho, exposure.who],
    [L.exposureHowMany, exposure.howMany],
    [L.exposureWhen, exposure.when],
    [L.exposureReversible, exposure.reversible],
  ], g);
}

/** Data or contract movement. Only when stored data or an external contract moves. */
function renderDataChange(dataChange, g, L = DECK_LABELS.en) {
  if (!dataChange) return '';
  return factList('data-change', [
    [L.dataWhatMoves, dataChange.whatMoves],
    [L.dataCount, dataChange.count],
    [L.dataIrreversible, dataChange.irreversible],
    [L.dataOrder, dataChange.order],
    [L.dataConsumers, dataChange.consumers],
  ], g);
}

/**
 * Structured diagram, drawn by the renderer from narrative data (no library, no author SVG):
 *   flow          steps left to right; new / changed steps get the accent border and a tag. A step
 *                 with `branches` is a split: its alternatives stack in one column under the
 *                 question that decides between them, so a flow that goes one of two ways still
 *                 reads left to right.
 *   before_after  aspect, before, after rows
 */
function renderNarrativeDiagram(diagram, g, L = DECK_LABELS.en) {
  if (!diagram) return '';
  const caption = diagram.title ? `<p class="caption">${proseHtml(diagram.title, g)}</p>` : '';
  if (diagram.kind === 'flow') {
    const tags = { changed: L.flowChanged, new: L.flowNew, removed: L.flowRemoved, same: L.flowSame };
    const stateOf = (st) => (tags[st.state] ? st.state : 'same');
    const box = (st) =>
      `<div class="box"><span class="tag">${tags[stateOf(st)]}</span><b>${proseHtml(st.label, g)}</b>${st.note ? `<small>${proseHtml(st.note, g)}</small>` : ''}</div>`;
    const steps = (diagram.steps ?? [])
      .map((st) => {
        if (!st.branches) return `<li class="state-${stateOf(st)}">${box(st)}</li>`;
        const cond = st.label ? `<span class="cond">${proseHtml(st.label, g)}</span>` : '';
        const alts = st.branches.map((b) => `<div class="state-${stateOf(b)}">${box(b)}</div>`).join('');
        return `<li class="fork">${cond}<div class="alts">${alts}</div></li>`;
      })
      .join('');
    return `<h2>${L.flowTitle}</h2><figure class="diagram-flow" id="diagram-flow" style="margin:0"><ol class="flow">${steps}</ol>${caption}</figure>`;
  }
  if (diagram.kind === 'before_after') {
    const rows = (diagram.rows ?? [])
      .map((r) => `<tr><th>${proseHtml(r.aspect, g)}</th><td class="before">${proseHtml(r.before, g)}</td><td class="after">${proseHtml(r.after, g)}</td></tr>`)
      .join('');
    return `<h2>${L.flowTitle}</h2><figure class="diagram-ba" id="diagram-before-after" style="margin:0"><table class="ba"><thead><tr><th></th><th>${L.before}</th><th>${L.after}</th></tr></thead><tbody>${rows}</tbody></table>${caption}</figure>`;
  }
  return '';
}

/** The first trade-off in full (question, chosen, gave up, the cost); any others as one line each. */
function renderTradeoffs(tradeoffs, g, L = DECK_LABELS.en) {
  const [main, ...others] = tradeoffs;
  if (!main) return '';
  const minor = others
    .map((t) => `<p class="minor"><b>${proseHtml(t.topic, g)}: ${proseHtml(t.chosen, g)}.</b> ${L.tradeoffCost}: ${proseHtml(t.cost, g)}</p>`)
    .join('');
  return `<h2>${L.tradeoffsTitle}</h2>
<div id="tradeoffs">
  <p class="q">${proseHtml(main.topic, g)}</p>
  <div class="trade">
    <div><h3>${L.chosen}</h3><p><b>${proseHtml(main.chosen, g)}</b></p>${main.why ? `<p class="why">${proseHtml(main.why, g)}</p>` : ''}</div>
    <div><h3>${L.rejected}</h3><p>${proseHtml(main.rejected, g)}</p></div>
    <div class="cost"><h3>${L.tradeoffCost}</h3><p>${proseHtml(main.cost, g)}</p></div>
  </div>
  ${minor}
</div>`;
}

const STATUS_LABEL = { fixed: 'statusFixed', open: 'statusOpen', out_of_scope: 'statusOutOfScope' };

/** Risks: a status word, the scenario, what we do. Who notices and how we find out are folded. */
function renderFailureModes(failureModes, g, L = DECK_LABELS.en) {
  if (!failureModes?.length) return '';
  const rows = failureModes
    .map((f) => {
      const status = STATUS_LABEL[f.status] ? f.status : 'watch';
      const label = L[STATUS_LABEL[f.status] ?? 'statusWatch'];
      return `<div><dt class="s-${status}">${label}</dt><dd>${proseHtml(f.scenario, g)}${f.mitigation ? `<small>${proseHtml(f.mitigation, g)}</small>` : ''}</dd></div>`;
    })
    .join('');
  return `<h2>${L.failuresTitle}</h2><dl class="risks" id="failures">${rows}</dl>`;
}

function renderFailureDetails(failureModes, g, L = DECK_LABELS.en) {
  const items = (failureModes ?? [])
    .filter((f) => f.whoNotices || f.detect)
    .map((f) => `<li>${proseHtml(f.scenario, g)}<br/>${L.failuresWho}: ${proseHtml(f.whoNotices, g)}. ${L.failuresDetect}: ${proseHtml(f.detect, g)}</li>`)
    .join('');
  return items ? `<details class="more"><summary>${L.failuresDetailTitle}</summary><ul>${items}</ul></details>` : '';
}

function moreList(title, items, g) {
  if (!items?.length) return '';
  return `<details class="more"><summary>${title}</summary><ul>${items.map((x) => `<li>${proseHtml(x, g)}</li>`).join('')}</ul></details>`;
}

/**
 * Human brief, the first screen. Ordered for a reviewer who reads only the top: three points (why,
 * how, the one thing to check), the picture, the trade-off and its cost, the checklist, the risks.
 * Reach, exposure, data movement, gaps and risk details sit in one-line folds at the end.
 * Labels follow the deck locale (`DECK_LABELS`, English by default); prose is as the author wrote it.
 */
export function renderBriefSection(model) {
  const L = deckLabelsFor(model);
  const n = model.narrative;
  const g = model.glossary;
  const changedPaths = new Set((model.nameStatusRows ?? []).map((row) => row?.path));
  const first = n.reviewFocus[0];
  const lookFirst = first
    ? `<li class="look"><span class="k">${L.lookFirst}</span><div><p class="lead">${proseHtml(first.check, g)}</p><p class="rest">${L.ifWrong}: ${proseHtml(first.riskIfWrong, g)}</p></div></li>`
    : '';
  const checklist = n.reviewFocus
    .map((f) => `<li><div><p>${proseHtml(f.check, g)}</p><p class="where">${linkChangedPaths(f.where, changedPaths, g)}</p><p class="risk">${L.ifWrong}: ${proseHtml(f.riskIfWrong, g)}</p></div></li>`)
    .join('');
  const reachBody = [renderReachBanner(model.reach, L), renderExposure(n.exposure, g, L), renderDataChange(n.dataChange, g, L)].join('');
  return `<section class="brief" id="brief">
  <ol class="points">
    ${point(L.why, n.why, g)}
    ${point(L.how, n.how, g)}
    ${lookFirst}
  </ol>
  ${renderNarrativeDiagram(n.diagram, g, L)}
  ${renderTradeoffs(n.tradeoffs, g, L)}
  <h2>${L.reviewFocusTitle}</h2>
  <ul class="check" id="review-focus">${checklist}</ul>
  ${renderFailureModes(n.failureModes, g, L)}
  <div class="undo brief-rollback">
    <p>${L.rollback}: <code>${escapeHtml(n.rollback)}</code></p>
    ${n.next ? `<p>${L.next}: ${proseHtml(n.next, g)}</p>` : ''}
    ${model.origin ? '' : `<p class="origin-note">original request not recorded (no <code>## Original Request</code> in worktree PLAN.md and no <code>${escapeHtml(PASSPORT_RELPATH)}</code>), check request ↔ result by hand</p>`}
    <details class="more"><summary>${L.reachTitle}</summary><div class="more-body">${reachBody}</div></details>
    ${moreList(L.gapsTitle, n.knownGaps, g)}
    ${moreList(L.outOfScopeTitle, n.outOfScope, g)}
    ${renderFailureDetails(n.failureModes, g, L)}
  </div>
</section>`;
}

/**
 * Renders `where` as prose, turning only the changed-path tokens into links to the file tree:
 * `the chip loop in scripts/build.mjs,` → the chip loop in <a><code>scripts/build.mjs</code></a>,
 * (Korean particles glued to the path, `build.mjs의`, split the same way.)
 * The sentence stays prose (glossary tooltips intact); only the path is monospace.
 */
function linkChangedPaths(where, changedPaths, glossary) {
  return String(where ?? '')
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const m = splitPathMention(tok);
      if (!m || !changedPaths.has(m.core)) return proseHtml(tok, glossary);
      return `${escapeHtml(m.lead)}<a href="#structure"><code>${escapeHtml(m.core)}</code></a>${escapeHtml(m.rest)}`;
    })
    .join(' ');
}

/**
 * Opens every <details> around a fragment target so anchors into folded evidence always land —
 * on load, on hash change, and on every in-page click (a re-click of the current hash fires no
 * hashchange, and the reader may have folded the box again since).
 */
const REVEAL_JS = `
(function () {
  function revealId(id) {
    var el = id && document.getElementById(id); if (!el) return;
    for (var d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    el.scrollIntoView();
  }
  function reveal() { revealId(location.hash.slice(1)); }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
    if (a) revealId(a.getAttribute('href').slice(1));
  });
  window.addEventListener('hashchange', reveal); reveal();
})();`;

/** Folds a rendered section under a one-line summary. Empty sections fold to nothing. */
function fold(summary, html, { open = false } = {}) {
  if (!html) return '';
  return `<details class="evidence"${open ? ' open' : ''}><summary>${summary}</summary>${html}</details>`;
}

function renderRequirementTrace(model) {
  if (!model.narrative.requirements.length) return '';
  const cards = model.narrative.requirements
    .map((requirement) => {
      const implementation = requirement.implementation
        .map(
          (item) => `<div class="trace-box"><code>${escapeHtml(item.path)}</code><br/>${proseHtml(item.change, model.glossary)}</div>`,
        )
        .join('');
      return `<article class="trace-card">
  <h3>${escapeHtml(requirement.id)} · ${proseHtml(requirement.need, model.glossary)}</h3>
  <p class="muted">Rationale · ${proseHtml(requirement.why, model.glossary)}</p>
  <div class="trace-grid">
    <div class="trace-box"><b>Requirement</b><br/>${proseHtml(requirement.need, model.glossary)}</div>
    <div class="trace-arrow" aria-hidden="true">→</div>
    <div class="trace-impl">${implementation}</div>
  </div>
  <p class="trace-validation">Validation · ${proseHtml(requirement.validation, model.glossary)}</p>
</article>`;
    })
    .join('\n');
  const map = renderVisualFigure({
    svg: renderTraceMapSvg(model.traceGraph),
    caption: 'Requirements → Implementation File Mapping',
    note: 'Dotted lines / ⚠ represent changed files not linked to any requirement (coverage gap)',
  });
  return `<section class="card" id="traceability">
  <h2>Requirements → Implementation Traceability <span class="gen machine">Diagram verified against git changesets</span></h2>
  ${map}
  <div class="trace-list">${cards}</div>
</section>`;
}

function renderFileTreeNodes(nodes, noteByPath, glossary, root = false) {
  const items = nodes
    .map((node) => {
      if (node.type === 'directory') {
        return `<li class="tree-node" role="treeitem" aria-expanded="true">
  <div class="tree-dir-label">▾ ${escapeHtml(node.name)}/</div>
  ${renderFileTreeNodes(node.children, noteByPath, glossary)}
</li>`;
      }
      const note = noteByPath.get(node.path);
      const noteHtml = note
        ? `<p class="tree-note">${proseHtml(note.change ?? '', glossary)}<br/><span class="tree-reason">Reason · ${proseHtml(note.reason ?? '', glossary)}</span></p>`
        : '';
      return `<li class="tree-node tree-file" role="treeitem">
  <div class="tree-file-head">${fileBadge(node.kind)} <code>${escapeHtml(node.name)}</code></div>
  ${noteHtml}
</li>`;
    })
    .join('\n');
  return `<ul class="tree" role="${root ? 'tree' : 'group'}">${items}</ul>`;
}

function renderFileTreeSection(model) {
  const noteByPath = new Map(model.narrative.fileNotes.map((note) => [note.path, note]));
  const noteLabel = noteByPath.size ? 'git paths + AI rationale' : 'git paths';
  return `<section class="card" id="structure"><span id="changes"></span>
  <h2>Change Structure <span class="gen machine">${noteLabel}</span></h2>
  ${renderFileTreeNodes(model.fileTree, noteByPath, model.glossary, true)}
</section>`;
}

function renderContractChanges(narrative) {
  const apiRows = narrative.apiChanges
    .map((item) => `<li><code>${escapeHtml(item.surface)}</code> · ${escapeHtml(item.before)} → ${escapeHtml(item.after)} (${escapeHtml(item.compat)})</li>`)
    .join('');
  const specRows = narrative.specChanges
    .map((item) => `<li><code>${escapeHtml(item.doc)}</code> · ${escapeHtml(item.change)}</li>`)
    .join('');
  if (!apiRows && !specRows) return '';
  return `<div class="risk-box"><h3>Contract & Spec Changes</h3>${apiRows ? `<ul>${apiRows}</ul>` : ''}${specRows ? `<ul>${specRows}</ul>` : ''}</div>`;
}

/** Legacy impact / regression prose and contract lists — folded, and only when the author wrote them. */
function renderImpactSection(model) {
  const narrative = model.narrative;
  const g = model.glossary;
  const contracts = renderContractChanges(narrative);
  if (!narrative.impact && !narrative.regressionRisk && !contracts) return '';
  return `<section class="card" id="impact">
  <h2>Impact & Risks <span class="gen ai">AI-authored · rollback is in the brief above</span></h2>
  <div class="risk-grid">
    ${narrative.impact ? `<div class="risk-box"><h3>Blast Radius</h3>${proseHtml(narrative.impact, g)}</div>` : ''}
    ${narrative.regressionRisk ? `<div class="risk-box"><h3>Regression Risk & Mitigation</h3>${proseHtml(narrative.regressionRisk, g)}</div>` : ''}
    ${contracts}
  </div>
</section>`;
}

/** Everything below the brief: evidence a reviewer opens on demand. Empty sections fold to nothing. */
function renderEvidenceFolds(model, stats, L = DECK_LABELS.en) {
  const churn = `${stats.files ?? 0} files · +${stats.added ?? 0} −${stats.deleted ?? 0}`;
  return [
    fold(L.foldOrigin, model.origin ? renderOriginSection(model.origin) : ''),
    fold(`${L.foldChangedFiles} <span class="muted-count">${churn}</span>`, renderFileTreeSection(model)),
    fold(`${L.foldRequirements} <span class="muted-count">requirements ${model.narrative.requirements.length}</span>`, renderRequirementTrace(model)),
    fold(L.foldImpact, renderImpactSection(model)),
    fold(L.foldImpactMap, renderImpactMapSection(model.signals?.impactMap, { readFirstTitle: 'Suggested read order' })),
    fold(L.foldGlossary, renderGlossarySection(model)),
    fold(L.foldSources, renderAppendix(model)),
  ].join('\n');
}

/** Title: one meta line (branch, size, reach), the change in one sentence, who it is for. */
function renderDeckHeader(model, stats) {
  const L = deckLabelsFor(model);
  const n = model.narrative;
  const reach = model.reach ? ` · ${escapeHtml(model.reach.label)}` : '';
  return `  <header class="ship-head">
    <p class="meta"><code>${escapeHtml(model.branch)}</code> → <code>${escapeHtml(model.baseRef)}</code> · ${L.files(stats.files ?? 0)}, +${escapeHtml(String(stats.added ?? 0))} / −${escapeHtml(String(stats.deleted ?? 0))}${reach}</p>
    <h1>${proseHtml(n.what, model.glossary)}</h1>
    ${n.forWhom ? `<p class="for">${L.forWhom}: ${proseHtml(n.forWhom, model.glossary)}</p>` : ''}
  </header>`;
}

/**
 * Deck model → Self-contained HTML string.
 */
export function renderDeckHtml(model) {
  if (!model.narrative || model.narrativeErrors?.length) {
    throw new Error(`ship-deck narrative contract violation: ${(model.narrativeErrors || ['no narrative']).join('; ')}`);
  }
  const hasSignals = Boolean(model.signals?.risks?.length || model.signals?.coverage?.missing?.length);
  const stats = model.stats ?? {};
  const L = deckLabelsFor(model);
  return applyDeckTheme(`<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pre-Ship Review — ${escapeHtml(model.branch)}</title>
<style>${DECK_CSS}${DECK_VISUAL_CSS}${SHIP_DECK_CSS}</style>
</head>
<body>
<main class="ship">
${renderDeckHeader(model, stats)}
${renderBriefSection(model)}
${hasSignals ? renderScorecardSection(model.signals, { title: L.scorecardTitle }) : ''}
${renderEvidenceFolds(model, stats, L)}
</main>
<script>${REVEAL_JS}</script>
</body>
</html>
`);
}
