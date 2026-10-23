/**
 * vitest-spawn-latency-reporter.mjs — samples how long a no-op process takes to start while a vitest
 * run is in progress, and records the run's median.
 *
 * Why: `classifyLoadMeasurability` decides whether a failed run got a fair shot. Its load axis reads
 * the 1/5/15-minute windows, so it covers the run; a spawn probe taken once after the run does not.
 * Measured 2026-10-23 (16 CPUs, full suite): 141 readings during the run had a median of 43.5 ms,
 * five probes right after it read 5.9–24 ms, and the gate ruled a timeout-only failure "not
 * saturated" on a 22.4 ms post-run probe. This record gives the spawn axis the run's own window for
 * `ci-local-status#rerunTimeoutOnlyFailures` and the R-CM-041 flaky check.
 *
 * Each tick is one `spawnSync('true')` on vitest's main thread (at most 120 ms observed) — the same
 * probe the 30 ms cut was set against, but taken under the suite's own workers, which the cut's
 * observations were not. Known limit: no in-run reading from a healthy box exists yet, so a box whose
 * healthy in-run start is over 30 ms reads "saturated" on every full run. There a timeout the code
 * caused still passes if it fits the 180 s re-measurement, and a real flake prints as a notice instead
 * of failing the gate; nothing is dropped.
 *
 * The timer is unref'd and the record is written only when the run ends: a hard-killed run leaves
 * none, and the caller falls back to probing after the run. An interrupted run (vitest still calls
 * onTestRunEnd) records the readings it took, beside the JSON report vitest writes for it.
 *
 * UNVERIFIED: that vitest pairs every onTestRunStart with an onTestRunEnd in watch mode; a restart
 *   before the end discards the earlier readings either way.
 * Source: https://vitest.dev/api/advanced/reporters (onInit, onTestRunStart, onTestRunEnd)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { measureSpawnLatencyMs } from '../../../.cli/lib/utils.mjs';
import { writeJsonAtomicSync } from './atomic-fs.mjs';

/** Relative to vitest's root — the checkout running the gate, like the suite-error record. */
export const SPAWN_LATENCY_REPORT = '.tmp/vitest-spawn-latency.json';

/** About 56 readings over a 280 s suite: enough for a median, few enough blocking spawns. */
export const SPAWN_SAMPLE_INTERVAL_MS = 5_000;

const isPositiveNumber = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * The in-run reading a verdict may use, or null when there is none to use — no file, an unreadable
 * one, or a run too short for a single reading.
 *
 * @param {string} path absolute path of the record
 * @returns {{spawnMs: number, samples: number}|null}
 */
export function readSpawnLatency(path) {
  try {
    const { spawnMs, samples } = JSON.parse(readFileSync(path, 'utf-8'));
    if (isPositiveNumber(spawnMs) && Number.isInteger(samples) && samples > 0) return { spawnMs, samples };
  } catch {
    /* missing or unparseable → no in-run reading */
  }
  return null;
}

export default class SpawnLatencyReporter {
  /** vitest passes the reporter's options when it builds one from the command line (none here). */
  constructor({ intervalMs = SPAWN_SAMPLE_INTERVAL_MS, measure = () => measureSpawnLatencyMs({ samples: 1 }) } = {}) {
    this.intervalMs = intervalMs;
    this.measure = measure;
    this.readings = [];
    this.timer = null;
  }

  onInit(vitest) {
    this.root = vitest.config.root;
  }

  onTestRunStart() {
    clearInterval(this.timer);
    this.readings = [];
    this.timer = setInterval(() => {
      const ms = this.measure();
      if (isPositiveNumber(ms)) this.readings.push(ms);
    }, this.intervalMs);
    this.timer.unref?.();
  }

  onTestRunEnd() {
    clearInterval(this.timer);
    this.timer = null;
    const sorted = [...this.readings].sort((a, b) => a - b);
    // Upper median, as `measureSpawnLatencyMs` takes it, so the cut means the same thing either way.
    writeJsonAtomicSync(resolve(this.root, SPAWN_LATENCY_REPORT), {
      samples: sorted.length,
      intervalMs: this.intervalMs,
      spawnMs: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null,
    });
  }
}
