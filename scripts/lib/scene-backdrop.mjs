/**
 * 3D シーン（毎フレーム描き直す WebGL キャンバス）を全面で覆う要素への backdrop-filter を見つける。
 * ぼかしも毎フレーム再計算され、GPU の無い環境では姿勢推定のループが止まる
 * （#42: 全面のローディング表示に backdrop-blur を付けたら e2e が 5 回中 4 回落ちた）。
 * ESLint（CI）と PostToolUse hook（編集直後）が同じ規則を使う。
 */

// Tailwind の全面配置（`inset-0`、`sm:inset-0` など）
export const FULL_COVER = /\binset-0(?![\w.])/;
// backdrop-filter を掛けるユーティリティ（`backdrop-blur-*`、`backdrop-brightness-*`、`backdrop-[...]` など）
export const BACKDROP = /\bbackdrop-[a-z[]/;

export const SCENE_BACKDROP_MESSAGE =
  '全面を覆う要素（inset-0）に backdrop-filter を付けない。3D シーンの上だとぼかしが毎フレーム再計算され、' +
  'GPU の無い環境で姿勢推定のループが止まる（#42）。backdrop-* を外し、不透明度を上げた背景色（例: bg-black/60）で代える。';

// ESLint `no-restricted-syntax` 用。テンプレート文字列は `${...}` で分かれた断片同士でも組にする
export const SCENE_BACKDROP_SELECTORS = [
  `Literal[value=${FULL_COVER}][value=${BACKDROP}]`,
  `TemplateLiteral:has(> TemplateElement[value.raw=${FULL_COVER}]):has(> TemplateElement[value.raw=${BACKDROP}])`,
];

const STRING_LITERAL = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`/g;

/** 全面配置と backdrop-filter を同じ文字列に持つ箇所の行番号（1 始まり） */
export function findSceneBackdrop(source) {
  const lines = [];
  for (const m of source.matchAll(STRING_LITERAL)) {
    if (FULL_COVER.test(m[0]) && BACKDROP.test(m[0])) {
      lines.push(source.slice(0, m.index).split('\n').length);
    }
  }
  return lines;
}
