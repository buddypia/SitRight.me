/**
 * MediaPipe の wasm を node_modules から public/ にコピーする。
 * JS（npm パッケージ）と wasm のバージョンがずれると読み込みに失敗するため、
 * wasm はコミットせず、dev / build の前に毎回パッケージからコピーする。
 */
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dest = path.join(root, 'public/mediapipe/wasm');

mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  // ES module 版（*_module_internal）は使わない
  if (file.includes('_module_')) continue;
  cpSync(path.join(src, file), path.join(dest, file));
}
