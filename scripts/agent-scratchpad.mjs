#!/usr/bin/env node
/**
 * agent-scratchpad.mjs — CLI for inspecting and coordinating the shared cross-worktree scratchpad.
 *
 * Usage:
 *   node scripts/agent-scratchpad.mjs status
 *   node scripts/agent-scratchpad.mjs note --key <key> --value <value>
 *   node scripts/agent-scratchpad.mjs notes
 *   node scripts/agent-scratchpad.mjs clean
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clearScratchpadCache,
  ensureAgentScratchpad,
  readSharedNotes,
  readVerifyCache,
  resolveCheckoutRoot,
  resolveMainRepoRoot,
  setSharedNote,
} from './lib/agent-scratchpad.mjs';

export function runCli(argv = process.argv.slice(2), cwd = process.cwd()) {
  const cmd = argv[0] || 'status';
  const scratchpadDir = ensureAgentScratchpad(cwd);

  if (cmd === 'status') {
    const cache = readVerifyCache(scratchpadDir);
    const notes = readSharedNotes(scratchpadDir);
    const stageCounts = {};
    for (const [stage, entries] of Object.entries(cache.stages || {})) {
      stageCounts[stage] = Object.keys(entries || {}).length;
    }
    return {
      ok: true,
      scratchpad_dir: scratchpadDir,
      main_repo_root: resolveMainRepoRoot(cwd),
      checkout_root: resolveCheckoutRoot(cwd),
      cached_verdicts: stageCounts,
      shared_notes_count: Object.keys(notes).length,
    };
  }

  if (cmd === 'notes') {
    return {
      ok: true,
      scratchpad_dir: scratchpadDir,
      notes: readSharedNotes(scratchpadDir),
    };
  }

  if (cmd === 'note') {
    let key = '';
    let value = '';
    for (let i = 1; i < argv.length; i++) {
      if (argv[i] === '--key' && argv[i + 1]) key = argv[++i];
      else if (argv[i] === '--value' && argv[i + 1]) value = argv[++i];
    }
    if (!key) {
      throw new Error('Usage: node scripts/agent-scratchpad.mjs note --key <key> --value <value>');
    }
    const entry = setSharedNote(key, value, { scratchpadDir, author: path.basename(cwd) });
    return { ok: true, scratchpad_dir: scratchpadDir, key, entry };
  }

  if (cmd === 'clean') {
    clearScratchpadCache(scratchpadDir);
    return { ok: true, scratchpad_dir: scratchpadDir, cleaned: true };
  }

  throw new Error(`Unknown subcommand "${cmd}". Expected: status | notes | note | clean`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const out = runCli();
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error(`[agent-scratchpad] ${err.message}`);
    process.exit(1);
  }
}
