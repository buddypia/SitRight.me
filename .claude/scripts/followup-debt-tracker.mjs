#!/usr/bin/env node
/**
 * followup-debt-tracker.mjs
 *
 * R-CM-033 (followup-debt-tracking) SSOT management tool.
 *
 * Purpose: Tracks deferred follow-up tasks intentionally marked in PR descriptions
 * ("separate PR", "follow-up PR", "follow-up", "deferred", etc.) to prevent silent quality omission.
 *
 * SSOT: .brief2dev/system/followup-debt.json
 * Schema: data/registry/followup-debt.schema.json
 *
 * Subcommands:
 *   register --pr <num> [--from-text "..."] [--from-file <path>] [--source-url <url>] [--json]
 *     Parses PR description and registers follow-up debt items.
 *
 *   list [--status open|addressed|wontfix] [--severity CRITICAL|HIGH|MEDIUM|LOW] [--json]
 *     Lists registered debt items.
 *
 *   close --id DEBT-<n> [--addressed-pr <num>] [--wontfix --reason "..."]
 *     Marks a debt item as addressed or wontfix.
 *
 *   audit [--max-age-days N] [--json]
 *     Exits with code 1 if any HIGH/CRITICAL items have been open longer than N days (default 30).
 *
 * Environment variables:
 *   BRIEF2DEV_FOLLOWUP_DEBT_PATH  SSOT file path override (for tests)
 *   GH_TOKEN                       gh API token for fetching PR description
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolveSystemFile } from '../../.cli/lib/layout-resolver.mjs';
import { writeJsonAtomicSync } from './lib/atomic-fs.mjs';

const DEFAULT_MAX_AGE_DAYS = 30;
const COMPACT_CLOSED_DAYS = 30; // Archive threshold for closed (addressed|wontfix) items
const LAPSE_OPEN_LOW_DAYS = 90; // Dormancy threshold for untouched open LOW items
const CATEGORIES = new Set(['code_review_finding', 'code_reviewer_finding', 'general_followup']);
const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

/**
 * Non-blocking advisory aggregation (F6).
 * Surfaces maintenance backlogs separately from HIGH/CRITICAL exit-1 gates.
 * Pure function — isolated for testing.
 *
 * @param {Array} items
 * @param {number} now - Reference timestamp in ms
 * @returns {{ open_total:number, escalated_open:number, drain_pending:number,
 *   drain_pending_lapse:number, drain_pending_compact:number, warn:boolean }}
 */
export function computeDebtAdvisory(
  items,
  now,
  { lapseDays = LAPSE_OPEN_LOW_DAYS, compactDays = COMPACT_CLOSED_DAYS } = {},
) {
  const list = Array.isArray(items) ? items : [];
  const open = list.filter((it) => it && it.status === 'open');
  const lapse = selectLapsableDebt(list, now, { days: lapseDays }).length;
  const compact = selectCompactableDebt(list, now, { days: compactDays }).length;
  const pending = lapse + compact;
  return {
    open_total: open.length,
    escalated_open: open.filter((it) => it.severity !== 'LOW').length,
    drain_pending: pending,
    drain_pending_lapse: lapse,
    drain_pending_compact: compact,
    warn: pending > 0,
  };
}

/**
 * Selects debt IDs eligible for compaction (archiving).
 * Targets closed items (status in {addressed, wontfix}) older than `days`.
 * Open items are strictly excluded (no auto-triage of open items).
 * Pure function returning an array of IDs.
 *
 * @param {Array} items
 * @param {number} now - Reference timestamp in ms
 * @param {{ days?: number }} [opts]
 * @returns {string[]} Compaction candidate debt IDs
 */
function isCompactableClosedItem(it, now, days) {
  if (!it || typeof it.id !== 'string' || it.id.length === 0) return false;
  if (it.status !== 'addressed' && it.status !== 'wontfix') return false;
  const t = Date.parse(it.addressed_at || it.added_at || '');
  if (Number.isNaN(t)) return true;
  return Math.floor((now - t) / 86400000) >= days;
}

export function selectCompactableDebt(items, now, { days = COMPACT_CLOSED_DAYS } = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((it) => isCompactableClosedItem(it, now, days)).map((it) => it.id);
}

/**
 * Selects debt IDs eligible for dormancy lapse (open LOW backlog management).
 * Targets open items with severity LOW where age >= days.
 *
 * Exemptions:
 *   - status !== 'open'
 *   - severity !== 'LOW' (MEDIUM/HIGH/CRITICAL are escalated and kept intentionally)
 *   - unparseable or missing added_at
 *
 * @param {Array} items
 * @param {number} now - Reference timestamp in ms
 * @param {{ days?: number }} [opts]
 * @returns {string[]} Lapsable debt IDs
 */
function isLapsableOpenItem(it, now, days) {
  if (!it || typeof it.id !== 'string' || it.id.length === 0) return false;
  if (it.status !== 'open') return false;
  if (it.severity !== 'LOW') return false;
  const t = Date.parse(it.added_at || '');
  if (Number.isNaN(t)) return false;
  return Math.floor((now - t) / 86400000) >= days;
}

export function selectLapsableDebt(items, now, { days = LAPSE_OPEN_LOW_DAYS } = {}) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((it) => isLapsableOpenItem(it, now, days)).map((it) => it.id);
}

// A heading opens a section when it matches one of these. PR bodies in this repo are written in
// Korean, so each concept carries its Korean form next to the English one: a Korean-only heading
// that matches nothing parses to zero, and every bullet under it is dropped with no warning. That
// gap has been found twice — `범위 밖`, while `out of scope` and `scope 외` were listed, and bare
// `후속`, while only its `PR`/`과제`/`작업` compounds were and English already had bare `follow-up`.
// The second hid 20 headings — 31 bullets — of merged #906–#1345 from the parser (measured
// 2026-10-04). A bare form covers its compounds, so `follow-up PR` or `후속 과제` is not listed on
// its own. `deferred` stays unpaired: of those 400 PRs one heads a section 이월 (#1169), and it
// holds a line of prose, no bullet.
//
// PR #1213 is NOT evidence for the `범위 밖` gap: its `count: 0` came from `ops.mjs` discarding
// `--body-file`, so the body never reached GitHub and there was nothing to parse (measured
// 2026-08-25, corrected in the PR that added this paragraph). That gap is real but was found by
// reading, not by that incident.
const KEYWORDS = [
  /후속/,
  /follow[-\s]?up/i,
  /별도\s*PR/i,
  /separate\s*PR/i,
  /범위\s*밖/i,
  /scope\s*외/i,
  /out\s*of\s*scope/i,
  /deferred/i,
];

function getSsotPath() {
  if (process.env.BRIEF2DEV_FOLLOWUP_DEBT_PATH) {
    return resolve(process.env.BRIEF2DEV_FOLLOWUP_DEBT_PATH);
  }
  return resolveSystemFile('followup-debt.json');
}

export function loadDebt() {
  const path = getSsotPath();
  if (!existsSync(path)) {
    return { version: '1.0.0', updated_at: new Date().toISOString(), items: [] };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`followup-debt.json parse failed: ${e.message}`);
  }
}

/**
 * Updates SSOT. Throws on atomic write failure so caller can handle fail-open/fail-closed.
 */
function saveDebt(debt) {
  const path = getSsotPath();
  debt.updated_at = new Date().toISOString();
  writeJsonAtomicSync(path, debt);
}

/**
 * Closes a single debt item (open → addressed | wontfix).
 *
 * @param {string} id - DEBT-N
 * @param {{ reason?: string, addressedPr?: number, now?: string }} [opts]
 * @returns {object} Updated item
 */
export function closeDebt(id, opts = {}) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('closeDebt: id required');
  }
  const debt = loadDebt();
  const item = (debt.items || []).find((it) => it.id === id);
  if (!item) throw new Error(`closeDebt: debt not found: ${id}`);
  if (item.status && item.status !== 'open') {
    throw new Error(`closeDebt: debt already ${item.status}: ${id}`);
  }
  const now = opts.now || new Date().toISOString();
  if (opts.reason) {
    if (String(opts.reason).trim().length < 10) {
      throw new Error('closeDebt: wontfix reason ≥10 chars (R-CM-033 #8)');
    }
    item.status = 'wontfix';
    item.wontfix_reason = String(opts.reason).trim();
  } else {
    item.status = 'addressed';
    item.addressed_pr = opts.addressedPr || null;
  }
  item.addressed_at = now;
  saveDebt(debt);
  return item;
}

/**
 * Removes a debt item from SSOT for archiving/hard-deletion.
 *
 * @param {string} id - DEBT-N
 * @returns {object|null} Removed item
 */
export function removeDebtItem(id) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('removeDebtItem: id required');
  }
  const debt = loadDebt();
  const items = debt.items || [];
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return null;
  const [removed] = items.splice(idx, 1);
  debt.items = items;
  saveDebt(debt);
  return removed;
}

/**
 * Restores a debt item from archive back into SSOT.
 * Idempotent: avoids adding duplicate if id already exists.
 *
 * @param {object} item
 * @returns {object} Restored item
 */
export function restoreDebtItem(item) {
  if (!item || typeof item !== 'object' || typeof item.id !== 'string' || item.id.length === 0) {
    throw new Error('restoreDebtItem: item with id required');
  }
  const debt = loadDebt();
  const items = debt.items || [];
  if (!items.some((it) => it.id === item.id)) {
    items.push(item);
    debt.items = items;
    saveDebt(debt);
  }
  return item;
}

function nextId(items) {
  let max = 0;
  for (const item of items) {
    const m = /^DEBT-(\d+)$/.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `DEBT-${max + 1}`;
}

/**
 * Dedup key for a description (Rule 2: one row per identical description within a `source_pr`).
 *
 * The key is the body `extractInlineSeverity` stores for the text, not a second reading of it. Rows
 * the parser could not read kept their markers verbatim: brackets written before the extraction
 * existed, bare `HIGH:` before it read that form, and `P1 MEDIUM:` / `**[HIGH]** …` before it read
 * those. Without this, re-registering the same PR body compares `"[MEDIUM] foo"` (stored) against
 * `"foo"` (parsed), never matches, and files a second row — observed for real on PR #1262, which
 * produced 4 duplicates. A key with its own marker regex would drift the day the parser learns one
 * more spelling; one taken from the same extraction cannot. Normalizing the *key* rather than
 * rewriting stored rows leaves the ledger as its authors left it: a bulk rewrite would record a
 * re-read nobody reviewed, and the grade it might change is what the audit gate and the dormancy
 * lapse act on. Nothing on disk changes, the spellings just stop looking like different debts.
 *
 * A leading Actions-scale token stays in the body as `(P1)` on both sides, so `P1 MEDIUM: foo` and
 * `P2 MEDIUM: foo` remain two debts while `P1 MEDIUM: foo` and the canonical `MEDIUM: (P1) foo` are one.
 */
function normalizeDescription(value) {
  return extractInlineSeverity(String(value ?? '')).body.toLowerCase().replace(/\s+/g, ' ');
}

/**
 * A description's citations of debts that are still open.
 *
 * Why: a PR's follow-up section said `(DEBT-21, still open)` in so many words, and the registrar
 * filed a new row anyway. Dedup is scoped to `source_pr` (Rule 2 is "one row per identical
 * description *within a PR*"), so a debt carried across PRs gets a fresh row every time. The ledger
 * inflates, "N open items" stops meaning anything, and an agent reading `list` counts one debt twice.
 *
 * Suppressing the row was rejected. A genuinely new debt may cite an old id for context ("like
 * DEBT-10 but a different failure"), and merging those loses work. A duplicate is visible to whoever
 * reads the ledger; a silently dropped debt is not. So the row is written and the relationship is
 * stated loudly, at the one moment someone is looking: the ship report.
 *
 * @param {string} description
 * @param {Set<string>} openIds - DEBT-N ids currently in `open` status
 * @returns {string[]} cited open ids, in first-seen order, deduplicated
 */
export function citedOpenDebts(description, openIds) {
  const cited = [];
  for (const m of String(description ?? '').matchAll(/\bDEBT-\d+\b/g)) {
    if (openIds.has(m[0]) && !cited.includes(m[0])) cited.push(m[0]);
  }
  return cited;
}

function readOption(args, name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : null;
}

/**
 * The Actions scale from R-CM-030 Rule 14. Deliberately NOT mapped onto `severity`.
 *
 * Rule 14 defines both scales side by side — Actions as `P0`/`P1`/`P2`, Findings as the severity
 * enum this ledger is keyed on — and warns that "a second vocabulary forks the ledgers". Translating
 * `P1` into `MEDIUM` here would be exactly that translation, invented by this file rather than
 * stated by the author. Folding it silently into the LOW default is no better: it is the same
 * dropped-severity defect one slot over. So it is named back to the author instead.
 */
const ACTION_SCALE = new Set(['P0', 'P1', 'P2']);

/**
 * A leading `[TOKEN]`. Anchored at line start so prose like "roughly [MEDIUM] weight" is untouched.
 *
 * The trailing whitespace is `\s*`, not `\s+`. Requiring a space made `- [HIGH]로그인 실패…` — no
 * space, ordinary in Korean prose and a one-keystroke typo in any language — fall through to the
 * leave-it-alone branch: filed LOW, marker still embedded, and no warning on either channel. That
 * is the very defect this parser exists to end, reached by a different door. Anchoring is what
 * keeps mid-sentence brackets safe; the space never contributed to that.
 */
const LEADING_MARKER = /^\[([A-Za-z0-9-]+)\]\s*/;

/**
 * The same tokens written without brackets: `HIGH: …`, `P2 — …`.
 *
 * Measured 2026-10-03: of the 30 items registered from PRs after #1265 (which added the bracket
 * form), 18 led with a bare marker and none of those was read — 5 filed under the wrong grade (2 of
 * them HIGH, which the 30-day audit then never saw) and 4 Actions-scale lines that never got their
 * warning. Unlike the bracket, this is uppercase only and needs the separator: a bracket is markup,
 * but `High: …` or `HIGH 우선순위…` can be an ordinary sentence.
 */
const BARE_MARKER = new RegExp(`^(${[...SEVERITIES, ...ACTION_SCALE].join('|')})\\s*[:—]\\s*`);

/** At most one can match (`[` vs a letter). Both are anchored, so `[DEBT-42] HIGH: …` reads no grade. */
function matchLeadingMarker(text) {
  return text.match(LEADING_MARKER) ?? text.match(BARE_MARKER);
}

/**
 * An Actions-scale token written in front of a severity marker: `P1 MEDIUM:`, `P2 / LOW:`, `P1/LOW:`,
 * `(P1) MEDIUM:`, `[P2] HIGH:`. Whitespace or a slash must follow, so `P10 …` and `P1foo` are not
 * one. The bare token is uppercase only, like `BARE_MARKER`; a bracket or paren vouches for itself.
 */
const SCALE_LEAD = /^(?:(P[0-2])|\(([Pp][0-2])\)|\[([Pp][0-2])\])(?:\s*\/\s*|\s+)/;

/**
 * The `**` an author opened at the line start is closed at its end when the body holds an odd
 * number of them; with an even number the last one belongs to a pair inside the body (`**[MEDIUM] x
 * **y**`) and stripping it would break that pair. Only the balanced case is touched — a `**` that
 * closed mid-line (`**[MEDIUM] title** — rest`) is left where it is rather than guessed at.
 */
function dropClosingBold(body) {
  const text = body.trimEnd();
  const balanced = text.endsWith('**') && (text.match(/\*\*/g) ?? []).length % 2 === 1;
  return balanced ? text.slice(0, -2) : body;
}

/**
 * The one reading of a leading severity marker, shared by `extractInlineSeverity` (what is stored)
 * and `normalizeDescription` (the dedup key) so the two cannot disagree: optional `**`, optional
 * `SCALE_LEAD`, then the marker, then an optional `**` closing right after it.
 *
 * The scale token is neither mapped onto a grade nor dropped: the body keeps it as `(P1) <text>`,
 * exactly what the canonical `MEDIUM: (P1) <text>` stores, so both spellings carry one key.
 *
 * @returns {{body: string, severity: string}|null} null when no grade was read
 */
function readSeverityMarker(raw) {
  const bold = raw.startsWith('**');
  let rest = bold ? raw.slice(2) : raw;
  const scale = rest.match(SCALE_LEAD);
  if (scale) rest = rest.slice(scale[0].length);
  const m = matchLeadingMarker(rest);
  const severity = m?.[1].toUpperCase();
  if (!SEVERITIES.has(severity)) return null;
  const afterMarker = rest.slice(m[0].trimEnd().length);
  const closed = bold && afterMarker.startsWith('**');
  const tail = closed ? afterMarker.slice(2) : rest.slice(m[0].length);
  const text = (bold && !closed ? dropClosingBold(tail) : tail).trim();
  const token = scale?.slice(1).find(Boolean).toUpperCase();
  return { severity, body: token ? `(${token}) ${text}`.trim() : text };
}

/**
 * Extracts a leading severity marker — `[SEVERITY]`, `SEVERITY:` or `SEVERITY —` — from a bullet line.
 *
 * R-CM-030 Rule 14 states that a Panel finding "transcribes into `followup-debt-tracker register`
 * untranslated" because both use the same enum. That was not true: `cmdRegister` applied one
 * `--severity` to every item, and the automatic path (`ops.mjs#registerFollowupDebtFromPr`) never
 * passes the flag, so every auto-registered item landed LOW no matter what the body said. Measured
 * on PR #1260 and #1262 (2026-09-06) — 3 of #1262's 7 items were written `[MEDIUM]`, one of them
 * "L3 guard has zero executable coverage", and all 7 were filed LOW.
 *
 * Severity is not decoration: the 30-day audit gate only looks at HIGH/CRITICAL and the 90-day
 * dormancy lapse only seals LOW, so a flattened ledger quietly sleeps its heaviest items.
 *
 * Inside a bracket, case is normalized rather than rejected — dropping `[Medium]` because of its
 * casing would be the same silent discard this function exists to end, and the token set is closed
 * so nothing else can be confused for it. The bare form has no markup to vouch for it, so it is read
 * only uppercase with a separator (`BARE_MARKER`). An unrecognized leading bracket (`[DEBT-42]`, a
 * date, a link label) is left strictly alone: only the Actions scale gets a warning, because only it
 * is a plausible mix-up between two scales the same rule defines.
 *
 * The marker may also sit inside bold and behind a scale token (`readSeverityMarker`). The anchor
 * used to be "the line starts with the marker", so `P1 MEDIUM: …`, `[P2] HIGH: …` and `**[HIGH]** …`
 * fell through whole: filed LOW with the grade still in the text, and no warning, because the scale
 * warning needs the scale to be *alone*. Measured 2026-10-07 on the ledger's 186 rows: 15 rows
 * were such lines (8 still open), and 5 of them had stated MEDIUM. A spelling this grammar still
 * misses is named back by `unreadLeadingGrade`, not filed LOW in silence.
 *
 * @returns {{body: string, severity: string|null, misusedScale: string|null}}
 */
export function extractInlineSeverity(line) {
  const raw = String(line ?? '');
  const read = readSeverityMarker(raw);
  if (read) return { ...read, misusedScale: null };
  // Marker kept verbatim in both remaining cases: a stripped marker leaves the author's stated
  // intent nowhere, while text left as written lets `list` show the typo to whoever reads the ledger.
  const token = matchLeadingMarker(raw)?.[1].toUpperCase();
  return { body: raw.trim(), severity: null, misusedScale: ACTION_SCALE.has(token) ? token : null };
}

/**
 * A leading run of markup and scale tokens, then a grade word the parser did not read. The run is
 * deliberately only brackets, parens, `*`, slash, pipe, dashes, spaces and `P0`-`P2`: anything with a
 * letter in it (`[DEBT-42]`, `**후속 PR**`, `[ ]`) is a different kind of lead and ends the run. At
 * least one such character is needed, so a line that simply starts with the word — `HIGH 우선순위…`,
 * `HIGH/CRITICAL 만 본다…` — is prose about grades, which is exactly why `BARE_MARKER` asks for a
 * separator. Uppercase only, whole word, for the same reason.
 */
const UNREAD_GRADE = /^(?:[\s*[\]()/|–—-]|P[0-2](?!\w))+(CRITICAL|HIGH|MEDIUM|LOW)(?!\w)/;

/**
 * Safety net for `extractInlineSeverity`: the grade an author evidently stated but the parser did
 * not read, or null. The registrar then says so instead of filing the line LOW in silence — a grammar
 * can never list every way to write `(MEDIUM)`, but it can refuse to be wrong quietly.
 */
function unreadLeadingGrade(text) {
  return UNREAD_GRADE.exec(text)?.[1] ?? null;
}

/**
 * Section-state transition for one line. Returns the state unchanged for non-headings.
 *
 * A heading matching a deferral keyword opens the section and records its depth; a later heading at
 * that depth or shallower closes it, while deeper ones are subsections and stay inside.
 *
 * @param {string} line
 * @param {{inSection: boolean, depth: number}} state
 * @returns {{inSection: boolean, depth: number}}
 */
function advanceSection(line, state) {
  if (!/^#+\s/.test(line)) return state;
  const depth = (line.match(/^#+/) || [''])[0].length;
  const matchesKeyword = KEYWORDS.some((rx) => {
    rx.lastIndex = 0;
    return rx.test(line);
  });
  if (matchesKeyword) return { inSection: true, depth };
  if (state.inSection && depth <= state.depth) return { inSection: false, depth: state.depth };
  return state;
}

/** The item text of a `-`/`*` or `1.`/`1)` list line, or null when the line is not one. */
function listItemText(line) {
  const m = line.match(/^\s*[-*]\s+(.+)/) || line.match(/^\s*\d+[.)]\s+(.+)/);
  return m ? m[1] : null;
}

// A bullet that only says the section is empty — `없음 (…)`, `None — …` — is not a debt. Reading
// bare `후속` headings started capturing two (#1274, #1134). A skip leaves only a warning while a
// wrong row stays in `list`, so only a clear separator ends the word: an em or en dash, a hyphen,
// colon or period before a space or the line end, or a parenthetical that closes the line, a
// period after it allowed. A debt that merely opens with the word stays an item:
// `없음 상태에서 …`, `none-check …`, `없음(null) …`.
const NONE_MARKER = /^(?:없음|해당\s*없음|none|n\/a)\s*(?:$|[—–]|[-:.](?:\s|$)|\([^)]*\)[.\s]*$)/i;

/**
 * Extracts follow-up debt items from PR description text.
 *
 * @param {string} text PR description body
 * @param {{onDropped?: (info: {line: string, body: string, reason: string}) => void}} [opts]
 *   `onDropped` fires for a substantive bullet that still yields no item: reason `floor` when it
 *   only fell under the length floor **because** the markers were stripped off it, `none` when it
 *   reads as saying the section is empty. Passed as a callback rather than a second return value
 *   so the array contract every existing caller relies on stays exactly as it was.
 * @returns {Array<{description: string, files: string[], severity: string|null, misusedScale: string|null}>}
 */
export function parsePrDescription(text, { onDropped = () => {} } = {}) {
  if (!text || typeof text !== 'string') return [];

  const items = [];
  let section = { inSection: false, depth: 0 };

  for (const line of text.split(/\r?\n/)) {
    section = advanceSection(line, section);
    if (!section.inSection) continue;

    const raw = listItemText(line);
    if (!raw) continue;

    // The marker is stripped first so the length floor below measures the actual description, not
    // the marker. `body` comes back trimmed on every branch of `extractInlineSeverity`.
    const { body: trimmed, severity, misusedScale } = extractInlineSeverity(raw.trim());
    if (NONE_MARKER.test(trimmed)) {
      // The marker reads only the opening, so `없음 — 다만 X 는 남았다` is skipped along with the
      // debt it names. A line long enough to have been a row is reported, not skipped in silence.
      if (trimmed.length >= 10) onDropped({ line: raw.trim(), body: trimmed, reason: 'none' });
      continue;
    }
    if (trimmed.length >= 10) {
      items.push({
        description: trimmed,
        files: extractFiles(trimmed),
        severity,
        misusedScale,
      });
    } else if (raw.trim().length >= 10) {
      // Stripping the markers is what pushed this under the floor — the author did write a
      // substantive line. Dropping it stays correct (`description` is `minLength: 10` in
      // followup-debt.schema.json), but doing it *silently* is not: every other drop path in
      // this file says something, and a debt that vanishes between the PR body and the ledger
      // is the exact class of loss the DEBT-326 note below was written about.
      onDropped({ line: raw.trim(), body: trimmed, reason: 'floor' });
    }
  }

  const seen = new Set();
  return items.filter((it) => {
    const key = normalizeDescription(it.description);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Source extensions recognized in prose. Order is irrelevant — see the boundary note below. */
const SOURCE_EXT_SRC = 'mjs|js|ts|tsx|jsx|json|md|py|go|rs';
const SPLIT_AFTER_EXT = new RegExp(`(?<=\\.(?:${SOURCE_EXT_SRC}))/`);

function extractFiles(text) {
  const files = [];
  const addFile = (file) => {
    if (!files.includes(file)) files.push(file);
  };
  const patterns = [
    /`([^\s`]+\.[a-z0-9]+)`/g,
    // The optional leading dot keeps `.claude/…` and `.cli/…` whole. The first-letter class alone
    // skipped it, so an unbackticked path, or a backticked one carrying a `:line` or `#symbol`
    // suffix, was filed as `cli/lib/utils.mjs` — a path that does not exist (7 of 137 bullets in
    // merged #906–#1345, measured 2026-10-04). `addFile` had patched that symptom since #289 by
    // preferring the dotted twin; with the dot read here there is no twin left to reconcile. A `./`
    // or `../` prefix still drops, because a letter must follow the dot. Nor is the dot read after
    // a letter, digit, closing bracket or another dot: there it ends a sentence glued to the path
    // (`끝났다.scripts/x.mjs`), and taking it would file a path that does not exist. The class lists
    // what may not precede the dot rather than what may, so an opener nobody listed — a quote,
    // `**`, `|` — still keeps it.
    //
    // The two lookaheads close the extension. Alternation in JS is first-match, not longest-match,
    // so without a terminator `js` won a race against `json` and `ts` against `tsx` — every
    // unbackticked `package.json` was filed as `package.js`, a path that does not exist. Four debt
    // records had already been written that way before this was noticed (2026-09-06). Ordering the
    // list longest-first would also fix today's cases, but silently re-breaks the moment someone
    // adds an extension in the wrong slot; a boundary holds regardless of order.
    //
    // They are two, not one: `(?![\w.])` would also reject a *sentence-ending* period, so prose as
    // ordinary as `…see foo.json.` extracted nothing at all. `(?!\.\w)` rejects only a dot that
    // continues into more extension (`foo.js.map`, `a.md.bak`), which is the case worth rejecting.
    // Regexes are built per call so this function keeps no `lastIndex` between calls; it runs a
    // handful of times per PR body, where the compile cost is not worth trading purity for.
    new RegExp(
      `((?:(?<![\\p{L}\\p{N})\\]}.])\\.)?` +
        `[a-zA-Z_][\\w./-]*\\.(?:${SOURCE_EXT_SRC})(?!\\w)(?!\\.\\w))`,
      'gu',
    ),
  ];
  for (const rx of patterns) {
    let m;
    while ((m = rx.exec(text))) {
      // `a.mjs/b.mjs` in prose is two files. A path segment already carrying a source extension
      // cannot also be a directory, so the slash after it is a list separator (DEBT-237).
      for (const part of m[1].split(SPLIT_AFTER_EXT)) addFile(part);
    }
  }
  return files;
}

function fetchPrBody(prNumber) {
  try {
    const json = execFileSync('gh', ['pr', 'view', String(prNumber), '--json', 'body', '--jq', '.body'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return json.trim();
  } catch (e) {
    throw new Error(`gh pr view ${prNumber} failed: ${e.message}`);
  }
}

function resolveRepoUrl() {
  try {
    const url = execFileSync('gh', ['repo', 'view', '--json', 'url', '--jq', '.url'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return url.trim() || null;
  } catch {
    return null;
  }
}

function cmdRegister(args) {
  const prIdx = args.indexOf('--pr');
  if (prIdx < 0 || !args[prIdx + 1]) {
    console.error('Error: --pr <num> required');
    process.exit(1);
  }
  const prNumber = parseInt(args[prIdx + 1], 10);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    console.error('Error: --pr must be a positive integer');
    process.exit(1);
  }

  let body = '';
  const fromTextIdx = args.indexOf('--from-text');
  const fromFileIdx = args.indexOf('--from-file');
  // An explicit `--from-text ""` is an empty body, not a missing one: ship passes the body it sent,
  // and an empty one must not send the register back to `gh`.
  if (fromTextIdx >= 0 && args[fromTextIdx + 1] !== undefined) {
    body = args[fromTextIdx + 1];
  } else if (fromFileIdx >= 0 && args[fromFileIdx + 1]) {
    body = readFileSync(args[fromFileIdx + 1], 'utf8');
  } else {
    body = fetchPrBody(prNumber);
  }

  const dropped = [];
  // Trimmed whatever the source: `fetchPrBody` always trimmed, and a leading BOM or space would
  // otherwise hide a deferral heading on the first line.
  const parsed = parsePrDescription(body.trim(), { onDropped: (d) => dropped.push(d) });
  const droppedWarnings = dropped.map(({ line, body: rest, reason }) =>
    reason === 'none'
      ? `skipped: "${line}" — read as saying the section is empty, so nothing was recorded. ` +
        `If it names a debt too, register it as its own bullet under a follow-up heading: ` +
        `\`register --pr ${prNumber} --from-text $'## 후속 작업\\n- <debt>'\`.`
      : `dropped: "${line}" — after removing its markers only "${rest}" was left, under the ` +
        `10-character floor \`followup-debt.schema.json\` requires. Nothing was recorded. ` +
        `Write the item out in full, or keep the grade and say more.`,
  );
  // Emitted here too: a body whose only bullet was dropped never reaches the tail of this function,
  // and reporting `registered: 0, warnings: []` for it would be the same silent loss twice over.
  for (const w of droppedWarnings) console.error(`[followup-debt] ${w}`);

  if (parsed.length === 0) {
    if (args.includes('--json')) {
      console.log(
        JSON.stringify({ ok: true, registered: 0, items: [], warnings: droppedWarnings }),
      );
    } else {
      console.log(`PR #${prNumber}: no follow-up items detected`);
    }
    return 0;
  }

  const debt = loadDebt();
  const now = new Date().toISOString();
  // A caller that already holds the PR URL (ship) passes it, so registering costs no `gh` call.
  let sourceUrl = readOption(args, '--source-url');
  if (!sourceUrl) {
    const repoUrl = resolveRepoUrl();
    sourceUrl = repoUrl ? `${repoUrl}/pull/${prNumber}` : null;
  }
  const category = readOption(args, '--category') || 'general_followup';
  const severity = readOption(args, '--severity') || 'LOW';

  if (!CATEGORIES.has(category)) {
    console.error(`Error: --category must be one of ${Array.from(CATEGORIES).join(', ')}`);
    process.exit(1);
  }
  if (!SEVERITIES.has(severity)) {
    console.error(`Error: --severity must be one of ${Array.from(SEVERITIES).join(', ')}`);
    process.exit(1);
  }

  const existingDescriptions = new Set(
    debt.items
      .filter((it) => it.source_pr === prNumber)
      .map((it) => normalizeDescription(it.description)),
  );

  // Snapshotted before the loop: ids minted in this run cannot be cited by it, and letting the set
  // grow would make item B "continue" a row item A just created.
  const openIds = new Set(debt.items.filter((it) => it.status === 'open').map((it) => it.id));

  const registered = [];
  // Collected here rather than stored on the entry: `misusedScale` is a fact about the *line that
  // was read*, not about the debt, and the record schema has no field for it. Same for a grade the
  // parser saw but could not read.
  const misusedScales = [];
  const unreadGrades = [];
  const continuations = [];
  for (const item of parsed) {
    const key = normalizeDescription(item.description);
    if (existingDescriptions.has(key)) continue;
    const entry = {
      id: nextId(debt.items),
      source_pr: prNumber,
      ...(sourceUrl ? { source_pr_url: sourceUrl } : {}),
      category,
      // Per-item marker beats the run-wide flag: the more specific statement wins. R-CM-033
      // Rule 5's LOW stays the default for an unmarked line.
      severity: item.severity ?? severity,
      description: item.description,
      files: item.files,
      added_at: now,
      status: 'open',
      addressed_pr: null,
      addressed_at: null,
      wontfix_reason: null,
    };
    debt.items.push(entry);
    registered.push(entry);
    if (item.misusedScale) misusedScales.push({ id: entry.id, token: item.misusedScale });
    else if (!item.severity) {
      const token = unreadLeadingGrade(item.description);
      if (token) unreadGrades.push({ id: entry.id, token });
    }
    const cited = citedOpenDebts(item.description, openIds);
    if (cited.length) continuations.push({ id: entry.id, cited });
  }

  saveDebt(debt);

  // Emitted on **both** channels on purpose. stderr serves a human at a terminal; `--json` stdout
  // serves `ops.mjs#registerFollowupDebtFromPr`, the only production caller — and it pipes the
  // child's stderr, reads it solely on the failure path, and discards it on success. That is how
  // DEBT-326 (a resolution marker written with a leading position and an unknown `fix:` kind, a
  // feature since removed) was registered in the 2026-09-05 ship with no warning visible anywhere,
  // and was found only by reading the ledger afterwards — precisely the outcome these warnings
  // exist to prevent.
  const warnings = [
    ...continuations.map(
      ({ id, cited }) =>
        `${id}: continues ${cited.join(', ')}, which ${cited.length > 1 ? 'are' : 'is'} still open — ` +
        `dedup is per-PR, so this was filed as a new row rather than dropped. If it is the same debt, ` +
        `fold it back: \`close --id ${id} --wontfix --reason "same debt as ${cited[0]}; tracked there"\`. ` +
        `If it is genuinely distinct, leave both and say how they differ.`,
    ),
    ...misusedScales.map(
      ({ id, token }) =>
        `${id}: ${token} is the Actions scale (P0/P1/P2), not a severity — this ledger is keyed on ` +
        `CRITICAL/HIGH/MEDIUM/LOW (R-CM-030 Rule 14). Recorded as ${severity} and the marker was ` +
        `left in the text; no mapping was invented. Restate it as a severity, or escalate with ` +
        `\`register --severity\`.`,
    ),
    ...unreadGrades.map(
      ({ id, token }) =>
        `${id}: ${token} leads this line but was not read as a severity — the forms read are ` +
        `\`[${token}]\`, \`${token}:\` and \`${token} —\`, optionally behind P0/P1/P2 or inside **bold**. ` +
        `Recorded as ${severity} and the text was left as written. Restate it in one of those ` +
        `forms, or escalate with \`register --severity\`.`,
    ),
  ];
  // `droppedWarnings` are already on stderr from the early path above; only the JSON channel below
  // still needs them, so they are appended rather than re-printed.
  for (const w of warnings) console.error(`[followup-debt] ${w}`);
  warnings.push(...droppedWarnings);

  if (args.includes('--json')) {
    console.log(
      JSON.stringify({ ok: true, registered: registered.length, items: registered, warnings }),
    );
  } else {
    console.log(`PR #${prNumber}: registered ${registered.length} follow-up debt items`);
    for (const it of registered) {
      console.log(`  ${it.id}: ${it.description.slice(0, 80)}${it.description.length > 80 ? '...' : ''}`);
    }
  }
  return 0;
}

function cmdList(args) {
  const debt = loadDebt();
  let items = debt.items;

  const statusIdx = args.indexOf('--status');
  if (statusIdx >= 0 && args[statusIdx + 1]) {
    items = items.filter((it) => it.status === args[statusIdx + 1]);
  }
  const sevIdx = args.indexOf('--severity');
  if (sevIdx >= 0 && args[sevIdx + 1]) {
    items = items.filter((it) => it.severity === args[sevIdx + 1]);
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify({ ok: true, count: items.length, items }));
  } else {
    if (items.length === 0) {
      console.log('No follow-up debt items found.');
      return 0;
    }
    console.log(`Found ${items.length} follow-up debt item(s):`);
    for (const it of items) {
      const ageDays = Math.floor(
        (Date.now() - new Date(it.added_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      console.log(
        `  ${it.id} [${it.status}/${it.severity}] PR #${it.source_pr} (${ageDays}d ago)`,
      );
      console.log(`    ${it.description.slice(0, 100)}${it.description.length > 100 ? '...' : ''}`);
    }
  }
  return 0;
}

function cmdClose(args) {
  const idIdx = args.indexOf('--id');
  if (idIdx < 0 || !args[idIdx + 1]) {
    console.error('Error: --id DEBT-<n> required');
    process.exit(1);
  }
  const id = args[idIdx + 1];

  const debt = loadDebt();
  const item = debt.items.find((it) => it.id === id);
  if (!item) {
    console.error(`Error: ${id} not found`);
    process.exit(1);
  }
  if (item.status !== 'open') {
    console.error(`Error: ${id} already ${item.status}`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  if (args.includes('--wontfix')) {
    const reasonIdx = args.indexOf('--reason');
    if (reasonIdx < 0 || !args[reasonIdx + 1] || args[reasonIdx + 1].length < 10) {
      console.error('Error: --reason "..." required (min 10 chars) for --wontfix');
      process.exit(1);
    }
    item.status = 'wontfix';
    item.wontfix_reason = args[reasonIdx + 1];
    item.addressed_at = now;
  } else {
    const prIdx = args.indexOf('--addressed-pr');
    if (prIdx < 0 || !args[prIdx + 1]) {
      console.error('Error: --addressed-pr <num> required (or use --wontfix)');
      process.exit(1);
    }
    item.status = 'addressed';
    item.addressed_pr = parseInt(args[prIdx + 1], 10);
    item.addressed_at = now;
  }

  saveDebt(debt);
  console.log(`${id} → ${item.status}`);
  return 0;
}

function cmdAudit(args) {
  const maxIdx = args.indexOf('--max-age-days');
  const maxAge =
    maxIdx >= 0 && args[maxIdx + 1] ? parseInt(args[maxIdx + 1], 10) : DEFAULT_MAX_AGE_DAYS;
  if (!Number.isInteger(maxAge) || maxAge < 0) {
    console.error('Error: --max-age-days must be a non-negative integer');
    process.exit(1);
  }

  const debt = loadDebt();
  const now = Date.now();
  const stale = debt.items.filter((it) => {
    if (it.status !== 'open') return false;
    const ageDays = Math.floor((now - new Date(it.added_at).getTime()) / (1000 * 60 * 60 * 24));
    return ageDays >= maxAge && (it.severity === 'HIGH' || it.severity === 'CRITICAL');
  });

  const violations = stale.length;
  const advisory = computeDebtAdvisory(debt.items, now);
  if (args.includes('--json')) {
    console.log(
      JSON.stringify({
        ok: violations === 0,
        violations,
        max_age_days: maxAge,
        items: stale,
        advisory,
      }),
    );
  } else if (violations > 0) {
    console.error(
      `[followup-debt-audit] ${violations} stale HIGH/CRITICAL item(s) > ${maxAge} days:`,
    );
    for (const it of stale) {
      const ageDays = Math.floor((now - new Date(it.added_at).getTime()) / (1000 * 60 * 60 * 24));
      console.error(`  ${it.id} [${it.severity}] PR #${it.source_pr} (${ageDays}d): ${it.description.slice(0, 80)}`);
    }
  } else {
    console.log(`[followup-debt-audit] OK (no stale HIGH/CRITICAL items, max_age_days=${maxAge})`);
  }
  if (advisory.warn) {
    console.error(
      `[followup-debt-advisory] Pending cleanup ${advisory.drain_pending} item(s) ` +
        `(dormant open LOW ${advisory.drain_pending_lapse} / closed ${advisory.drain_pending_compact}) — ` +
        `resolve via: make q.debt-compact ARGS='--apply'`,
    );
    console.error(
      `  Note (informational): open ${advisory.open_total} item(s), including ${advisory.escalated_open} escalated (MEDIUM+) item(s)`,
    );
  }
  return violations === 0 ? 0 : 1;
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'register':
      return cmdRegister(args.slice(1));
    case 'list':
      return cmdList(args.slice(1));
    case 'close':
      return cmdClose(args.slice(1));
    case 'audit':
      return cmdAudit(args.slice(1));
    default:
      console.error('Usage: followup-debt-tracker.mjs <register|list|close|audit> [options]');
      console.error('  register --pr <num> [--from-text "..." | --from-file <path>] [--source-url <url>] [--json]');
      console.error('           [--category code_review_finding|code_reviewer_finding|general_followup]');
      console.error('           [--severity LOW|MEDIUM|HIGH|CRITICAL]');
      console.error('  list [--status open|addressed|wontfix] [--severity CRITICAL|HIGH|MEDIUM|LOW] [--json]');
      console.error('  close --id DEBT-<n> (--addressed-pr <num> | --wontfix --reason "...")');
      console.error('  audit [--max-age-days N] [--json]');
      return 1;
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  process.exitCode = main();
}
