// Integration benchmark (spec §10). Plays all answers; asserts:
//   - avg < 3.50 (target ~3.43)
//   - max ≤ 6 (no losses)
//   - win rate = 100%
// Logs any game ≥5 guesses for inspection. Test timeout is bumped because
// the full set takes ~30s on a typical laptop.

import { describe, expect, it } from 'vitest';

import { loadOrBuildCache } from '../src/cacheLoader.js';
import { ANSWERS } from '../src/data/answers.js';
import { runBenchmark } from '../src/scripts/benchmarkLib.js';

describe('integration benchmark (spec §10)', () => {
  it(
    'plays all answers with avg < 3.50, max ≤ 6, 100% win rate',
    { timeout: 180_000 },
    async () => {
      const { cache } = loadOrBuildCache(false);
      const report = await runBenchmark(cache, ANSWERS, ANSWERS);

      // eslint-disable-next-line no-console
      console.log(
        `  benchmark: avg=${report.avgGuesses.toFixed(3)}  max=${report.maxGuesses}  win=${(
          report.winRate * 100
        ).toFixed(2)}%  hard=${report.hardGames.length}`,
      );

      expect(report.winRate).toBe(1);
      expect(report.maxGuesses).toBeLessThanOrEqual(6);
      expect(report.avgGuesses).toBeLessThan(3.5);
    },
  );
});
