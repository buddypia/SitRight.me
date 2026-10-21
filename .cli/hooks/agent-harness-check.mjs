#!/usr/bin/env node

/**
 * agent-harness-check.mjs — PostToolUse Hook (blocking feedback on Edit|Write|MultiEdit / Codex apply_patch)
 *
 * Re-validates the agent harness the moment an edit touches it — AGENTS.md, CLAUDE.md, a skill under
 * `.claude/skills` / `.agents/skills`, a subagent, a hook module or hook config, or an experience-library
 * entry under `docs/harness/` — and returns every
 * problem to the model as `decision: "block"` so it fixes them in the same turn.
 *
 * Why a hook and not prose: every rule checked here fails *silently* (an over-long AGENTS.md crowds out the
 * agent's own output budget, an untriggered skill is never opened, a missing hook module never fires), and a
 * sentence in AGENTS.md can be skipped while a PostToolUse block cannot. Adapted from Harness² (Google Research,
 * harness2/core/tree.py#validate, prompts.py _SURFACE_CODEX).
 *
 * Rules SSOT: scripts/check-agent-harness.mjs (also run in CI as `npm run check:harness`, which covers
 * Antigravity — its PostToolUse payload carries no file path).
 */

import { readStdin, output, safeHookMainWithProfile } from '../lib/utils.mjs';
import { HookOutput } from '../lib/hook-output.mjs';
import { editedFiles } from '../lib/edited-files.mjs';
import { checkHookModulesCompile, isHarnessPath, validateHarness } from '../../scripts/check-agent-harness.mjs';

export async function run(data) {
  try {
    const edited = editedFiles(data).filter((f) => isHarnessPath(f.rel));
    const roots = new Set(edited.map((f) => f.root));
    // 全 hook モジュールの構文検査は 1 件ごとに node を起こすので、ここでは編集したものだけ確かめる（全件は CI）
    const problems = [...roots].flatMap((root) => [
      ...validateHarness(root, { compile: false }),
      ...checkHookModulesCompile(
        root,
        edited.filter((f) => f.root === root && /^\.cli\/hooks\/.+\.mjs$/.test(f.rel)).map((f) => f.rel),
      ),
    ]);
    if (!problems.length) return HookOutput.passthrough();
    return HookOutput.block(
      `[agent-harness-check] This edit left the agent harness invalid (${problems.length}):\n` +
        problems.map((p) => `- ${p}`).join('\n') +
        '\n\nFix them now. Placement rules: .agents/skills/agent-harness/SKILL.md · re-check: npm run check:harness',
    );
  } catch (_) {
    return HookOutput.passthrough();
  }
}

if (!globalThis.__HOOK_ORCHESTRATOR__) {
  safeHookMainWithProfile('agent-harness-check', async () => {
    const data = await readStdin();
    return output(await run(data));
  });
}
