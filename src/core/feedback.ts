// Feedback scoring — see spec §5.
//
// CRITICAL: Wordle's duplicate-letter rules are the #1 source of bugs. The
// two-pass algorithm (greens first, then yellows against unconsumed letters)
// is mandatory. Test cases in test/feedback.test.ts MUST pass before any
// other module is wired up.

/**
 * Base-3 encoded feedback pattern.
 *
 * Per position: 0 = grey, 1 = yellow, 2 = green.
 * Position 0 is least significant: pattern = p0 + p1*3 + p2*9 + p3*27 + p4*81.
 * Range: 0..242 inclusive — fits in a single byte.
 */
export type Pattern = number;

export const NUM_PATTERNS = 243;

/** All-green sentinel (solved). */
export const ALL_GREEN: Pattern = 2 + 2 * 3 + 2 * 9 + 2 * 27 + 2 * 81;

/**
 * TODO(spec §5): two-pass implementation.
 *   Pass 1: mark greens, mark answer slots as consumed.
 *   Pass 2: mark yellows against unconsumed answer slots only.
 * Returns base-3 encoded pattern (0..242).
 */
export function getPattern(_guess: string, _answer: string): Pattern {
  throw new Error('getPattern: not implemented (spec §5)');
}
