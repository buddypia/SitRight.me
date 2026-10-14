/**
 * MediaPipe の wasm を node_modules から public/ にコピーする。
 * JS（npm パッケージ）と wasm のバージョンがずれると読み込みに失敗するため、
 * wasm はコミットせず、dev / build の前に毎回パッケージからコピーする。
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { disableThirdPartyTelemetry } from './disable-third-party-telemetry.mjs';

function resolveMainRepoRoot(startDir) {
  try {
    const commonDir = execSync('git rev-parse --path-format=absolute --git-common-dir', {
      cwd: startDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (commonDir) return path.dirname(commonDir);
  } catch {
    // fallback
  }
  return startDir;
}

const root = path.resolve(import.meta.dirname, '..');
const projectRoot = resolveMainRepoRoot(root);

const candidateDirs = [
  path.join(root, 'node_modules'),
  path.join(projectRoot, 'node_modules'),
];
const nodeModulesDir =
  candidateDirs.find((dir) =>
    existsSync(path.join(dir, '@mediapipe/tasks-vision/wasm'))
  ) ?? path.join(root, 'node_modules');

const src = path.join(nodeModulesDir, '@mediapipe/tasks-vision/wasm');
const dest = path.join(root, 'public/mediapipe/wasm');

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  // ES module 版（*_module_internal）は使わない
  if (file.includes('_module_')) continue;
  cpSync(path.join(src, file), path.join(dest, file));
}

// Third-party telemetry must be eliminated completely per TELEMETRY_CONTRACT.md
disableThirdPartyTelemetry(path.dirname(nodeModulesDir));
