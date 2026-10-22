/**
 * 静的書き出し（out/）の仕上げ。
 * 1. 開発用の録画（public/dev/）を配信物から取り除く
 * 2. 言語ごとのページ（/ja・/ko）の <html lang> をその言語にする
 * 3. CSP などのセキュリティヘッダーを書いた _headers を生成する。
 * Cloudflare Pages（wrangler pages dev / deploy）がこのファイルを読んでヘッダーを付ける。
 *
 * Next.js が HTML に埋め込むインラインスクリプトは nonce を使えないため、
 * ビルドごとに中身の SHA-256 を計算して script-src に列挙する（'unsafe-inline' を使わない）。
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const out = path.resolve(import.meta.dirname, '..', 'out');

rmSync(path.join(out, 'dev'), { recursive: true, force: true });

// ルートレイアウトは全ページ共通で lang="en" を書き出すため、言語ごとのページだけ書き換える
// （src/i18n/messages.ts の SUPPORTED_LOCALES のうち既定の en 以外。トップと解説ページ）
for (const [locale, page] of ['ja', 'ko'].flatMap((l) => [
  [l, `${l}.html`],
  [l, `${l}/guide.html`],
])) {
  const file = path.join(out, page);
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<html lang="en"')) {
    throw new Error(`${page}: <html lang="en" が見つからない`);
  }
  writeFileSync(file, html.replace('<html lang="en"', `<html lang="${locale}"`));
}

const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });

const hashes = new Set();
for (const file of htmlFiles(out)) {
  const html = readFileSync(file, 'utf8');
  for (const [, attrs, body] of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi
  )) {
    if (
      /\bsrc=/i.test(attrs) ||
      /application\/ld\+json/i.test(attrs) ||
      body.length === 0
    )
      continue;
    hashes.add(createHash('sha256').update(body).digest('base64'));
  }
}

const csp = [
  "default-src 'self'",
  // MediaPipe の wasm をコンパイルするために 'wasm-unsafe-eval' が必要
  `script-src 'self' 'wasm-unsafe-eval' ${[...hashes].map((h) => `'sha256-${h}'`).join(' ')}`,
  // React の style 属性（3D シーンのオーバーレイ位置など）に必要
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  // 外部への通信を一切許可しない（映像や計測値を送れないことをブラウザが保証する）。
  // blob: は 3D モデルに埋め込まれたテクスチャを端末内で読み出すため（GLTFLoader が fetch する）
  "connect-src 'self' blob:",
  // 非表示タブでも計測を続けるタイマー Worker は Blob URL から作る
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const headers = `/*
  Content-Security-Policy: ${csp}
  Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
`;

writeFileSync(path.join(out, '_headers'), headers);
console.log(`_headers: ${hashes.size} inline script hashes`);
