// Entropy scorer — see spec §8.
//
// Heuristics that matter:
//   - Hardcoded SALET opener (turn 1)
//   - With ≤2 candidates remaining, just guess one (50/50 is worth it)
//   - Late turn (≥5) or ≤3 candidates: only score from candidate pool
//   - Tiebreaker: equal-entropy guesses prefer one in the candidate set

import type { PatternCache } from './patternCache.js';
import type { GameState } from './state.js';

export const HARDCODED_OPENER = 'salet';

/**
 * Shannon entropy in bits over the bucket distribution that `guess` would
 * induce on the remaining answer set. TODO(spec §8).
 */
export function entropyForGuess(
  _guessIdx: number,
  _remainingAnswerIndices: readonly number[],
  _cache: PatternCache,
): number {
  throw new Error('entropyForGuess: not implemented (spec §8)');
}

/**
 * Pick the next guess. TODO(spec §8): apply opener, endgame, late-turn, and
 * tiebreaker rules; otherwise scan the full guess pool for the max-entropy
 * choice.
 */
export function pickBestGuess(_state: GameState, _cache: PatternCache): string {
  throw new Error('pickBestGuess: not implemented (spec §8)');
}
