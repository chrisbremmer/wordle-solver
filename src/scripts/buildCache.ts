// Build & persist the pattern cache to cache.bin (spec §6, §11).
// Run via `npm run build-cache`.

import { existsSync, statSync } from 'node:fs';

import { CACHE_PATH, loadOrBuildCache } from '../cacheLoader.js';

const existed = existsSync(CACHE_PATH);
const { source, ms } = loadOrBuildCache(true);
const sizeMB = statSync(CACHE_PATH).size / (1024 * 1024);

console.log(
  `${existed && source === 'disk' ? 'loaded existing' : 'built'} cache.bin (${sizeMB.toFixed(1)} MB) in ${ms}ms`,
);
