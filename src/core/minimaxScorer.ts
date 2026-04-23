// Minimax scorer (spec §13.4 league baseline).
//
// For each candidate guess g, the worst case is the largest bucket g splits
// remaining answers into — landing in that bucket means we still have to
// discriminate among the most candidates. Pick the guess minimizing that
// worst case. The spec quotes ~3.5 avg, slightly worse than entropy because
// optimizing the worst case sacrifices average performance on the easy splits.

import { ALL_GREEN, NUM_PATTERNS } from './feedback.js';
import type { PatternCache } from './patternCache.js';
import { pickBestGuess } from './scorer.js';
import type { GameState } from './state.js';

export const MINIMAX_OPENER = 'serai';

function maxBucketSize(
  guessIdx: number,
  remainingAnswerIdx: readonly number[],
  cache: PatternCache,
): { maxSize: number; allGreenSeen: boolean } {
  const counts = new Int32Array(NUM_PATTERNS);
  for (let i = 0; i < remainingAnswerIdx.length; i++) {
    counts[cache.get(guessIdx, remainingAnswerIdx[i]!)]!++;
  }
  let maxSize = 0;
  for (let p = 0; p < NUM_PATTERNS; p++) {
    if (counts[p]! > maxSize) maxSize = counts[p]!;
  }
  return { maxSize, allGreenSeen: counts[ALL_GREEN]! > 0 };
}

export function pickBestGuessMinimax(state: GameState, cache: PatternCache): string {
  if (state.turn === 1) return MINIMAX_OPENER;

  const remaining = state.candidates;
  if (remaining.length === 0) throw new Error('pickBestGuessMinimax: no candidates left');
  if (remaining.length <= 2) return remaining[0]!;
  if (remaining.length <= 3 || state.turn >= 5) return pickBestGuess(state, cache);

  const remainingIdx = new Array<number>(remaining.length);
  for (let i = 0; i < remaining.length; i++) {
    const idx = cache.answerIndex.get(remaining[i]!);
    if (idx === undefined) throw new Error(`candidate "${remaining[i]}" not in answer index`);
    remainingIdx[i] = idx;
  }

  const candSet = new Set(remaining);
  let bestGuess = cache.guesses[0]!;
  let bestMax = Infinity;
  let bestIsCand = candSet.has(bestGuess);

  for (let g = 0; g < cache.guesses.length; g++) {
    const { maxSize, allGreenSeen } = maxBucketSize(g, remainingIdx, cache);
    // Tiebreak: prefer guesses that are themselves candidates (the all-green
    // bucket is the win condition, smaller worst case if guess IS the answer).
    const isCand = candSet.has(cache.guesses[g]!);
    const tied = maxSize === bestMax;
    if (
      maxSize < bestMax ||
      (tied && isCand && !bestIsCand) ||
      (tied && allGreenSeen && isCand && !bestIsCand)
    ) {
      bestMax = maxSize;
      bestGuess = cache.guesses[g]!;
      bestIsCand = isCand;
    }
  }
  return bestGuess;
}
