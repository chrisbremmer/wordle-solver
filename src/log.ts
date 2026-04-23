// Game-trace persistence (spec §13.2). Each game writes one JSON file under
// logs/ that the analyze script consumes. Schema is versioned so the analyze
// prompt can reject incompatible logs cleanly.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { GameOutcome } from './controller.js';

export const LOG_DIR = resolve(process.cwd(), 'logs');
export const LOG_VERSION = 1;

export interface GameLog {
  version: typeof LOG_VERSION;
  timestamp: string; // ISO 8601
  scorer: string; // 'entropy' | 'oneply' | …
  source: 'interactive' | 'benchmark';
  outcome: 'solved' | 'failed';
  guesses: number;
  /** Known when source is benchmark, or when interactive game was solved. */
  answer?: string;
  trace: GameOutcome['trace'];
}

function tsForFilename(): string {
  // 2026-04-22T19-08-03 — sortable, filesystem-safe
  return new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d+Z$/, 'Z');
}

function sanitize(answer: string | undefined): string {
  if (!answer) return 'unknown';
  return answer.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 16) || 'unknown';
}

/** Write one game log. Returns the absolute path. */
export function writeLog(log: GameLog): string {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  const name = `${tsForFilename()}-${sanitize(log.answer)}.json`;
  const path = join(LOG_DIR, name);
  writeFileSync(path, JSON.stringify(log, null, 2) + '\n');
  return path;
}

/** Read every log file in the directory, newest-first by mtime. */
export function readAllLogs(dir: string = LOG_DIR): GameLog[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f))
    .map((p) => readLogFile(p))
    .filter((l): l is GameLog => l !== null)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

/** Read one log; returns null on parse / version mismatch (with stderr warn). */
export function readLogFile(path: string): GameLog | null {
  try {
    const data = JSON.parse(readFileSync(path, 'utf8')) as GameLog;
    if (data.version !== LOG_VERSION) {
      console.error(`skipping ${path}: log version ${data.version} != expected ${LOG_VERSION}`);
      return null;
    }
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`skipping ${path}: ${msg}`);
    return null;
  }
}
