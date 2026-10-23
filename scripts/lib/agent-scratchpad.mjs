/**
 * agent-scratchpad.mjs — Shared cross-worktree scratchpad, content-addressed verification cache,
 * single-flight lock, and inter-agent note store for parallel AI CLI sessions.
 *
 * Lives at `<mainRepoRoot>/.tmp/agent-scratchpad` (resolved via `.git` file / `git-common-dir`)
 * and is symlinked into `<worktreeRoot>/.tmp/agent-scratchpad` so every worktree shares one
 * canonical cache without duplicating work across parallel sessions.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const MAX_CACHE_ENTRIES_PER_STAGE = 64;
const MAX_FILE_HASH_ENTRIES = 4000;

/**
 * Resolves the checkout root (`.worktrees/<branch>` or main repo) by walking up for `.git`.
 * Zero subprocess spawns in the common case.
 */
export function resolveCheckoutRoot(startDir = process.cwd()) {
  let cur = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(cur, '.git'))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) return path.resolve(startDir);
    cur = parent;
  }
}

/**
 * Resolves the main repository root across linked `.worktrees/<branch>` checkouts.
 * Parses `.git` file (`gitdir: .../.git/worktrees/<name>`) directly without spawning git when possible.
 */
export function resolveMainRepoRoot(startDir = process.cwd()) {
  const checkoutRoot = resolveCheckoutRoot(startDir);
  const dotGit = path.join(checkoutRoot, '.git');
  try {
    const st = statSync(dotGit);
    if (st.isDirectory()) return checkoutRoot;
    if (st.isFile()) {
      const raw = readFileSync(dotGit, 'utf8').trim();
      const m = /^gitdir:\s*(.+)$/i.exec(raw);
      if (m) {
        const gitDir = path.resolve(checkoutRoot, m[1].trim());
        const commondirFile = path.join(gitDir, 'commondir');
        if (existsSync(commondirFile)) {
          const relCommon = readFileSync(commondirFile, 'utf8').trim();
          const commonDir = path.resolve(gitDir, relCommon);
          return path.dirname(commonDir);
        }
        if (gitDir.includes(`${path.sep}.git${path.sep}worktrees${path.sep}`)) {
          return path.resolve(gitDir, '..', '..', '..');
        }
      }
    }
  } catch {
    // fallback to git CLI below
  }

  try {
    const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: startDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (commonDir) return path.dirname(commonDir);
  } catch {
    // fallback
  }
  return checkoutRoot;
}

/**
 * Ensures `<mainRepoRoot>/.tmp/agent-scratchpad` exists and, when called from a linked worktree,
 * creates a convenience symlink `<worktreeRoot>/.tmp/agent-scratchpad -> <mainRepoRoot>/.tmp/agent-scratchpad`.
 */
export function ensureAgentScratchpad(startDir = process.cwd()) {
  if (process.env.SITRIGHT_AGENT_SCRATCHPAD_DIR) {
    const override = path.resolve(process.env.SITRIGHT_AGENT_SCRATCHPAD_DIR);
    mkdirSync(override, { recursive: true });
    return override;
  }

  const mainRoot = resolveMainRepoRoot(startDir);
  const checkoutRoot = resolveCheckoutRoot(startDir);
  const sharedDir = path.join(mainRoot, '.tmp', 'agent-scratchpad');
  mkdirSync(sharedDir, { recursive: true });

  if (checkoutRoot !== mainRoot) {
    const localTmp = path.join(checkoutRoot, '.tmp');
    const localLink = path.join(localTmp, 'agent-scratchpad');
    try {
      mkdirSync(localTmp, { recursive: true });
      let needsLink = true;
      try {
        const lst = lstatSync(localLink);
        if (lst.isSymbolicLink()) {
          needsLink = false;
        }
      } catch {
        needsLink = true;
      }
      if (needsLink && !existsSync(localLink)) {
        symlinkSync(sharedDir, localLink, 'dir');
      }
    } catch {
      // Best-effort symlink; callers always use the returned `sharedDir` path directly.
    }
  }

  return sharedDir;
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    renameSync(tmpPath, filePath);
  } catch {
    try {
      unlinkSync(tmpPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Computes a deterministic SHA-256 content fingerprint across a list of relative file paths,
 * backed by a shared `(absPath, size, mtimeMs) -> sha256` stat cache in `agent-scratchpad`.
 */
export function computeFilesFingerprint(rootDir, relPaths, { scratchpadDir = ensureAgentScratchpad(rootDir) } = {}) {
  const hashCachePath = path.join(scratchpadDir, 'file-hash-cache.json');
  const cacheData = readJsonSafe(hashCachePath, { version: 1, files: {} });
  const fileMap = cacheData && typeof cacheData.files === 'object' ? cacheData.files : {};
  let dirty = false;

  const sorted = [...new Set(relPaths.map((p) => p.replace(/\\/g, '/')))].sort();
  const overall = createHash('sha256');
  overall.update(`v1:${sorted.length}\n`);

  for (const rel of sorted) {
    const abs = path.join(rootDir, rel);
    let st;
    try {
      st = statSync(abs);
    } catch {
      overall.update(`${rel}:missing\n`);
      continue;
    }
    if (!st.isFile()) continue;

    const sig = `${st.size}:${st.mtimeMs}`;
    const cached = fileMap[abs];
    let contentHash;
    if (cached && cached.sig === sig && typeof cached.sha256 === 'string') {
      contentHash = cached.sha256;
    } else {
      contentHash = createHash('sha256').update(readFileSync(abs)).digest('hex');
      fileMap[abs] = { sig, sha256: contentHash };
      dirty = true;
    }
    overall.update(`${rel}:${contentHash}\n`);
  }

  if (dirty) {
    const keys = Object.keys(fileMap);
    if (keys.length > MAX_FILE_HASH_ENTRIES) {
      for (const k of keys.slice(0, keys.length - MAX_FILE_HASH_ENTRIES)) {
        delete fileMap[k];
      }
    }
    writeJsonAtomic(hashCachePath, { version: 1, files: fileMap });
  }

  return overall.digest('hex');
}

export function readVerifyCache(scratchpadDir = ensureAgentScratchpad()) {
  const file = path.join(scratchpadDir, 'verify-cache.json');
  const data = readJsonSafe(file, { version: 1, stages: {} });
  if (!data || typeof data.stages !== 'object') {
    return { version: 1, stages: {} };
  }
  return data;
}

export function getStageVerdict(stage, inputHash, { scratchpadDir = ensureAgentScratchpad() } = {}) {
  if (!stage || !inputHash) return null;
  const cache = readVerifyCache(scratchpadDir);
  const stageEntries = cache.stages?.[stage];
  if (!stageEntries || typeof stageEntries !== 'object') return null;
  const hit = stageEntries[inputHash];
  return hit && hit.status === 'pass' ? hit : null;
}

export function recordStageVerdict(
  stage,
  inputHash,
  { status = 'pass', worktree = process.cwd(), durationMs = 0, detail = '' } = {},
  { scratchpadDir = ensureAgentScratchpad(worktree) } = {},
) {
  if (!stage || !inputHash) return;
  const file = path.join(scratchpadDir, 'verify-cache.json');
  const cache = readVerifyCache(scratchpadDir);
  if (!cache.stages[stage] || typeof cache.stages[stage] !== 'object') {
    cache.stages[stage] = {};
  }
  const stageMap = cache.stages[stage];
  stageMap[inputHash] = {
    status,
    recordedAt: new Date().toISOString(),
    worktree: path.basename(worktree),
    durationMs: Math.round(durationMs),
    detail,
  };

  const keys = Object.keys(stageMap);
  if (keys.length > MAX_CACHE_ENTRIES_PER_STAGE) {
    const sortedByTime = keys.sort((a, b) =>
      String(stageMap[a]?.recordedAt || '').localeCompare(String(stageMap[b]?.recordedAt || '')),
    );
    for (const k of sortedByTime.slice(0, keys.length - MAX_CACHE_ENTRIES_PER_STAGE)) {
      delete stageMap[k];
    }
  }

  writeJsonAtomic(file, cache);
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Executes `fn` under a cross-worktree single-flight lock inside `agent-scratchpad/locks`.
 * Prevents multiple AI agents from running heavy 14-worker `next build` simultaneously.
 */
export function withScratchpadLock(
  lockName,
  fn,
  { scratchpadDir = ensureAgentScratchpad(), timeoutMs = 180_000, pollMs = 200, staleMs = 300_000 } = {},
) {
  const locksDir = path.join(scratchpadDir, 'locks');
  mkdirSync(locksDir, { recursive: true });
  const lockDir = path.join(locksDir, `${lockName}.lock`);
  const ownerFile = path.join(lockDir, 'owner.json');
  const start = Date.now();
  let acquired = false;

  while (Date.now() - start < timeoutMs) {
    try {
      mkdirSync(lockDir);
      writeFileSync(
        ownerFile,
        JSON.stringify({ pid: process.pid, acquiredAt: Date.now(), cwd: process.cwd() }),
        'utf8',
      );
      acquired = true;
      break;
    } catch {
      const owner = readJsonSafe(ownerFile, null);
      const age = owner && typeof owner.acquiredAt === 'number' ? Date.now() - owner.acquiredAt : Infinity;
      const alive = owner ? isPidAlive(owner.pid) : false;
      if ((owner && !alive) || age > staleMs) {
        try {
          rmSync(lockDir, { recursive: true, force: true });
          continue;
        } catch {
          // another process cleaned it
        }
      }
      sleepSync(pollMs);
    }
  }

  try {
    return fn({ acquired, waitedMs: Date.now() - start });
  } finally {
    if (acquired) {
      try {
        rmSync(lockDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Shared agent notes KV store in `<scratchpadDir>/shared-notes.json` for cross-worktree coordination.
 */
export function readSharedNotes(scratchpadDir = ensureAgentScratchpad()) {
  const file = path.join(scratchpadDir, 'shared-notes.json');
  const data = readJsonSafe(file, { version: 1, notes: {} });
  return data && typeof data.notes === 'object' ? data.notes : {};
}

export function setSharedNote(key, value, { author = path.basename(process.cwd()), scratchpadDir = ensureAgentScratchpad() } = {}) {
  const file = path.join(scratchpadDir, 'shared-notes.json');
  const notes = readSharedNotes(scratchpadDir);
  notes[key] = {
    value,
    author,
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(file, { version: 1, notes });
  return notes[key];
}

export function clearScratchpadCache(scratchpadDir = ensureAgentScratchpad()) {
  for (const name of ['verify-cache.json', 'file-hash-cache.json', 'hook-syntax-cache.json']) {
    try {
      rmSync(path.join(scratchpadDir, name), { force: true });
    } catch {
      // ignore
    }
  }
}
