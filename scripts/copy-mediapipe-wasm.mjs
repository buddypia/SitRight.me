/**
 * MediaPipe の wasm を node_modules から public/ にコピーする。
 * JS（npm パッケージ）と wasm のバージョンがずれると読み込みに失敗するため、
 * wasm はコミットせず、dev / build の前に毎回パッケージからコピーする。
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
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
const localNodeModules = path.join(root, 'node_modules');
const nodeModulesDir = existsSync(path.join(localNodeModules, '@mediapipe/tasks-vision/wasm'))
  ? localNodeModules
  : path.join(resolveMainRepoRoot(root), 'node_modules');

const src = path.join(nodeModulesDir, '@mediapipe/tasks-vision/wasm');
const dest = path.join(root, 'public/mediapipe/wasm');

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  // ES module 版（*_module_internal）は使わない
  if (file.includes('_module_')) continue;
  const srcPath = path.join(src, file);
  const destPath = path.join(dest, file);
  try {
    const srcStat = statSync(srcPath);
    const destStat = statSync(destPath);
    if (destStat.size === srcStat.size && destStat.mtimeMs >= srcStat.mtimeMs) {
      continue;
    }
  } catch {
    // dest does not exist yet -> copy
  }
  cpSync(srcPath, destPath);
}

// Third-party telemetry must be eliminated completely per TELEMETRY_CONTRACT.md
disableThirdPartyTelemetry(path.dirname(nodeModulesDir));
