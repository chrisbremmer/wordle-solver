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
 * Two-pass scoring per spec §5: greens first (consuming answer slots),
 * then yellows against unconsumed slots. Returns the base-3 pattern.
 *
 * Both inputs must be 5 lowercase ASCII letters.
 */
export function getPattern(guess: string, answer: string): Pattern {
  // 0 = grey, 1 = yellow, 2 = green
  const r = [0, 0, 0, 0, 0];
  const used = [false, false, false, false, false];

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      r[i] = 2;
      used[i] = true;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (r[i] === 2) continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === answer[j]) {
        r[i] = 1;
        used[j] = true;
        break;
      }
    }
  }

  return r[0]! + r[1]! * 3 + r[2]! * 9 + r[3]! * 27 + r[4]! * 81;
}
