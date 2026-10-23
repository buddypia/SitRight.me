/**
 * self-improving-loop.mjs — Single SSOT for evaluating two failure modes of self-improving loops degrading their own standards
 *
 * Fundamental problem: In this repository, the *proposer of improvements* (AI) and the *evaluator of improvements*
 *   (rules, gates, tests) share the same permissions. If the proposer can edit evaluation files, whether score increases
 *   stem from improvements or lowered standards cannot be distinguished post-hoc. Google Cloud's
 *   "7 rules for self-improving agent loops" (2026-08-11) identifies this as the blind spot of loops —
 *   *"Give it a shallow target and it will optimize your agent into something that scores well and works worse. Then it reports success."*
 *
 *   This is not hypothetical. Three empirical cases in this repository:
 *     - #1140: Tests re-implemented production functions as copies, passing independently of real behavior
 *     - #1141: Full `vi.mock` replacements swallowed real behavior while passing
 *     - #1086: Strings from a CI channel with 0 runs in 78 days were used as passing evidence in 25 places
 *   All three represented "green gates but actually worse", remaining invisible until human audit.
 *
 * This module evaluates both modes (both pure functions — no I/O, test isolated):
 *   - `detectBarMove(diffText)`  — Rule 6 "Never let the proposer move the bar"
 *   - `detectFlakyTests(report)` — Rule 5 "Treat a flaky case as a finding"
 *
 * Design Decision — **Non-blocking (advisory)**: Lowering standards can be legitimate
 *   (cleaning dead tests, correcting invalid thresholds). Because intent cannot be evaluated algorithmically,
 *   only facts are surfaced, leaving decisions to the user (isomorphic to R-CM-016 Rule 10 User Sovereignty,
 *   R-CM-008 Rule 9 superset detection).
 *
 * Design Decision — **Input is a single unified diff text**: Querying separate git calls per signal causes N+1 spawns
 *   (`.claude/scripts/AGENTS.md` Convention 5) and fragments evaluation logic across callers.
 *   A single `git diff <base>..HEAD` output extracts all five signals.
 *
 * R-CM-028 boundary: **boundary-uniform (evaluation) / boundary-divergent (entry points)**.
 *   "Has the proposer lowered their own scoring criteria" carries the identical meaning in Perspective 1 (brief2dev itself)
 *   and Perspective 2 (scaffolded projects) — this file is the SSOT for evaluation. Conversely, *when to measure* diverges:
 *   Perspective 1 runs at local ship time (`ops.mjs#shipWorktree`), Perspective 2 runs in CI/PR (scaffolded projects receive Actions).
 *   Because Perspective 2 cannot import `.cli/`, it maintains a copy whose behavioral equivalence is enforced by
 *   `tests/unit/self-improving-loop-ssot.test.mjs` (isomorphic to `trunk-branch.mjs` precedent).
 */

/** Types of bar-move signals. Values are used directly in ledgers and warning strings; tests prevent renaming. */
export const BAR_MOVE = Object.freeze({
  TEST_FILE_DELETED: 'test_file_deleted',
  SKIP_ADDED: 'skip_added',
  ONLY_ADDED: 'only_added',
  ASSERTION_REMOVED: 'assertion_removed',
  THRESHOLD_LOWERED: 'threshold_lowered',
  // A deleted test whose subject module was retired in the same diff — cleanup, not relaxation.
  // Kept as a distinct, non-blocking *info* signal (never folded into TEST_FILE_DELETED) so callers
  // can still see the deletion happened without it inflating the "goalposts moved" count.
  TEST_RETIRED_WITH_SUBJECT: 'test_retired_with_subject',
  // Same, for a surviving test file whose assertions shrank because the code they checked is gone.
  ASSERTION_RETIRED_WITH_SUBJECT: 'assertion_retired_with_subject',
});

/** Info-only signals — reported by detectBarMove() but never counted as relaxation. */
const RETIREMENT_SIGNALS = new Set([BAR_MOVE.TEST_RETIRED_WITH_SUBJECT, BAR_MOVE.ASSERTION_RETIRED_WITH_SUBJECT]);

/**
 * Vocabulary of keys indicating thresholds. Why whitelisted: numeric decreases signify relaxing criteria
 * only for "higher is stricter" metrics. Catching values where decreases mean stricter requirements
 * (such as `max_bytes` / `timeout` / `warn_bytes`) would trigger permanent alarms that are ignored
 * (isomorphic to learning `metric-write-path-...`: "an alarm always on is worse than no alarm").
 */
// `min` must not use `\bmin\b` — because `_` is a word character, `min_files` / `coverage_min`
// fail boundary matching. Conversely, simple substring matching catches `admin` / `minute`.
// Explicit delimiters are specified (string start/end or `_` / `.` / `-`).
const RATCHET_KEY_WORDS = /threshold|coverage|minimum|(?:^|[_.\-])min(?:$|[_.\-])|baseline|health_score|required|floor|streak/i;

/** Tests whether path is a test file — extension convention (`*.test.*` / `*.spec.*`) or inside tests/ tree. */
export function isTestPath(path) {
  if (typeof path !== 'string' || !path) return false;
  return /(^|\/)tests?\//.test(path) || /\.(test|spec)\.[a-z]+$/i.test(path);
}

/**
 * `it.skip(` / `test.todo(` / `xdescribe(` unconditional skips. `skipIf(` is intentionally excluded —
 * conditional skips are legitimate patterns for missing environments (empirical 2026-08-11:
 * vast majority of 31 skips were `skipIf`), and flagging them dilutes warnings.
 */
const SKIP_PATTERN = /\b(?:it|test|describe)\.(?:skip|todo)\s*\(|\bx(?:it|describe)\s*\(/g;
const ONLY_PATTERN = /\b(?:it|test|describe)\.only\s*\(/g;
const ASSERT_PATTERN = /\bexpect\s*\(|\bassert\s*[.(]/g;

/**
 * Determines whether match position is inside a string literal. Tracks open quote type
 * and closes only on matching quote — count-only approaches fail when quotes nest inside different types
 * like `'... \`it.skip(\` ...'` (empirical 2026-08-11: count approach left this as a false positive).
 *
 * Not a full JS parser (does not distinguish quotes in comments or regex literals). However, the failure mode
 * leans toward *emitting fewer warnings* (safe — in advisory signals, false positives are worse than misses).
 */
function insideStringLiteral(line, index) {
  let openQuote = null;
  for (let i = 0; i < index; i += 1) {
    const ch = line[i];
    if (ch === '\\') {
      i += 1; // Skip escaped character without counting as delimiter
      continue;
    }
    if (openQuote) {
      if (ch === openQuote) openQuote = null;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      openQuote = ch;
    }
  }
  return openQuote !== null;
}

/**
 * Counts pattern occurrences in diff line array. Counts only syntax used as code, excluding occurrences inside string literals.
 *
 * Why needed (empirical 2026-08-11): Self-tests of this evaluator contain patterns like `it.skip(` in fixture strings;
 * counting those as real skip additions produced 5 false positives on its own PR.
 */
function countMatches(lines, pattern) {
  let count = 0;
  for (const line of lines) {
    for (const match of line.matchAll(pattern)) {
      if (!insideStringLiteral(line, match.index)) count += 1;
    }
  }
  return count;
}

/**
 * Applies diff line to current block. Ignores file header lines (not content).
 * `removedRuns` groups consecutive removed lines — a run is the smallest span a retirement can be
 * attributed to, since anything between two runs (context, additions) survived the change.
 */
function applyDiffLine(block, line) {
  if (line.startsWith('deleted file mode')) {
    block.deleted = true;
    return;
  }
  // `+++ b/x` / `--- a/x` are file headers, not content (distinguished by 3-char prefix).
  const isRemoval = line.startsWith('-') && !line.startsWith('---');
  if (isRemoval) {
    if (!block.inRemovedRun) block.removedRuns.push([]);
    block.removedRuns.at(-1).push(line.slice(1));
    block.removed.push(line.slice(1));
  } else if (line.startsWith('+') && !line.startsWith('+++')) {
    block.added.push(line.slice(1));
  }
  block.inRemovedRun = isRemoval;
}

/**
 * Splits unified diff into file blocks. Headers follow `diff --git a/<old> b/<new>` format.
 * Renames/mode-only changes have empty bodies and pass through with 0 signals naturally.
 * @param {string} diffText
 * @returns {Array<{path: string, deleted: boolean, added: string[], removed: string[], removedRuns: string[][]}>}
 */
export function parseUnifiedDiff(diffText) {
  if (typeof diffText !== 'string' || !diffText.trim()) return [];
  const blocks = [];
  let current = null;

  for (const line of diffText.split('\n')) {
    const header = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (header) {
      if (current) blocks.push(current);
      // Uses b-side path — name after rename represents current reality. In deletions, a==b.
      current = { path: header[2], deleted: false, added: [], removed: [], removedRuns: [], inRemovedRun: false };
    } else if (current) {
      applyDiffLine(current, line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

/**
 * Extracts numbers for ratchet vocabulary keys in `key: 12` / `"key" = 3.5` formats.
 * If the same key appears multiple times in a block, takes the **minimum value** —
 * comparing minimum of removed vs minimum of added is conservative (fewer false alarms).
 * @param {string[]} lines
 * @returns {Map<string, number>}
 */
export function collectRatchetValues(lines) {
  const out = new Map();
  for (const line of lines) {
    const m = line.match(/["']?([A-Za-z_][A-Za-z0-9_.-]*)["']?\s*[:=]\s*["']?(-?\d+(?:\.\d+)?)["']?/);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (!RATCHET_KEY_WORDS.test(key)) continue;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    const prev = out.get(key);
    out.set(key, prev === undefined ? value : Math.min(prev, value));
  }
  return out;
}

/** Delta in pattern occurrences: added vs removed. Positive means "increased". */
function patternDelta(block, pattern, { countRemovals = false } = {}) {
  const plus = countMatches(block.added, pattern);
  const minus = countMatches(block.removed, pattern);
  return countRemovals ? minus - plus : plus - minus;
}

/**
 * Three signals relevant only to test files (deleted files are filtered first by caller).
 * Only the removed assertions inside units that exercised a dead subject count as retired; the
 * rest of the decrease stays relaxation. Added assertions offset the unattributed removals first,
 * so a retirement never absorbs an unrelated weakening in the same file.
 */
function testFileSignals(block, retirement) {
  const findings = [
    [BAR_MOVE.SKIP_ADDED, patternDelta(block, SKIP_PATTERN),
      (n) => `Unconditional skip/todo net increase +${n} (skipIf conditional excluded)`],
    [BAR_MOVE.ONLY_ADDED, patternDelta(block, ONLY_PATTERN),
      (n) => `.only() net increase +${n} — remaining test cases in same file are silently excluded from execution`],
  ]
    .filter(([, n]) => n > 0)
    .map(([signal, n, toDetail]) => ({ signal, path: block.path, detail: toDetail(n) }));

  // For assertions, *disappearance* is the signal, so count direction is inverted.
  const net = patternDelta(block, ASSERT_PATTERN, { countRemovals: true });
  if (net <= 0) return findings;
  const unattributed = Math.max(0, retirement.otherAssertions - countMatches(block.added, ASSERT_PATTERN));
  const residual = Math.min(net, unattributed);
  if (residual > 0) {
    const where = retirement.undeadHeads.length > 0 ? ` (not tied to removed code: ${previewTokens(retirement.undeadHeads)})` : '';
    findings.push({ signal: BAR_MOVE.ASSERTION_REMOVED, path: block.path, detail: `Assertion (expect/assert) net decrease -${residual}${where}` });
  }
  if (net > residual) {
    findings.push({
      signal: BAR_MOVE.ASSERTION_RETIRED_WITH_SUBJECT,
      path: block.path,
      detail: `Assertion (expect/assert) net decrease -${net - residual}; the removed assertions exercised code gone from the tree (${previewTokens(retirement.subjects)}) — retirement, not relaxation`,
    });
  }
  return findings;
}

/**
 * Basename stem used to pair a deleted test with a deleted subject module: strips the
 * `.test.<ext>` / `.spec.<ext>` suffix first (test-file convention), otherwise falls back to
 * stripping a plain extension (subject-module convention). A retired hook's test and its
 * production file typically share this stem (`foo.mjs` deleted alongside `foo.test.mjs`).
 */
function stemOf(path) {
  const base = String(path).split('/').pop() || '';
  return base.replace(/\.(test|spec)\.[a-z0-9]+$/i, '').replace(/\.[a-z0-9]+$/i, '');
}

const IMPORT_SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

/** POSIX-joins a relative specifier onto the directory of `fromFile` (diff paths are repo-relative). */
function resolveRelative(fromFile, spec) {
  const parts = fromFile.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

/**
 * True when the deleted test's own source referenced `subjectPath` — a relative import/require that
 * resolves to it, or its repo-relative path as a literal (spawned scripts). A matching stem alone is
 * not enough: basename collisions across directories let an unrelated deleted file launder the
 * deletion of a test whose real subject still ships.
 */
function testReferencesSubject(testBlock, subjectPath) {
  for (const line of testBlock.removed) {
    if (line.includes(subjectPath)) return true;
    for (const match of line.matchAll(IMPORT_SPECIFIER_RE)) {
      const spec = match[1];
      if (spec.startsWith('.') && resolveRelative(testBlock.path, spec) === subjectPath) return true;
    }
  }
  return false;
}

/** The deleted non-test subject this deleted test was retired with, or null. */
function retiredSubjectOf(testBlock, deletedSubjects) {
  const stem = stemOf(testBlock.path);
  return (
    deletedSubjects.find((b) => stemOf(b.path) === stem && testReferencesSubject(testBlock, b.path))?.path || null
  );
}

/**
 * Subjects are not always files. A test often exercises a function, a check name or a generated
 * path that lives *inside* a surviving module (empirical PR #1461: tests of the generated Next.js
 * landing imported `scaffold-deploy.mjs`, which still ships, while `writeValidationTrackRuntime`,
 * `'src/app/page.tsx'` and `'stack_dependency_alignment'` were removed from it). These are the
 * names such a subject can be recognised by: declarations and quoted strings on removed lines.
 */
// Top-level only: an indented `const items` is a local whose name can vanish from a small tree
// (a generated project) without any subject having gone with it.
const TOP_LEVEL_DECLARATION_RE = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
const STRING_LITERAL_RE = /(['"`])((?:(?!\1)[^\\\s])+)\1/g;
const MIN_SUBJECT_TOKEN_LENGTH = 6;
// Prose mentions code without being it: "the class handles…" would yield `handles`.
const PROSE_PATH_RE = /\.(?:md|mdx|txt|rst)$/i;

function addTokens(out, line, re, group) {
  for (const match of line.matchAll(re)) {
    const token = match[group];
    if (token.length >= MIN_SUBJECT_TOKEN_LENGTH && !token.includes('${')) out.add(token);
  }
}

/**
 * Names that left the code in this diff and that a test's removed lines exercised (pure function).
 * Only non-test, non-prose files contribute: a helper declared in a test is evidence of nothing
 * about a production subject (it is always absent from non-test files, so it would always read as
 * dead and let a deleted test retire itself), and a literal shared by two tests proves nothing.
 * Names no test exercised are dropped here — they cannot retire anything, and every extra name
 * is one more search over the whole tree.
 *
 * A candidate is only a candidate: a name removed here may still be defined elsewhere. The caller
 * proves which ones survive with `liveTokensIn` over the post-change tree and passes them back as
 * `detectBarMove(diff, { liveTokens })`.
 *
 * @param {string} diffText
 * @returns {string[]}
 */
export function retirementCandidates(diffText) {
  const blocks = parseUnifiedDiff(diffText);
  const removed = new Set();
  for (const block of blocks) {
    if (isTestPath(block.path) || PROSE_PATH_RE.test(block.path)) continue;
    for (const line of block.removed) {
      addTokens(removed, line, TOP_LEVEL_DECLARATION_RE, 1);
      addTokens(removed, line, STRING_LITERAL_RE, 2);
    }
  }
  const testBlocks = blocks.filter((b) => isTestPath(b.path));
  return [...removed].filter((t) => testBlocks.some((b) => referencesToken(b.removed, t))).sort();
}

/**
 * Tokens still present in a non-test, non-prose file of `files` (pure). Tests are excluded because a
 * test asserting a path is *gone* must not keep that path alive; prose because an ADR or analysis
 * note recounting a removed function does not bring it back (PR #1461: an ADR line kept
 * `writeValidationTrackRuntime` "alive" after the code was gone).
 *
 * @param {Iterable<{path: string, text: string}>} files The post-change tree
 * @param {string[]} tokens
 * @returns {Set<string>}
 */
export function liveTokensIn(files, tokens) {
  const live = new Set();
  let pending = [...tokens];
  for (const { path, text } of files) {
    if (pending.length === 0) break;
    if (isTestPath(path) || PROSE_PATH_RE.test(path) || typeof text !== 'string') continue;
    for (const token of tokensFoundIn(text, pending)) live.add(token);
    pending = pending.filter((t) => !live.has(t));
  }
  return live;
}

/**
 * One alternation pass per file instead of one scan per token (a ~25MB tree × hundreds of tokens
 * took seconds). A match consumes its span, so a token occurring only inside another token's match
 * is missed — rescan with the remainder until a pass finds nothing new.
 */
function tokensFoundIn(text, tokens) {
  const found = new Set();
  let pending = tokens;
  while (pending.length > 0) {
    const re = new RegExp(pending.map(escapeRegExp).join('|'), 'g');
    const pass = new Set(Array.from(text.matchAll(re), (m) => m[0]));
    if (pass.size === 0) break;
    for (const token of pass) found.add(token);
    pending = pending.filter((t) => !pass.has(t));
  }
  return found;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const tokenPatterns = new Map();

function tokenPattern(token) {
  if (!tokenPatterns.has(token)) {
    tokenPatterns.set(token, new RegExp(`(^|[^\\w$])${escapeRegExp(token)}(?=$|[^\\w$])`, 'g'));
  }
  const re = tokenPatterns.get(token);
  re.lastIndex = 0;
  return re;
}

function referencesToken(lines, token) {
  // A regex literal names the same thing with escapes: `/body\.elapsedMs/` checks `body.elapsedMs`.
  return lines.some((line) => tokenPattern(token).test(line) || tokenPattern(token).test(line.replace(/\\(.)/g, '$1')));
}

/** True when the match sits in code — not in a string, a test title or a trailing `//` comment. */
function inCode(line, index) {
  if (insideStringLiteral(line, index)) return false;
  let comment = line.indexOf('//');
  while (comment >= 0 && insideStringLiteral(line, comment)) comment = line.indexOf('//', comment + 2);
  return comment < 0 || comment > index;
}

// A name learned from a binding is a local identifier, so only its use as code counts.
function usesNameInCode(line, name) {
  return Array.from(line.matchAll(tokenPattern(name)), (m) => m.index + m[1].length).some((i) => inCode(line, i));
}

const TEST_CASE_RE = /^\s*(?:it|test)(?:\.\w+)*\s*\(/;
const UNIT_START_RE = /^\s*(?:(?:it|test|describe)(?:\.\w+)*\s*\(|(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var|import)\b)/;

function indentOf(line) {
  return line.match(/^\s*/)[0].length;
}

/**
 * Splits a test block's removed runs into units — test cases, `describe` blocks and declarations.
 * A unit owns the lines indented deeper than its head; a unit head at the same or a shallower
 * indent starts the next unit, so a helper declared beside an `it(` inside a `describe` is its own unit.
 */
function unitsOf(block) {
  const units = [];
  for (const run of block.removedRuns) {
    let unit = null;
    for (const line of run) {
      const isHead = UNIT_START_RE.test(line) && (!unit || TEST_CASE_RE.test(line) || indentOf(line) <= indentOf(unit[0]));
      if (!unit || isHead) units.push((unit = []));
      unit.push(line);
    }
  }
  return units;
}

/**
 * Names a test imported from another test file deleted in the same diff (`HEAVY_STEP_TIMEOUT_MS`
 * from a retired e2e harness). Scoped to the importer: the import line is the proof, and a helper
 * of the same name declared elsewhere proves nothing.
 */
function importedRetiredNames(testBlock, deletedTests) {
  const names = [];
  for (const line of testBlock.removed) {
    for (const source of importedDeletedTests(testBlock, line, deletedTests)) {
      const declared = source.removed.flatMap((decl) => Array.from(decl.matchAll(TOP_LEVEL_DECLARATION_RE), (m) => m[1]));
      names.push(...declared.filter((name) => referencesToken([line], name)));
    }
  }
  return names;
}

function importedDeletedTests(testBlock, line, deletedTests) {
  return Array.from(line.matchAll(IMPORT_SPECIFIER_RE), (m) => m[1])
    .filter((spec) => spec.startsWith('.'))
    .map((spec) => deletedTests.find((b) => b !== testBlock && b.path === resolveRelative(testBlock.path, spec)))
    .filter(Boolean);
}

// `const x = …` / `x = …` at a statement start — the name that carries a value derived from the rest of the line.
const BINDING_RE = /(?:\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)|(?:^|[{;]|=>)\s*([A-Za-z_$][\w$]*)\s*=(?![=>]))/g;
const UNIT_HEAD_DECLARATION_RE = /^(?:export\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/;

/**
 * Which removed units of a test exercised a dead subject (pure). Attribution is per unit, not per
 * file: one retired test case must not excuse unrelated removals beside it. A local name inherits
 * deadness only from what it was built from — the binding on a line that touched a dead name
 * (`koLayout = read('src/app/layout.tsx')`), or a helper whose own unit did (`checkLanding()` that
 * fetched `/api/waitlist`) — and only within this file.
 *
 * @returns {{subjects: string[], deadAssertions: number, otherAssertions: number, undeadAssertionUnits: number, undeadHeads: string[]}}
 */
function retirementOf(testBlock, deadTokens, deletedTests) {
  const units = unitsOf(testBlock);
  const roots = [
    ...deadTokens.filter((token) => referencesToken(testBlock.removed, token)),
    ...importedRetiredNames(testBlock, deletedTests),
  ];
  const { dead, subjects } = deadUnitsOf(units, roots);
  const tally = {
    subjects, deadAssertions: 0, otherAssertions: 0, undeadAssertionUnits: 0, undeadHeads: [],
  };
  units.forEach((unit, index) => {
    const n = countMatches(unit, ASSERT_PATTERN);
    if (dead.has(index)) tally.deadAssertions += n;
    else if (n > 0) {
      tally.otherAssertions += n;
      tally.undeadAssertionUnits += 1;
      tally.undeadHeads.push(unit[0].trim().slice(0, 80));
    }
  });
  return tally;
}

/**
 * Fixed point: units touching a dead name, growing the name set by the bindings they make. Only
 * shared units — declarations and `describe` bodies — teach names: a test case's locals (`res`,
 * `page`) are its own, and reusing the same local in another case proves nothing about that case.
 */
function deadUnitsOf(units, roots) {
  const state = { roots, names: new Set(roots), dead: new Set(), subjects: new Set() };
  for (let grew = state.names.size > 0; grew; ) {
    grew = false;
    units.forEach((unit, index) => {
      grew = visitUnit(state, unit, index) || grew;
    });
  }
  return { dead: state.dead, subjects: [...state.subjects].sort() };
}

/** Marks one unit dead if it touches a known name; returns whether the name set grew. */
function visitUnit(state, unit, index) {
  const { names, dead, subjects } = state;
  const learned = [];
  const scope = scopeIndentOf(unit);
  let touched = false;
  for (const line of unit) {
    const hits = [...names].filter((name) => touchesName(state, line, name));
    if (hits.length === 0) continue;
    touched = true;
    for (const hit of hits) if (state.roots.includes(hit)) subjects.add(hit);
    learned.push(...bindingsAtScope(line, scope));
  }
  if (!touched) return false;
  if (!dead.has(index)) learned.push(unit[0].trim().match(UNIT_HEAD_DECLARATION_RE)?.[1]);
  dead.add(index);
  if (TEST_CASE_RE.test(unit[0])) return false;
  const before = names.size;
  for (const name of learned) if (name) names.add(name);
  return names.size > before;
}

/**
 * The indent where a shared unit's own names live: a `describe` body's first level, otherwise the
 * head itself. A `const` deeper than that is local to a helper or a `beforeEach` body.
 */
function scopeIndentOf(unit) {
  const head = indentOf(unit[0]);
  if (!/^\s*describe\b/.test(unit[0])) return head;
  const body = unit.slice(1).map(indentOf).filter((n) => n > head);
  return body.length > 0 ? Math.min(...body) : head;
}

// A declaration names something only at the unit's scope; a bare `x = …` always writes an outer variable.
function bindingsAtScope(line, scope) {
  const atScope = indentOf(line) === scope;
  return Array.from(line.matchAll(BINDING_RE), (m) => m[2] || (atScope ? m[1] : null));
}

// Roots may be paths or strings, so any mention counts; learned names are identifiers, so only code does.
function touchesName(state, line, name) {
  return state.roots.includes(name) ? referencesToken([line], name) : usesNameInCode(line, name);
}

function previewTokens(tokens) {
  const shown = tokens.slice(0, 4).join(', ');
  return tokens.length > 4 ? `${shown}, +${tokens.length - 4} more` : shown;
}

/** Signal relevant across any file — decrease in ratchet vocabulary key values. */
function thresholdSignals(block) {
  const before = collectRatchetValues(block.removed);
  const after = collectRatchetValues(block.added);
  const out = [];
  for (const [key, oldValue] of before) {
    const newValue = after.get(key);
    if (newValue === undefined || newValue >= oldValue) continue;
    out.push({
      signal: BAR_MOVE.THRESHOLD_LOWERED,
      path: block.path,
      detail: `${key} ${oldValue} → ${newValue} (lowered)`,
    });
  }
  return out;
}

/** The single finding for a deleted test file: retired with a subject module or name, or deleted. */
function deletedTestFinding(block, retirement, deletedSubjects) {
  const subject = retiredSubjectOf(block, deletedSubjects);
  if (subject) {
    return {
      signal: BAR_MOVE.TEST_RETIRED_WITH_SUBJECT,
      path: block.path,
      detail: `Test file deleted alongside its subject module (${subject}) — retirement, not relaxation`,
    };
  }
  if (retirement.deadAssertions > 0 && retirement.undeadAssertionUnits === 0) {
    return {
      signal: BAR_MOVE.TEST_RETIRED_WITH_SUBJECT,
      path: block.path,
      detail: `Test file deleted; every assertion in it exercised code gone from the tree (${previewTokens(retirement.subjects)}) — retirement, not relaxation`,
    };
  }
  const partial = retirement.undeadAssertionUnits > 0
    ? `; not tied to removed code: ${previewTokens(retirement.undeadHeads)}`
    : '';
  return {
    signal: BAR_MOVE.TEST_FILE_DELETED,
    path: block.path,
    detail: `Test file deleted (removed lines ${block.removed.length})${partial}`,
  };
}

/**
 * Evaluates five signals of "proposer lowering criteria" from diff (pure function).
 *
 * Each finding is `{signal, path, detail}` — `detail` contains facts for human evaluation.
 * Returns empty array on unevaluable/missing input (fail-open, R-CM-006 Rule 2).
 *
 * `liveTokens` is the subset of `retirementCandidates(diffText)` still present in non-test files
 * after the change. Without it no name can be proven dead, so only whole-file retirements count —
 * an unproven retirement is reported as relaxation, never the other way round.
 *
 * Attribution is per unit (a test case or top-level declaration inside one run of removed lines). A
 * deleted test retires only when every unit that asserted something exercised a dead subject; a
 * shrunk test retires only the assertions inside such units. Known limit: a unit is the finest
 * grain — a test case that checked a dead subject and, in the same body, something still alive is
 * retired whole.
 *
 * @param {string} diffText Output of `git diff <base>..HEAD`
 * @param {{liveTokens?: Iterable<string>}} [options]
 * @returns {Array<{signal: string, path: string, detail: string}>}
 */
export function detectBarMove(diffText, { liveTokens } = {}) {
  const findings = [];
  const blocks = parseUnifiedDiff(diffText);

  // Deleted non-test files in the same diff. A deleted test that shares a stem with one of these
  // *and* referenced it was retired alongside its subject (e.g. a hook removed together with its
  // test), not relaxed — see TEST_RETIRED_WITH_SUBJECT below.
  const deletedSubjects = blocks.filter((b) => b.deleted && !isTestPath(b.path));
  const live = liveTokens ? new Set(liveTokens) : null;
  // Without liveness evidence nothing is proven dead — not even names imported from a deleted test.
  const deletedTests = live ? blocks.filter((b) => b.deleted && isTestPath(b.path)) : [];
  const deadTokens = live ? retirementCandidates(diffText).filter((t) => !live.has(t)) : [];

  for (const block of blocks) {
    const isTest = isTestPath(block.path);
    const retirement = isTest ? retirementOf(block, deadTokens, deletedTests) : null;

    // Report only 1 deletion for deleted files — total removal causes all other signals to trail.
    if (isTest && block.deleted) {
      findings.push(deletedTestFinding(block, retirement, deletedSubjects));
      continue;
    }

    if (isTest) findings.push(...testFileSignals(block, retirement));
    findings.push(...thresholdSignals(block));
  }

  return findings;
}

/** Returns empty array if not an array — absorbs report structural anomalies without caller branching. */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Tests whether case passed on retry (passed + contains failure messages). */
function isRetryPass(testCase) {
  return testCase?.status === 'passed' && asArray(testCase.failureMessages).length > 0;
}

/**
 * Identifies flaky cases (passed after retry) from vitest json reports (pure function).
 *
 * Based on empirical measurement (vitest 4.1.10, 2026-08-11): Cases that passed after `--retry` have
 * `status: "passed"` while `failureMessages` is non-empty. Cases passing on first attempt have
 * empty `failureMessages` arrays. Because both states are distinguished in the report, no separate runs are required.
 *
 * **Limitations (transparent statement)**: Reports generated without `--retry` always yield empty arrays —
 * without retries, first failures are immediately recorded as failures. This function does not prove
 * "no flaky tests exist"; it reports only what the report observed. Callers should indicate whether `--retry` was used.
 *
 * @param {object|null} report vitest `--reporter=json` output
 * @returns {Array<{file: string, name: string, message: string}>}
 */
export function detectFlakyTests(report) {
  const flaky = [];

  for (const suite of asArray(report?.testResults)) {
    const file = typeof suite?.name === 'string' ? suite.name : '(unknown)';
    for (const testCase of asArray(suite?.assertionResults).filter(isRetryPass)) {
      const name = testCase.fullName ?? testCase.title ?? '';
      flaky.push({
        file,
        name: String(name),
        message: String(asArray(testCase.failureMessages)[0] ?? '').split('\n')[0],
      });
    }
  }

  return flaky;
}

/**
 * Multiple of CPU count above which the machine is treated as unable to give any test a fair shot.
 *
 * Derived, not picked: the suite runs `cpus - 1` vitest workers, so **we ourselves occupy roughly one
 * machine**. Crossing two machines' worth therefore means at least a full machine of *external*
 * contention. Measured on a 16-CPU box across six full-gate runs (2026-08-25 → 09-02): load 26
 * (1.6x) ran clean, while 33 / 74 / 86 / 134 / 267 (2.1x - 16.7x) each produced retry-passes — every
 * one in a *different* test, every one outside the branch's own changeset, every one passing 3/3
 * standalone. `2x` is the only cut that separates all six observations.
 */
export const LOAD_SATURATION_MULTIPLE = 2;

/**
 * Median ms to start a no-op process above which an exec-heavy test cannot get a fair shot.
 *
 * Load average counts runnable threads. A process waiting on page-ins, or on an exec authorization
 * (endpoint security checks every exec on a managed Mac), is not runnable, so a box can starve `exec`
 * while its load looks normal. Measured on a 16-CPU box (2026-10-22/23): four re-verifications of one
 * branch failed on 30–39 vitest timeouts at load 15–24, under the load cut, every one in an exec-heavy
 * file (the ship tests call git ~68 times) that passed alone. `spawnSync('true')` took a median of 70 ms
 * at load 15 and 104 ms at load 12–18 (swap full) for 1.5 ms of CPU; no failing observation was under
 * 38 ms. 30 sits below all of them. Known limit: no idle baseline was measured on that box, so 30 is a
 * cut under the failures, not a measured gap. A cut too low costs a 180 s re-measurement that must still
 * pass, or a retry-pass printed as a notice — never a dropped observation.
 */
export const SPAWN_SATURATION_MS = 30;

/** One decimal at most, no padding: 6 → "6", 11.96 → "12", 30.4 → "30.4". */
const shortNumber = (n) => String(Number(n.toFixed(1)));
const isPositiveNumber = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;
const side = (over) => (over ? 'over' : 'within');

function describeLoad({ load, cpuCount, ratio, threshold }, over) {
  if (cpuCount === 0) return `load ${shortNumber(load)} cannot be judged without a CPU count`;
  return `load ${shortNumber(load)} on ${cpuCount} CPUs is ${ratio.toFixed(1)}x, ${side(over)} the limit of ${shortNumber(threshold)}`;
}

function describeSpawn({ spawnMs, spawnThreshold }, over) {
  if (spawnMs === null) return 'process start latency was not measured';
  return `a no-op process took ${shortNumber(spawnMs)}ms to start, ${side(over)} the limit of ${spawnThreshold}ms`;
}

/**
 * Decides whether a retry-pass verdict can be trusted, given how loaded the machine was (pure function).
 *
 * Why this exists: "this test passed only on retry, therefore it is defective" is a valid inference
 * *only if the test was given a fair shot*. A saturated box starves whichever test happens to lose
 * the scheduling race, so the same gate condemns a different innocent test each run. That is not
 * flakiness detection — it is noise wearing a verdict's clothing, and it blocked shipping four times
 * in one session while the real defects it named lived in unrelated files.
 *
 * This does **not** soften the bar. `measured: false` already exists in this loop's vocabulary for a
 * missing or unparseable report, and the CLI deliberately exits 0 on it: *unmeasured is distinct from
 * a violation*. Machine saturation is simply another reason the run could not be measured. Findings
 * stay visible either way — the caller is expected to print them as observations rather than drop them.
 *
 * `loadAvg` takes the max across the 1/5/15-minute windows: any window being saturated means part of
 * the run happened on a contended box. Platforms that do not implement load average (Windows reports
 * zeros) yield `saturated: false`, i.e. exactly today's behaviour — silent, but honest, since we then
 * have no evidence of contention to report.
 *
 * `spawnMs` is a second, independent axis (`SPAWN_SATURATION_MS` says why load alone missed a starved
 * box): either axis over its limit is enough. A missing or invalid `spawnMs` — the probe could not run —
 * leaves the load-only verdict. `evidence` states both axes with their numbers, so a reason built from
 * it names the one that decided.
 *
 * @param {{loadAvg?: number[], cpuCount?: number, multiple?: number, spawnMs?: number|null, spawnThreshold?: number}} [env]
 * @returns {{saturated: boolean, load: number, cpuCount: number, ratio: number, threshold: number,
 *   spawnMs: number|null, spawnThreshold: number, evidence: string}}
 */
export function classifyLoadMeasurability({
  loadAvg = [],
  cpuCount = 0,
  multiple = LOAD_SATURATION_MULTIPLE,
  spawnMs = null,
  spawnThreshold = SPAWN_SATURATION_MS,
} = {}) {
  const windows = asArray(loadAvg).filter(isPositiveNumber);
  const load = windows.length > 0 ? Math.max(...windows) : 0;
  const cpus = Number.isFinite(cpuCount) && cpuCount > 0 ? cpuCount : 0;
  const threshold = cpus * multiple;
  const ratio = cpus > 0 ? load / cpus : 0;
  const measured = {
    load,
    cpuCount: cpus,
    ratio,
    threshold,
    spawnMs: isPositiveNumber(spawnMs) ? spawnMs : null,
    spawnThreshold,
  };
  const loadOver = cpus > 0 && load > threshold;
  const spawnOver = measured.spawnMs !== null && measured.spawnMs > spawnThreshold;
  return {
    saturated: loadOver || spawnOver,
    ...measured,
    evidence: `${describeLoad(measured, loadOver)}; ${describeSpawn(measured, spawnOver)}`,
  };
}

/**
 * Formats findings into a ship warning string. Returns null on empty input (prevents caller pushing empty entries).
 * Conforms to Rule 2 "Make judges explain themselves" — provides actionable reasons rather than raw numbers.
 *
 * @param {Array<{signal: string, path: string, detail: string}>} findings
 * @returns {string|null}
 */
export function formatBarMoveWarning(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return null;
  // Retirement signals are informational (retirement, not relaxation) — surfaced via
  // detectBarMove()'s return value for callers that want it, but never counted toward the
  // "baseline relaxation" warning below (that would misrepresent legitimate cleanup as goalpost-moving).
  const relaxations = findings.filter((f) => !RETIREMENT_SIGNALS.has(f.signal));
  if (relaxations.length === 0) return null;
  const lines = relaxations.map((f) => `  - [${f.signal}] ${f.path}: ${f.detail}`);
  return (
    `Self-scoring baseline relaxation detected (${relaxations.length} findings) — this PR includes changes that lower evaluation standards.\n`
    + `${lines.join('\n')}\n`
    + 'If this relaxation is intentional, record the rationale under Trade-offs in the Pre-Ship Panel and proceed '
    + '(non-blocking). If unintentional, revert the changes before shipping again (R-CM-041 Rule 6).'
  );
}
