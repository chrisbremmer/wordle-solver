// Load cache.bin from disk; fall back to building it (and writing it) if
// the file is missing or stale. Shared by cli.ts and the benchmark script.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PatternCache } from './core/patternCache.js';
import { ANSWERS } from './data/answers.js';
import { GUESSES } from './data/guesses.js';

export const CACHE_PATH = resolve(process.cwd(), 'cache.bin');

export interface LoadResult {
  cache: PatternCache;
  source: 'disk' | 'built';
  ms: number;
}

export function loadOrBuildCache(verbose = true): LoadResult {
  const t0 = Date.now();

  if (existsSync(CACHE_PATH)) {
    try {
      const bytes = readFileSync(CACHE_PATH);
      const cache = PatternCache.deserialize(bytes, GUESSES, ANSWERS);
      return { cache, source: 'disk', ms: Date.now() - t0 };
    } catch (err) {
      if (verbose) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`cache.bin invalid (${msg}). Rebuilding…`);
      }
    }
  } else if (verbose) {
    console.error('cache.bin not found. Building (~30s)…');
  }

  const cache = PatternCache.build(GUESSES, ANSWERS);
  writeFileSync(CACHE_PATH, cache.serialize());
  return { cache, source: 'built', ms: Date.now() - t0 };
}
