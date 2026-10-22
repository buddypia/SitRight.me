/**
 * atomic-fs.mjs — Atomic file writes + jsonl append helper for system_persistent files.
 *
 * Part of R-CM-030 worktree unification (PLAN.md S1). Keeps system_persistent SSOT shared across
 * worktrees from being torn by concurrent writers with minimal cost (assuming single-user CLI + low
 * contention). Atomic rename prevents torn files, not lost updates: a read-modify-write that must not
 * erase a parallel session's change runs under `withFileLockSync`.
 *
 * Design principles:
 *   - Relies on same-directory atomicity of POSIX rename(2) (avoids external libraries)
 *   - Partial write artifacts (`<file>.tmp`) are created in the same directory before rename
 *   - jsonl uses fs.appendFile with O_APPEND (POSIX guarantees atomic writes under PIPE_BUF)
 *   - Fail-soft: Attempts tmp file cleanup on write failure
 *
 * R-CM-029 Rule 6 (Source-Driven):
 *   - Node.js fs.rename: Guarantees atomic rename within the same filesystem
 *     (Node.js docs nodejs.org/api/fs.html, accessed 2026-05-11)
 *   - POSIX write(2) O_APPEND: Guarantees atomicity for single writes under PIPE_BUF (Linux=4096)
 *     (Linux man-pages, accessed 2026-05-11)
 *   - POSIX link(2): fails with EEXIST when the new path exists, so creating a lock by hard link
 *     admits one owner (man7.org/linux/man-pages/man2/link.2.html; Node.js fs.linkSync,
 *     nodejs.org/api/fs.html#fslinksyncexistingpath-newpath, accessed 2026-10-22)
 *   - Node.js process.kill(pid, 0): tests whether a process exists without signalling it
 *     (nodejs.org/api/process.html#processkillpid-signal, accessed 2026-10-22)
 *   - External lockfile libraries (proper-lockfile, etc.) are over-engineering for single-user CLI —
 *     the stdlib guarantees above are sufficient.
 */

import { writeFile, rename, appendFile, mkdir, unlink } from 'node:fs/promises';
import {
  writeFileSync,
  renameSync,
  mkdirSync,
  unlinkSync,
  existsSync,
  appendFileSync,
  linkSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * Atomically writes a JSON object to a file.
 *
 * Operations:
 *   1. mkdir -p target directory
 *   2. Write temporary file `.<basename>.tmp.<rand>` in the same directory
 *   3. Atomic replacement via fs.rename
 *   4. Cleanup temporary file on failure
 *
 * @param {string} path - Absolute target path
 * @param {unknown} data - Serialization target (must be JSON.stringify-able)
 * @param {object} [opts]
 * @param {number} [opts.spaces=2] - spaces argument for JSON.stringify
 * @returns {Promise<void>}
 */
export async function writeJsonAtomic(path, data, opts = {}) {
  const { spaces = 2 } = opts;
  const dir = dirname(path);
  const base = path.slice(dir.length + 1);
  const rand = randomBytes(6).toString('hex');
  const tmp = join(dir, `.${base}.tmp.${rand}`);

  await mkdir(dir, { recursive: true });
  try {
    const payload = JSON.stringify(data, null, spaces) + '\n';
    await writeFile(tmp, payload, 'utf-8');
    await rename(tmp, path);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

/**
 * Appends a line to a JSONL file.
 *
 * Since JSONL is line-oriented, it is append-only rather than read-modify-write.
 * POSIX O_APPEND mode guarantees atomicity of single writes under PIPE_BUF.
 * brief2dev learning entries are typically under 1KB -> operates well within PIPE_BUF (Linux 4096),
 * ensuring no risk of line interleaving even under concurrent appends.
 *
 * @param {string} path - Absolute target path
 * @param {unknown} entry - Object to serialize as one line
 * @returns {Promise<void>}
 */
export async function appendJsonlAtomic(path, entry) {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify(entry) + '\n';
  await appendFile(path, line, 'utf-8');
}

/**
 * Appends a line to a JSONL file (sync version).
 *
 * Guarantees identical to appendJsonlAtomic (async sibling):
 *   - O_APPEND single write — practically atomic on Linux ext4/xfs. On macOS APFS/NFS/Windows guarantees
 *     are weaker, but brief2dev runs single-user single-process synchronous calls without line interleaving risk.
 *   - Automatic mkdir -p for target directory
 *   - Throw on failure (prevents silent failures — R-CM-010 compliance)
 *
 * Usage locations (sync call sites — WebUI delegated mutator audit append, etc.):
 *   - decision-mutator.mjs#answerDecision (decision-answer audit trail)
 *
 * @param {string} path - Absolute target path
 * @param {unknown} entry - Object to serialize as one line
 * @returns {void}
 */
export function appendJsonlAtomicSync(path, entry) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const line = JSON.stringify(entry) + '\n';
  appendFileSync(path, line, 'utf-8');
}

/**
 * Atomically writes a JSON object to a file (sync version).
 *
 * Guarantees identical to writeJsonAtomic:
 *   - POSIX rename(2) atomic replacement
 *   - randomBytes(6) unique tmp name — prevents multi-worktree concurrent call races
 *   - Temporary file cleanup on failure
 *   - Throw on failure (prevents silent failures — R-CM-010 compliance)
 *
 * Usage locations (sync call sites — child_process calls / CLI scripts, etc.):
 *   - followup-debt-tracker.mjs#saveDebt
 *   - archive-and-reset.mjs#writeMeta / updateArchiveIndex
 *
 * @param {string} path - Absolute target path
 * @param {unknown} data - Serialization target (must be JSON.stringify-able)
 * @param {object} [opts]
 * @param {number} [opts.spaces=2] - spaces argument for JSON.stringify
 * @returns {void}
 */
export function writeJsonAtomicSync(path, data, opts = {}) {
  const { spaces = 2 } = opts;
  const dir = dirname(path);
  const base = path.slice(dir.length + 1);
  const rand = randomBytes(6).toString('hex');
  const tmp = join(dir, `.${base}.tmp.${rand}`);

  mkdirSync(dir, { recursive: true });
  try {
    const payload = JSON.stringify(data, null, spaces) + '\n';
    writeFileSync(tmp, payload, 'utf-8');
    renameSync(tmp, path);
  } catch (err) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      /* tmp cleanup best-effort */
    }
    throw err;
  }
}

/**
 * Atomically writes plain text (markdown, etc.) to a file (sync version).
 *
 * Same guarantees as writeJsonAtomicSync, but writes raw string directly without serialization.
 *   - POSIX rename(2) atomic replacement
 *   - randomBytes(6) unique tmp name — prevents multi-worktree concurrent call races
 *   - Temporary file cleanup on failure
 *   - Throw on failure (prevents silent failures — R-CM-010 compliance)
 *
 * Caller is responsible for trailing newline (not automatically appended like JSON).
 *
 * Usage locations (sync call sites — CLI scripts replacing partial markdown outputs):
 *   - docs-index-build.mjs#writeIndex (docs/index.md AUTO section replacement)
 *
 * @param {string} path - Absolute target path
 * @param {string} text - Raw text to write (written as-is)
 * @returns {void}
 */
export function writeTextAtomicSync(path, text) {
  const dir = dirname(path);
  const base = path.slice(dir.length + 1);
  const rand = randomBytes(6).toString('hex');
  const tmp = join(dir, `.${base}.tmp.${rand}`);

  mkdirSync(dir, { recursive: true });
  try {
    writeFileSync(tmp, String(text), 'utf-8');
    renameSync(tmp, path);
  } catch (err) {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      /* tmp cleanup best-effort */
    }
    throw err;
  }
}

const LOCK_STALE_MS = 2 * 60 * 1000;
// The breaker is held for one read and one unlink; ten seconds is a breaker whose holder is gone.
const BREAKER_STALE_MS = 10_000;
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** The owner record of a lock file: null when there is no lock, `{}` when it cannot be read (stale). */
function readLockOwner(lock) {
  try {
    const owner = JSON.parse(readFileSync(lock, 'utf-8'));
    // A record that parses to `null` or `0` must not read as "no lock": the wait loop would retry
    // it forever without reaching its timeout.
    return owner && typeof owner === 'object' ? owner : {};
  } catch (err) {
    return err?.code === 'ENOENT' ? null : {};
  }
}

function lockOwnerAlive(owner, now, staleMs = LOCK_STALE_MS) {
  if (!Number.isInteger(owner?.pid) || owner.pid <= 0 || now - owner.at > staleMs) return false;
  try {
    process.kill(owner.pid, 0);
    return true;
  } catch (err) {
    // EPERM: the pid lives under another user — alive. Anything else (dead pid) — stale.
    return err?.code === 'EPERM';
  }
}

/**
 * Creates `lock` holding `record`, or returns false if it exists. The record is written to a private
 * file first and hard-linked into place, so the lock never exists without its owner — a directory
 * lock with owner.json written afterwards could be read ownerless and judged stale.
 */
function tryCreateLock(lock, record) {
  const tmp = `${lock}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, record);
  try {
    linkSync(tmp, lock);
    return true;
  } catch (err) {
    if (err?.code === 'EEXIST') return false;
    throw err;
  } finally {
    rmSync(tmp, { force: true });
  }
}

function removeLockIfToken(lock, token) {
  if (readLockOwner(lock)?.token !== token) return;
  try {
    unlinkSync(lock);
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
  }
}

/**
 * Removes `lock` if it is still stale, judged again under a second lock (`<lock>.break`) that
 * serializes takeovers: with two at once, one could remove the stale lock, a third process create a
 * live one, and the other remove that. Returns whether this call held the breaker.
 */
function breakStaleLock(lock) {
  const breaker = `${lock}.break`;
  const token = randomBytes(8).toString('hex');
  if (!tryCreateLock(breaker, JSON.stringify({ pid: process.pid, at: Date.now(), token }))) {
    const holder = readLockOwner(breaker);
    if (holder && !lockOwnerAlive(holder, Date.now(), BREAKER_STALE_MS)) removeLockIfToken(breaker, holder.token);
    return false;
  }
  try {
    const current = readLockOwner(lock);
    if (current && !lockOwnerAlive(current, Date.now())) {
      try {
        unlinkSync(lock);
      } catch (err) {
        if (err?.code !== 'ENOENT') throw err;
      }
    }
  } finally {
    removeLockIfToken(breaker, token);
  }
  return true;
}

/**
 * Runs `fn` while holding an exclusive lock on `path`, so a read-modify-write of one shared file by
 * parallel sessions cannot lose an update. Atomic rename alone does not prevent that: two sessions
 * read the same version, each writes its own change, and the second rename erases the first
 * (followup-debt.json, where it also handed out the same DEBT-N twice — design-lookbook 6fc3de2c).
 *
 * The lock is `<dir>/.locks/<name>.lock`, not `<path>.lock`: `audit-brief2dev-layout --strict` fails
 * on any unmapped file under `.brief2dev/system/`, so a lock left by a crashed holder would fail every
 * session's pre-push, while hidden directories are outside its category model.
 *
 * The lock is a file created with its owner record already in it ({pid, at, token}). Each acquisition
 * has its own token: a pid says who, not which lock, so a release removes the lock only while it is
 * still ours. A lock whose owner is dead, unreadable or older than two minutes is taken over under the
 * breaker, which judges it again. What remains open: a holder still alive past two minutes releasing
 * in the instant between that check and the unlink, and a process dying while it holds the breaker
 * (two waiters may then both clear it). Waits up to `timeoutMs`, then throws — the caller's write
 * fails loudly rather than racing.
 *
 * @template T
 * @param {string} path - Absolute path of the file being updated
 * @param {() => T} fn
 * @param {{timeoutMs?: number}} [opts]
 * @returns {T}
 */
export function withFileLockSync(path, fn, { timeoutMs = 30_000 } = {}) {
  const lock = join(dirname(path), '.locks', `${basename(path)}.lock`);
  mkdirSync(dirname(lock), { recursive: true });
  const t0 = Date.now();
  const token = randomBytes(8).toString('hex');
  for (;;) {
    if (tryCreateLock(lock, JSON.stringify({ pid: process.pid, at: Date.now(), token }))) break;
    const judged = readLockOwner(lock);
    if (!judged) continue; // released between the attempt and the read
    if (!lockOwnerAlive(judged, Date.now()) && breakStaleLock(lock)) continue;
    if (Date.now() - t0 > timeoutMs) {
      throw new Error(`withFileLockSync: ${lock} held by another process for over ${timeoutMs}ms`);
    }
    sleepSync(50);
  }
  try {
    return fn();
  } finally {
    removeLockIfToken(lock, token);
  }
}
