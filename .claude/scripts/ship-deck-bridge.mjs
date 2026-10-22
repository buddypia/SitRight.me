#!/usr/bin/env node

/**
 * ship-deck-bridge.mjs — Structured feedback bridge for deck verdicts (minimal HTTP).
 *
 * Persists browser checklist verdicts (OK / Needs Fix + notes) in real-time to `review-result.json`.
 * AI consumers parse `state:"ng"` items directly into fix tasks without prose interpretation.
 *
 * Copying results via markdown in the deck works independently of this bridge —
 * this script provides automated synchronization (R-CM-030 Rule 12).
 *
 * Usage:
 *   node .claude/scripts/ship-deck-bridge.mjs --out .tmp/ship-deck/<safeBranch>/review-result.json [--port 7357]
 *
 * Endpoints:
 *   GET  /ping   → { ok: true, tool: "ship-deck-bridge" }  (deck connection status)
 *   POST /result → Stamps receivedAt on body (JSON) and writes to --out. Requires the
 *                  `x-ship-deck-token` header to equal `<dirname(--out)>/bridge-token`, which
 *                  review-deck.mjs embeds in the deck it writes to that directory
 *
 * Exit codes: 0 Normal run (SIGINT termination) / 1 Missing args or occupied port
 *
 * Boundary (R-CM-028): perspective1-only.
 */

import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { linkSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeJsonAtomicSync } from './lib/atomic-fs.mjs';

const MAX_BODY_BYTES = 1024 * 1024; // 1MB payload limit for checklist verdict

/** Header the deck sends its per-deck token in (see ensureBridgeToken). */
export const BRIDGE_TOKEN_HEADER = 'x-ship-deck-token';

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': `content-type, ${BRIDGE_TOKEN_HEADER}`,
  // Chromium Private Network Access — allows loopback preflight from file:// pages
  'Access-Control-Allow-Private-Network': 'true',
  Vary: 'Origin',
};

// The deck opens as file:// (Origin `null`) or from a loopback server. `*` let any site the reviewer
// had open POST /result, and AI reads review-result.json `ng` items as fix tasks — a task-injection
// path. The origin check alone does not close it: any site can send `null` (a sandboxed iframe, or a
// form POST under `referrer: no-referrer` — reproduced in Chrome, adversarial review 2026-10-14), so
// POST /result also needs the deck's token. The origin check stays to keep /ping and the CORS echo
// away from arbitrary sites.
const LOOPBACK_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;

function allowedOrigin(req) {
  const origin = req.headers?.origin;
  if (origin === undefined) return { ok: true }; // non-browser client (curl, tests)
  return { ok: origin === 'null' || LOOPBACK_ORIGIN.test(origin), origin };
}

function corsHeaders(origin) {
  return origin ? { ...CORS_HEADERS, 'Access-Control-Allow-Origin': origin } : CORS_HEADERS;
}

function sendJson(res, status, body, origin) {
  if (res.headersSent) return; // Prevent duplicate header error
  res.writeHead(status, { ...corsHeaders(origin), 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const TOKEN_FILE = 'bridge-token';

const TOKEN_SHAPE = /^[0-9a-f]{32,}$/;

/** The token in `path` if it is a regular owner-only file holding one; else null (never follows a symlink). */
function readBridgeToken(path) {
  try {
    const st = lstatSync(path);
    if (!st.isFile() || (st.mode & 0o077) !== 0) return null;
    const token = readFileSync(path, 'utf8').trim();
    return TOKEN_SHAPE.test(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * The token shared by a deck and its bridge: `<deckDir>/bridge-token` (0600), created by whichever
 * starts first and reused after — a re-rendered deck keeps working with a running bridge. A web page
 * cannot read the file, which is the whole point.
 *
 * The file is written in full under a private name and only then linked into place, so a reader sees
 * a whole token or none: creating it with `wx` and writing after let a concurrent caller read it empty
 * and reuse that forever (adversarial review 2026-10-14, round 2). A file that is not a valid
 * owner-only token — empty, cut short, readable by others, a symlink — is replaced, not trusted.
 *
 * @param {string} dir directory holding index.html and review-result.json
 * @returns {string}
 */
export function ensureBridgeToken(dir) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, TOKEN_FILE);
  const existing = readBridgeToken(path);
  if (existing) return existing;
  const token = randomBytes(24).toString('hex');
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}`;
  writeFileSync(tmp, token, { flag: 'wx', mode: 0o600 });
  try {
    linkSync(tmp, path);
    return token;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    const theirs = readBridgeToken(path); // a concurrent caller linked first
    if (theirs) return theirs;
    renameSync(tmp, path); // replaces the bad file — a symlink itself, not its target
    return token;
  } finally {
    rmSync(tmp, { force: true });
  }
}

function tokenMatches(expected, given) {
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** review-result.json is consumed as SSOT by AI — atomic write (temp→rename, R-CM-024 / AGENTS.md Rule 2) */
function defaultWriteResult(path, payload) {
  mkdirSync(dirname(path), { recursive: true });
  writeJsonAtomicSync(path, payload);
}

function handlePostResult(req, { outPath, writeResult, now, reply }) {
  let size = 0;
  const chunks = [];
  let aborted = false;
  req.on('error', () => {
    // Client socket error (ECONNRESET etc.) — fail-open to avoid crashing process
    aborted = true;
  });
  req.on('data', (chunk) => {
    if (aborted) return;
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      aborted = true;
      reply(413, { ok: false, error: 'payload_too_large' });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    if (aborted) return;
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      reply(400, { ok: false, error: 'invalid_json' });
      return;
    }
    // Checklist payload must always be a JSON object
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      reply(400, { ok: false, error: 'expected_json_object' });
      return;
    }
    payload.receivedAt = now();
    try {
      writeResult(outPath, payload);
    } catch (err) {
      reply(500, { ok: false, error: `write_failed: ${err.message}` });
      return;
    }
    reply(200, { ok: true });
  });
}

/**
 * Request handler factory — injectable writeResult/now for serverless testing. `token` may be a
 * function, read per request: a deck rendered after the bridge started may carry a new token.
 */
export function createRequestHandler({
  outPath,
  token,
  writeResult = defaultWriteResult,
  now = () => new Date().toISOString(),
}) {
  return (req, res) => {
    const { ok, origin } = allowedOrigin(req);
    if (!ok) {
      // No CORS headers: the browser blocks the preflight / hides the response from the page.
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'origin_not_allowed' }));
      return;
    }
    const reply = (status, body) => sendJson(res, status, body, origin);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(origin));
      res.end();
      return;
    }
    if (req.method === 'GET' && req.url === '/ping') {
      reply(200, { ok: true, tool: 'ship-deck-bridge' });
      return;
    }
    if (req.method === 'POST' && req.url === '/result') {
      // No token configured fails closed: a bridge that accepts anything is the bug being fixed.
      const expected = typeof token === 'function' ? token() : token;
      if (!tokenMatches(expected, req.headers?.[BRIDGE_TOKEN_HEADER])) {
        reply(403, { ok: false, error: 'bad_token' });
        return;
      }
      handlePostResult(req, { outPath, writeResult, now, reply });
      return;
    }
    reply(404, { ok: false, error: 'not_found' });
  };
}

function parseArgs(argv) {
  const args = { port: 7357 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      args.out = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--port') {
      args.port = Number.parseInt(argv[i + 1], 10);
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out || !Number.isInteger(args.port)) {
    process.stderr.write('[ship-deck-bridge] Usage: node .claude/scripts/ship-deck-bridge.mjs --out <review-result.json> [--port 7357]\n');
    process.exit(1);
  }
  const outPath = isAbsolute(args.out) ? args.out : resolve(process.cwd(), args.out);
  ensureBridgeToken(dirname(outPath));
  const tokenPath = join(dirname(outPath), TOKEN_FILE);
  const server = http.createServer(
    createRequestHandler({ outPath, token: () => readBridgeToken(tokenPath) }),
  );
  server.on('error', (err) => {
    process.stderr.write(`[ship-deck-bridge] Launch failed: ${err.message} (if port is occupied, use --port <number> and open deck with ?bridge=<number>)\n`);
    process.exit(1);
  });
  server.listen(args.port, '127.0.0.1', () => {
    process.stdout.write(`[ship-deck-bridge] http://127.0.0.1:${args.port} → ${outPath}\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
