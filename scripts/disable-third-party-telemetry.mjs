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
 * 2. Log flush methods return immediately as no-ops.
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

  for (const bundle of bundles) {
    const filePath = path.resolve(baseDir, 'node_modules/@mediapipe/tasks-vision', bundle);
    if (!existsSync(filePath)) continue;

    let content = readFileSync(filePath, 'utf8');
    let changed = false;

    // 1. Remove remote ODML logging URL
    if (content.includes('https://odml.pa.googleapis.com/v1/log')) {
      content = content.replaceAll(
        'https://odml.pa.googleapis.com/v1/log',
        ''
      );
      changed = true;
    }

    // 2. Kill the 60s periodic flush timer: setInterval(()=>{this.flush()},6e4) -> void 0
    if (content.includes('setInterval(()=>{this.flush()},6e4)')) {
      content = content.replaceAll(
        'setInterval(()=>{this.flush()},6e4)',
        'void 0'
      );
      changed = true;
    }

    // 3. Short-circuit flush(): flush(t,e){if(this.error) -> flush(t,e){t?.();return;if(this.error)
    if (content.includes('flush(t,e){if(this.error)')) {
      content = content.replaceAll(
        'flush(t,e){if(this.error)',
        'flush(t,e){t?.();return;if(this.error)'
      );
      changed = true;
    }

    if (changed) {
      writeFileSync(filePath, content, 'utf8');
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
