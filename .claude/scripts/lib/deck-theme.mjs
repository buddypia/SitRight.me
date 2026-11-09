/**
 * deck-theme.mjs — light and dark themes for the review and ship decks.
 *
 * The deck CSS, the inline badges and the SVG figures were written against one dark palette
 * (GitHub dark) as literal hex values, so a reader on a light system got a dark page
 * (user feedback 2026-10-28; the approved v3 mockup follows the system theme). Rewriting every
 * literal in four files would leave the next one written dark again. Instead the finished HTML is
 * themed in one place:
 *   - hex values in `<style>` blocks and `style="…"` attributes become `var(--dk-<hex>)`;
 *   - SVG presentation attributes (`fill="#…"`) cannot take `var()`, but CSS outranks them, so an
 *     attribute selector per palette colour repaints them;
 *   - `:root` defines each variable as the dark value and overrides it under
 *     `prefers-color-scheme: light`.
 * A colour outside DECK_PALETTE stays as written; deck-theme.test pins that every literal the deck
 * modules use is in the palette.
 *
 * Boundary (R-CM-028): perspective1-only — same deployment isolation as deck assets.
 */

/** Dark value → light value. Keys are lowercase 6-digit hex without '#'. */
export const DECK_PALETTE = Object.freeze({
  '0d1117': 'ffffff', // page and card background; text on accent fills
  '11161d': 'f6f8fa',
  '161b22': 'f6f8fa',
  '1c2128': 'f3f4f6',
  '21262d': 'eaeef2',
  '262c34': 'e5e7eb',
  '30363d': 'd0d7de', // lines
  '484f58': '8c959f',
  '6e7681': '6e7781', // faint text
  '8b949e': '59636e', // muted text
  '9da7b3': '57606a', // secondary text
  c9d5e1: '424a53',
  e6edf3: '1f2328', // body text
  '58a6ff': '0969da', // accent
  '1f6feb': '0969da',
  '11233f': 'ddf4ff', // accent wash
  '3fb950': '1a7f37', // ok
  '2ea45f': '1f883d',
  '12261e': 'dafbe1', // ok wash
  d4a72c: '9a6700', // warn
  e3b341: '9a6700',
  '6b5620': 'd4a72c', // warn border
  '2b2111': 'fff8c5', // warn wash
  e5534b: 'cf222e', // bad
  ff7b72: 'cf222e',
  '2d1416': 'ffebe9', // bad wash
  a371f7: '8250df',
});

const HEX = /#([0-9a-fA-F]{6})\b/g;
const SVG_PAINT_ATTRS = ['fill', 'stroke', 'stop-color'];

const toVar = (css) =>
  css.replace(HEX, (literal, hex) =>
    DECK_PALETTE[hex.toLowerCase()] ? `var(--dk-${hex.toLowerCase()})` : literal,
  );

/** The `:root` variables for both schemes and the SVG attribute repaint rules. */
export function deckThemeCss() {
  const entries = Object.entries(DECK_PALETTE);
  const dark = entries.map(([d]) => `--dk-${d}:#${d};`).join('');
  const light = entries.map(([d, l]) => `--dk-${d}:#${l};`).join('');
  const svg = entries
    .flatMap(([d]) => SVG_PAINT_ATTRS.map((a) => `[${a}="#${d}" i]{${a}:var(--dk-${d})}`))
    .join('');
  return (
    `:root{color-scheme:light dark;${dark}}` +
    `@media (prefers-color-scheme: light){:root{${light}}}` +
    svg
  );
}

/**
 * Themes a finished deck page. Idempotent: a page that already carries the theme block is
 * returned unchanged.
 * @param {string} html
 * @returns {string}
 */
export function applyDeckTheme(html) {
  if (html.includes('<style data-deck-theme>')) return html;
  const themed = html
    .replace(
      /(<style[^>]*>)([\s\S]*?)(<\/style>)/g,
      (_, open, css, close) => `${open}${toVar(css).replace(/color-scheme:\s*dark;?/g, '')}${close}`,
    )
    .replace(/\sstyle="([^"]*)"/g, (_, css) => ` style="${toVar(css)}"`);
  const block = `<style data-deck-theme>${deckThemeCss()}</style>`;
  return themed.includes('</head>') ? themed.replace('</head>', `${block}</head>`) : `${block}${themed}`;
}
