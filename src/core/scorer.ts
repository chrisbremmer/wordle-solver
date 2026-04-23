// Entropy scorer — see spec §8.

import { NUM_PATTERNS } from './feedback.js';
import type { PatternCache } from './patternCache.js';
import type { GameState } from './state.js';

export const HARDCODED_OPENER = 'salet';

const LOG2 = Math.log(2);

/**
 * Shannon entropy (in bits) over the bucket distribution that `guess` would
 * induce on the given answer subset. Higher = more information per turn.
 */
export function entropyForGuess(
  guessIdx: number,
  remainingAnswerIndices: readonly number[],
  cache: PatternCache,
): number {
  const total = remainingAnswerIndices.length;
  if (total <= 1) return 0;
  const buckets = new Int32Array(NUM_PATTERNS);
  for (let i = 0; i < total; i++) {
    buckets[cache.get(guessIdx, remainingAnswerIndices[i]!)]!++;
  }
  let h = 0;
  for (let i = 0; i < NUM_PATTERNS; i++) {
    const n = buckets[i]!;
    if (n === 0) continue;
    const p = n / total;
    h -= p * (Math.log(p) / LOG2);
  }
  return h;
}

/**
 * Pick the next guess. Heuristics, in order:
 *   1. Turn 1 → hardcoded SALET (saves the ~2s opener computation).
 *   2. ≤2 candidates → guess one (50/50 is worth taking; can't outdo it).
 *   3. Turn ≥5 OR ≤3 candidates → restrict scoring pool to candidates only
 *      (a max-info probe doesn't help when you can't afford a wasted turn).
 *   4. Otherwise scan the full guess pool for max entropy. Tiebreak toward
 *      a guess that is itself in the candidate set — it might be the answer.
 */
export function pickBestGuess(state: GameState, cache: PatternCache): string {
  if (state.turn === 1) return HARDCODED_OPENER;

  const remaining = state.candidates;
  if (remaining.length === 0) {
    throw new Error('pickBestGuess: no candidates left');
  }
  if (remaining.length <= 2) return remaining[0]!;

  // Convert remaining candidate words to answer indices once.
  const remainingIdx: number[] = new Array(remaining.length);
  for (let i = 0; i < remaining.length; i++) {
    const idx = cache.answerIndex.get(remaining[i]!);
    if (idx === undefined) {
      throw new Error(`pickBestGuess: candidate "${remaining[i]}" not in answer index`);
    }
    remainingIdx[i] = idx;
  }

  const preferCandidate = state.turn >= 5 || remaining.length <= 3;
  const pool = preferCandidate ? remaining : cache.guesses;
  const candidateSet = preferCandidate ? null : new Set(remaining);

  let bestGuess = pool[0]!;
  let bestScore = -Infinity;
  let bestIsCandidate = preferCandidate ? true : candidateSet!.has(bestGuess);

  for (const guess of pool) {
    const gIdx = cache.guessIndex.get(guess);
    if (gIdx === undefined) continue; // shouldn't happen for cache.guesses
    const score = entropyForGuess(gIdx, remainingIdx, cache);
    const isCand = preferCandidate ? true : candidateSet!.has(guess);
    if (
      score > bestScore ||
      (score === bestScore && isCand && !bestIsCandidate)
    ) {
      bestGuess = guess;
      bestScore = score;
      bestIsCandidate = isCand;
    }
  }
  return bestGuess;
}
