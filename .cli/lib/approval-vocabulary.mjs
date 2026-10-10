/**
 * approval-vocabulary.mjs — 3-way pre-ship approval vocabulary: the single source for both the
 * labels a human is *shown* and the tokens the step runner *parses*.
 *
 * Why this lives in `.cli/lib`: the two sides of the contract are rendered by different layers.
 * `.claude/scripts/lib/pre-ship-steps.mjs` parses the answer, while `.cli/lib/worktree-ship-report.mjs`
 * and the ship guards print the question, and `.claude/scripts/**` already depends on `.cli/lib/**`
 * (never the reverse). Only the shared bottom lets both derive from one constant.
 *
 * The defect this closes: the panel offered "Approve and proceed" while the runner offered
 * "승인하고 진행" — two copies kept in agreement by a code comment (design-lookbook #54 found the
 * same split). Labels are now derived here, and a project can localize them through
 * `approval_choices` in `.claude/config/pre-ship-review-panel-sections.json` without editing this file.
 *
 * Why approval is an ALLOWLIST (full match) and not stem matching: this parser gates a merge. Two
 * rounds of stem matching plus a growing denylist of negation markers kept leaking — questions
 * ("승인?"), conditions ("approve if tests pass"), approvals-with-changes ("승인하되 테스트 추가"),
 * refusals the list did not know ("承認不可", "승인❌", "👎 approve"), deferrals ("maybe approve")
 * and unrelated words that merely contain a stem ("proceedings", "승인권자 부재") all scored as
 * approval. A denylist can never enumerate every way to *not* say yes; an allowlist only has to
 * enumerate the few ways to say it. So: the whole normalized answer must equal a label/choice or
 * one of APPROVE_PHRASES, and anything else — a `?`, one extra token — is not approval. Revise and
 * abort stay lenient (stem matching): misreading them only stops a ship, and they win over
 * approval. Everything unrecognised returns null and the human is asked again.
 */

/**
 * Korean approvals are composed (core × ending) rather than listed one by one: the listed form refused
 * natural answers such as "승인 진행해줘" and forced a re-ask with the exact label (design-lookbook
 * af95297). It is still a whole-answer match. Endings that state the speaker's own plan or a status
 * ("진행할게", "승인함"), a proposal ("진행하자"), a sequence that may wait on someone else ("승인 후 진행") and bare assent ("네", "좋아요") stay out — the reviewer fuzz list re-asks them.
 */
const KO_ENDING = '(?:해|해요|해줘|해줘요|해주세요|합니다|하세요|시켜|시켜줘|ㄱ|ㄱㄱ)?';
const KO_PHRASE = new RegExp(`^(?:승인|진행|승인(?:하고|해서)?진행|(?:ok|오케이|머지)진행)${KO_ENDING}$`, 'u');

/**
 * Ordered approval specs. `label` is the default (English) human-facing copy. Order is meaningful —
 * it is the order the choices are offered in.
 *
 * `approve` carries `phrases`: whole-answer patterns (matched against the normalized answer with
 * whitespace removed — see normalizeApproval). `revise`/`abort` carry lenient `stems` (substring)
 * and `exact` whole answers. Multilingual on purpose: users answer in whatever language they type.
 */
export const APPROVAL_SPECS = [
  {
    decision: 'approve',
    label: 'Approve and proceed',
    phrases: [
      KO_PHRASE,
      /^승인(하고|해요요)$/u,
      /^진행하라고$/u,
      /^(approved?|ok(ay)?|y(es)?|lgtm)(and|,)?(proceed|goahead|shipit)$/u,
      /^approved?$/u,
      /^proceed$/u,
      /^lgtm$/u,
      /^ok(ay)?$/u,
      /^y(es)?$/u,
      /^go(ahead)?$/u,
      /^shipit$/u,
      /^承認(します|して)?(進めて(ください)?)?$/u,
      /^進行$/u,
      /^進めて(ください)?$/u,
    ],
  },
  {
    decision: 'revise',
    label: 'Revision required',
    stems: ['수정', '필요', 'revise', 'revision', 'required', 'fix', '修正', '必要'],
    exact: ['revise', 'fix'],
  },
  {
    decision: 'abort',
    label: 'Abort',
    stems: ['중단', 'abort', 'cancel', 'stop', '中斷', '中断'],
    exact: ['abort', 'n', 'no', 'cancel'],
  },
];

/** Default human-facing choice labels, in offer order. Render from this — never retype the strings. */
export const APPROVAL_CHOICES = APPROVAL_SPECS.map((s) => s.label);

/**
 * Choice labels with project overrides applied (`{ approve?, revise?, abort? }`). A missing,
 * blank or non-string override keeps the default for that decision, so a partial map cannot drop
 * a choice; malformed input is reported through `warnings` (when given).
 *
 * @param {Record<string, unknown>|null|undefined} overrides
 * @param {string[]|null} [warnings] collector for human-readable problems
 * @returns {string[]} labels in offer order
 */
export function resolveApprovalChoices(overrides, warnings = null) {
  if (overrides === undefined || overrides === null) return [...APPROVAL_CHOICES];
  if (typeof overrides !== 'object' || Array.isArray(overrides)) {
    warnings?.push('`approval_choices` must be an object {approve, revise, abort} — built-in labels used');
    return [...APPROVAL_CHOICES];
  }
  const decisions = APPROVAL_SPECS.map((s) => s.decision);
  const bad = Object.entries(overrides)
    .filter(([k, v]) => !decisions.includes(k) || typeof v !== 'string' || !v.trim())
    .map(([k]) => k);
  if (bad.length) warnings?.push(`\`approval_choices\` ignored (unknown key or empty/non-string value): ${bad.join(', ')}`);
  return APPROVAL_SPECS.map((spec) => {
    const v = overrides[spec.decision];
    return typeof v === 'string' && v.trim() ? v.trim() : spec.label;
  });
}

/** Any of these anywhere (whitespace removed) → the answer is not scored at all; re-ask. */
const NEGATION_MARKERS = [
  '하지마', '하지말', '하지않', '안돼', '안된', '안함', '말아', '말고', '금지',
  "don't", 'dont', 'donot', 'never', 'refuse',
];

/** Trim, lowercase, collapse whitespace, drop trailing sentence punctuation (`.`, `!`, `。`, `！`). */
function normalizeAnswer(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!。！]+$/u, '')
    .trim();
}

const squash = (text) => normalizeAnswer(text).replace(/\s+/g, '');

/**
 * Normalizes a user answer to a decision code.
 *
 * 1. The whole answer equals a label — built-in or the configured locale's (`choices`) → that decision.
 * 2. A negation marker anywhere → null.
 * 3. Revise / abort by lenient stems; exactly one of them present → it (it wins over any approval).
 * 4. Approve only on a full-answer match against APPROVE_PHRASES, and never with a `?` / `？`.
 * Anything else → null (re-ask).
 *
 * @param {unknown} raw
 * @param {{choices?: string[]}} [options] labels in APPROVAL_SPECS order (see resolveApprovalChoices)
 * @returns {'approve'|'revise'|'abort'|null}
 */
export function normalizeApproval(raw, { choices = APPROVAL_CHOICES } = {}) {
  const s = squash(raw);
  if (!s) return null;

  const labelHit = APPROVAL_SPECS.findIndex(
    (spec, i) => squash(spec.label) === s || (typeof choices[i] === 'string' && squash(choices[i]) === s),
  );
  if (labelHit !== -1) return APPROVAL_SPECS[labelHit].decision;
  if (NEGATION_MARKERS.some((m) => s.includes(m))) return null;

  const stopping = APPROVAL_SPECS.filter(
    (spec) => spec.stems && (spec.exact.includes(s) || spec.stems.some((stem) => s.includes(stem.toLowerCase()))),
  );
  if (stopping.length === 1) return stopping[0].decision;
  if (stopping.length > 1) return null;

  if (/[?？]/u.test(s)) return null;
  const approve = APPROVAL_SPECS[0];
  return approve.phrases.some((re) => re.test(s)) ? approve.decision : null;
}
