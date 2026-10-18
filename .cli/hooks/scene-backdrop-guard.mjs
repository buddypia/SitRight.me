#!/usr/bin/env node

/**
 * scene-backdrop-guard.mjs — PostToolUse Hook (blocking feedback on Edit|Write|MultiEdit / Codex apply_patch)
 *
 * After a write under `src/`, re-reads the file and blocks when a string literal combines a full-cover class
 * (`inset-0`) with a backdrop-filter utility (`backdrop-*`). Over the 3D scene (a WebGL canvas redrawn every
 * frame) the blur is recomputed every frame and, without a GPU, starves the pose-estimation loop: #42 —
 * a full-canvas loading overlay with `backdrop-blur` failed e2e in 4 of 5 runs.
 *
 * The rule used to be a sentence in CLAUDE.md; it moved here so it costs no always-on budget and cannot be
 * skipped. Detection SSOT: scripts/lib/scene-backdrop.mjs (ESLint `no-restricted-syntax` in CI uses the same
 * patterns, which also covers Antigravity — its PostToolUse payload carries no file path).
 */

import { readFileSync } from 'node:fs';
import { readStdin, output, safeHookMainWithProfile } from '../lib/utils.mjs';
import { HookOutput } from '../lib/hook-output.mjs';
import { editedFiles } from '../lib/edited-files.mjs';
import { findSceneBackdrop, SCENE_BACKDROP_MESSAGE } from '../../scripts/lib/scene-backdrop.mjs';

const SOURCE = /^src\/.+\.(?:[cm]?[jt]sx?)$/;

export async function run(data) {
  try {
    const hits = [];
    for (const f of editedFiles(data)) {
      if (!SOURCE.test(f.rel)) continue;
      let source;
      try {
        source = readFileSync(f.abs, 'utf8');
      } catch {
        continue; // deleted by the patch
      }
      for (const line of findSceneBackdrop(source)) hits.push(`${f.rel}:${line}`);
    }
    if (!hits.length) return HookOutput.passthrough();
    return HookOutput.block(`[scene-backdrop-guard] ${hits.join(', ')}\n${SCENE_BACKDROP_MESSAGE}`);
  } catch (_) {
    return HookOutput.passthrough();
  }
}

if (!globalThis.__HOOK_ORCHESTRATOR__) {
  safeHookMainWithProfile('scene-backdrop-guard', async () => {
    const data = await readStdin();
    return output(await run(data));
  });
}
