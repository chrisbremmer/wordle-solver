// One-ply lookahead scorer (spec §13.1).
//
// Result on the full 2,315-answer set, vs plain entropy:
//
//   scorer  avg     max  wins   2  3     4     5    6   wall
//   entropy 3.434   6    100%   79 1224  945   63   4   33s
//   oneply  3.472   6    100%   90 1159  951   114  1   249s
//
// Honest finding: simple one-ply lookahead with an expected-guesses
// heuristic does NOT outperform plain entropy on Wordle. It produces a
// different distribution (more 2-turn wins, fewer 6-turn games, but
// more 5-turn games). Closing the 3.43 → 3.42 gap to the DP-optimal
// solution requires multi-ply / actual DP, which the spec §13.1
// estimate of "~10x slower" understates.
//
// The implementation scores each top-K candidate guess by **expected
// total guesses**:
//   For each top-K guess g and each remaining answer a:
//     - if g == a → 1 turn (this guess IS the answer)
//     - else → 1 (this guess) + best second-turn outcome on g's bucket
//   Minimize the average. The "g == a" case is what gives candidate
//   guesses credit for the chance they ARE the answer.
//
// First implementation used a Σ-of-entropy-bits metric across both turns
// and scored 3.617 / 99.78% (5 outright failures) because bits-of-info
// isn't proportional to turns-to-finish — maximizing total bits favors
// guesses that leave large but splittable buckets, even though landing
// in such a bucket costs a real turn vs landing in a singleton.
//
// Pruning to keep this tractable:
//   - First ply scored on the full guess pool, top-K kept.
//   - Second-ply pool is the top-`secondPoolSize` guesses by first-ply
//     entropy (3blue1brown's shortlist trick).
//   - Plain entropy fallback for turn 1, ≤2 candidates, or turn ≥5 / ≤3
//     candidates (late game, lookahead can't help).

import { ALL_GREEN, NUM_PATTERNS } from './feedback.js';
import { guessPool } from './filter.js';
import type { PatternCache } from './patternCache.js';
import { entropyForGuess, HARDCODED_OPENER, pickBestGuess } from './scorer.js';
import type { GameState } from './state.js';

export interface OnePlyOptions {
  /** Number of first-ply candidates to evaluate with lookahead. Default 8. */
  topK?: number;
  /** Size of the second-ply guess pool (top-N by first-ply entropy). Default 200. */
  secondPoolSize?: number;
}

/**
 * Approx remaining turns once we've narrowed to a bucket of size n with
 * no further info. Empirical fit for Wordle bucket structure:
 *   n=1 → 1, n=2 → 1.5, n=3 → 2, n=5 → 2.5, n=10 → 3.4.
 */
function depthHeuristic(n: number): number {
  if (n <= 1) return n;
  return 1 + Math.log2(n) * 0.85;
}

export function pickBestGuessOnePly(
  state: GameState,
  cache: PatternCache,
  opts: OnePlyOptions = {},
): string {
  const { topK = 8, secondPoolSize = 200 } = opts;

  if (state.turn === 1) return HARDCODED_OPENER;

  const remaining = state.candidates;
  if (remaining.length === 0) throw new Error('pickBestGuessOnePly: no candidates left');
  if (remaining.length <= 2) return remaining[0]!;
  if (remaining.length <= 3 || state.turn >= 5) return pickBestGuess(state, cache);

  const remainingIdx = new Array<number>(remaining.length);
  for (let i = 0; i < remaining.length; i++) {
    const idx = cache.answerIndex.get(remaining[i]!);
    if (idx === undefined) throw new Error(`candidate "${remaining[i]}" not in answer index`);
    remainingIdx[i] = idx;
  }
  const N = remainingIdx.length;
  const candSet = new Set(remaining);

  // First-ply entropy over the allowed pool (normal = full guesses, hard
  // mode = constraint-respecting). The second-ply pool is picked from this
  // same ranking below, so it inherits the hard-mode restriction naturally.
  const pool = guessPool(state, cache);
  const firstPly: Array<{ gIdx: number; h: number }> = new Array(pool.length);
  for (let i = 0; i < pool.length; i++) {
    const gIdx = cache.guessIndex.get(pool[i]!)!;
    firstPly[i] = { gIdx, h: entropyForGuess(gIdx, remainingIdx, cache) };
  }
  firstPly.sort((a, b) => b.h - a.h);

  const topByH = firstPly.slice(0, topK);
  const included = new Set(topByH.map((x) => x.gIdx));
  // Force-include candidate guesses — their "g could be the answer" credit
  // is meaningful and deserves a fair lookahead score.
  for (const c of remaining) {
    const cIdx = cache.guessIndex.get(c);
    if (cIdx !== undefined && !included.has(cIdx)) {
      const found = firstPly.find((x) => x.gIdx === cIdx);
      if (found) topByH.push(found);
      included.add(cIdx);
    }
  }

  const secondPool = firstPly.slice(0, secondPoolSize).map((x) => x.gIdx);

  // Reusable buffers.
  const counts = new Int32Array(NUM_PATTERNS);
  const buckets: number[][] = Array.from({ length: NUM_PATTERNS }, () => []);
  const subCounts = new Int32Array(NUM_PATTERNS);

  let bestGIdx = topByH[0]!.gIdx;
  let bestExpected = Infinity;
  let bestIsCand = candSet.has(cache.guesses[bestGIdx]!);

  for (const t of topByH) {
    counts.fill(0);
    for (let p = 0; p < NUM_PATTERNS; p++) buckets[p]!.length = 0;
    for (let i = 0; i < N; i++) {
      const aIdx = remainingIdx[i]!;
      const p = cache.get(t.gIdx, aIdx);
      counts[p]!++;
      buckets[p]!.push(aIdx);
    }

    // Sum of estimated turns over all answers, given first guess t.
    // Total turns for answer a = 1 (this guess) + extra(bucket of a).
    // extra():
    //   - bucket pattern == ALL_GREEN (t IS the answer for a)  → 0
    //   - bucket of size 1 (we know a)                          → 1
    //   - bucket of size n>1: best second-ply guess g'.
    //     Each a in bucket contributes 1 (for g') + depth(sub-bucket of a),
    //     except the case g' == a (sub-bucket pattern ALL_GREEN), which
    //     contributes 0 instead.
    let extraSum = 0;
    for (let p = 0; p < NUM_PATTERNS; p++) {
      const n = counts[p]!;
      if (n === 0) continue;
      if (p === ALL_GREEN) continue; // contributes 0 per answer
      if (n === 1) {
        extraSum += 1;
        continue;
      }
      const bucket = buckets[p]!;
      let bestInner = Infinity;
      for (let s = 0; s < secondPool.length; s++) {
        const g2 = secondPool[s]!;
        subCounts.fill(0);
        for (let i = 0; i < n; i++) subCounts[cache.get(g2, bucket[i]!)]!++;
        // Sum over answers in bucket of "1 (for g') + depth(sub-bucket)",
        // crediting g'==a as 0.
        let inner = 0;
        for (let pp = 0; pp < NUM_PATTERNS; pp++) {
          const sn = subCounts[pp]!;
          if (sn === 0) continue;
          if (pp === ALL_GREEN) continue; // g2 is the answer for these → 0
          inner += sn * (1 + depthHeuristic(sn));
        }
        if (inner < bestInner) bestInner = inner;
      }
      extraSum += bestInner;
    }

    const expected = 1 + extraSum / N;
    const isCand = candSet.has(cache.guesses[t.gIdx]!);
    if (
      expected < bestExpected ||
      (expected === bestExpected && isCand && !bestIsCand)
    ) {
      bestExpected = expected;
      bestGIdx = t.gIdx;
      bestIsCand = isCand;
    }
  }

  return cache.guesses[bestGIdx]!;
}
