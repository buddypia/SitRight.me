/**
 * Third-Party Telemetry Eliminator.
 * 
 * MediaPipe Tasks Vision (@mediapipe/tasks-vision) contains an internal Google ODML
 * telemetry logger that periodically attempts to post logs to 'https://odml.pa.googleapis.com/v1/log'.
 * 
 * In accordance with TELEMETRY_CONTRACT.md (Rule 1: Strict Zero Third-Party Trackers):
 * "All telemetry MUST be first-party (/api/telemetry)."
 * 
 * This script strips and disables third-party telemetry in MediaPipe bundles so that:
 * 1. Periodic setInterval timers (60s flush) are neutered (zero CPU/battery waste).
 * 2. Log entries are never buffered (a no-op flush would let the buffer grow forever).
 * 3. The remote endpoint URL is removed.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function resolveTasksVisionDir(baseDir) {
  const localDir = path.join(baseDir, 'node_modules', '@mediapipe/tasks-vision');
  if (existsSync(localDir)) return localDir;
  try {
    const commonDir = execSync('git rev-parse --path-format=absolute --git-common-dir', {
      cwd: baseDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (commonDir) {
      const sharedDir = path.join(path.dirname(commonDir), 'node_modules', '@mediapipe/tasks-vision');
      if (existsSync(sharedDir)) return sharedDir;
    }
  } catch {
    // fallback
  }
  return localDir;
}

export function disableThirdPartyTelemetry(baseDir = process.cwd()) {
  const bundles = [
    'vision_bundle.mjs',
    'vision_bundle.js',
    'vision_bundle.cjs',
  ];

  let patchedCount = 0;

  // [from, to]: 1. remove the remote ODML logging URL,
  // 2. kill the 60s periodic flush timer, 3. never enqueue log entries
  const patches = [
    ['https://odml.pa.googleapis.com/v1/log', ''],
    ['setInterval(()=>{this.flush()},6e4)', 'void 0'],
    ['(t=t.m).error||t.i.push(e)', '(t=t.m)'],
  ];

  const pkgDir = resolveTasksVisionDir(baseDir);
  if (!existsSync(pkgDir)) return 0;

  const stampPath = path.join(pkgDir, '.telemetry-disabled.json');
  let cachedStamp = null;
  try {
    cachedStamp = JSON.parse(readFileSync(stampPath, 'utf8'));
  } catch {
    cachedStamp = null;
  }

  const nextStamp = {};
  let stampChanged = false;

  for (const bundle of bundles) {
    const filePath = path.resolve(pkgDir, bundle);
    let st;
    try {
      st = statSync(filePath);
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }

    const sig = `${st.size}:${st.mtimeMs}`;
    if (cachedStamp && cachedStamp[bundle] === sig) {
      nextStamp[bundle] = sig;
      continue;
    }

    const content = readFileSync(filePath, 'utf8');
    let patched = content;
    for (const [from, to] of patches) patched = patched.replaceAll(from, to);

    if (patched !== content) {
      writeFileSync(filePath, patched, 'utf8');
      patchedCount++;
      const updatedStat = statSync(filePath);
      nextStamp[bundle] = `${updatedStat.size}:${updatedStat.mtimeMs}`;
    } else {
      nextStamp[bundle] = sig;
    }
    stampChanged = true;
  }

  if (stampChanged && Object.keys(nextStamp).length > 0) {
    try {
      writeFileSync(stampPath, JSON.stringify(nextStamp), 'utf8');
    } catch {
      // non-fatal if read-only
    }
  }

  return patchedCount;
}

// Run directly if invoked from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const count = disableThirdPartyTelemetry();
  if (count > 0) {
    console.log(`[telemetry] Disabled third-party telemetry in ${count} MediaPipe bundle(s).`);
  }
}
