// Frequency-heuristic scorer (spec §13.4 league baseline).
//
// Score each guess by the sum of *unique-letter* frequencies across remaining
// candidate answers — i.e. "how many candidate words contain at least one of
// these letters." This was the dominant pre-information-theory heuristic.
// Spec §1 quotes ~3.7 avg as the realistic ceiling; included here so the
// league has a non-information-theoretic baseline to compare against.
//
// Letters are deduplicated within the guess (no double credit for `BOOKS`'
// two Os) and within each candidate (a candidate with one O contributes 1 to
// the O bucket whether the candidate has 1 or 3 Os).

import type { PatternCache } from './patternCache.js';
import { pickBestGuess } from './scorer.js';
import type { GameState } from './state.js';

export const FREQUENCY_OPENER = 'arose';

function scoreGuess(guess: string, letterCounts: Map<string, number>): number {
  let s = 0;
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const ch = guess[i]!;
    if (seen.has(ch)) continue;
    seen.add(ch);
    s += letterCounts.get(ch) ?? 0;
  }
  return s;
}

export function pickBestGuessFrequency(state: GameState, cache: PatternCache): string {
  if (state.turn === 1) return FREQUENCY_OPENER;

  const remaining = state.candidates;
  if (remaining.length === 0) throw new Error('pickBestGuessFrequency: no candidates left');
  if (remaining.length <= 2) return remaining[0]!;
  // Endgame falls back to entropy — same rationale as the other scorers.
  if (remaining.length <= 3 || state.turn >= 5) return pickBestGuess(state, cache);

  // Letter freq across candidate set, deduped within each candidate.
  const counts = new Map<string, number>();
  for (const w of remaining) {
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const ch = w[i]!;
      if (seen.has(ch)) continue;
      seen.add(ch);
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
  }

  const candSet = new Set(remaining);
  let bestGuess = cache.guesses[0]!;
  let bestScore = -1;
  let bestIsCand = candSet.has(bestGuess);

  for (const guess of cache.guesses) {
    const s = scoreGuess(guess, counts);
    const isCand = candSet.has(guess);
    if (s > bestScore || (s === bestScore && isCand && !bestIsCand)) {
      bestScore = s;
      bestGuess = guess;
      bestIsCand = isCand;
    }
  }
  return bestGuess;
}
