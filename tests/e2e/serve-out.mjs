/**
 * E2E 用の静的サーバー。out/ を配信し、out/_headers のヘッダー（CSP など）を付ける。
 * wrangler pages dev は大きなモデルの配信が遅く、偽カメラ映像とのタイミングがずれるため使わない。
 *
 * 使い方: node tests/e2e/serve-out.mjs [port=3011]
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../out');
const port = Number(process.argv[2] ?? 3011);

// "/*" ブロックのヘッダーだけを読む（_headers はそれしか書いていない）
const headers = Object.fromEntries(
  readFileSync(path.join(root, '_headers'), 'utf8')
    .split('\n')
    .filter((l) => /^\s+\S+:/.test(l))
    .map((l) => {
      const i = l.indexOf(':');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain',
};

const resolve = (urlPath) => {
  const p = path.join(root, decodeURIComponent(urlPath));
  if (!p.startsWith(root)) return null;
  for (const c of [p, `${p}.html`, path.join(p, 'index.html')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};

createServer((req, res) => {
  const file = resolve(new URL(req.url, 'http://x').pathname);
  const status = file ? 200 : 404;
  const body = file ?? path.join(root, '404.html');
  res.writeHead(status, {
    ...headers,
    'Content-Type': TYPES[path.extname(body)] ?? 'application/octet-stream',
  });
  createReadStream(body).pipe(res);
}).listen(port, () => console.log(`serving out/ on http://localhost:${port}`));
