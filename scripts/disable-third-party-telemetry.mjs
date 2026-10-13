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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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

  const projectRoot = baseDir.includes('.worktrees')
    ? baseDir.split(`${path.sep}.worktrees`)[0]
    : baseDir;

  const candidateDirs = [
    path.join(baseDir, 'node_modules'),
    path.join(projectRoot, 'node_modules'),
  ];
  const nodeModulesDir =
    candidateDirs.find((dir) =>
      existsSync(path.join(dir, '@mediapipe/tasks-vision'))
    ) ?? path.join(baseDir, 'node_modules');

  for (const bundle of bundles) {
    const filePath = path.resolve(nodeModulesDir, '@mediapipe/tasks-vision', bundle);
    let content;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }

    let patched = content;
    for (const [from, to] of patches) patched = patched.replaceAll(from, to);

    if (patched !== content) {
      writeFileSync(filePath, patched, 'utf8');
      patchedCount++;
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
