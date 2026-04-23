// Candidate filter — see spec §7.

import type { PatternCache } from './patternCache.js';
import type { GameState } from './state.js';

/** True if `word` is consistent with every constraint accumulated in state. */
export function isCandidate(word: string, state: GameState): boolean {
  if (word.length !== 5) return false;

  for (const [pos, L] of state.greens) {
    if (word[pos] !== L) return false;
  }

  for (const [L, forbidden] of state.yellows) {
    for (const pos of forbidden) {
      if (word[pos] === L) return false;
    }
  }

  if (state.minCounts.size > 0 || state.maxCounts.size > 0) {
    const counts = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      const L = word[i]!;
      counts.set(L, (counts.get(L) ?? 0) + 1);
    }
    for (const [L, min] of state.minCounts) {
      if ((counts.get(L) ?? 0) < min) return false;
    }
    for (const [L, max] of state.maxCounts) {
      if ((counts.get(L) ?? 0) > max) return false;
    }
  }

  return true;
}

/**
 * The set of guesses a scorer is allowed to consider this turn.
 *   - Normal mode: the full guess pool (all 12,972).
 *   - Hard Mode: guesses that satisfy every known constraint.
 * Returned as a readonly array; scorers iterate this directly.
 */
export function guessPool(state: GameState, cache: PatternCache): readonly string[] {
  if (!state.hardMode) return cache.guesses;
  const out: string[] = [];
  for (const g of cache.guesses) {
    if (isCandidate(g, state)) out.push(g);
  }
  return out;
}
