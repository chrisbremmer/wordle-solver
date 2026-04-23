// GameState — see spec §4 + §7.
//
// Greys are modeled via maxCounts (NOT a flat grey set). When letter L is
// grey at position p but green/yellow elsewhere in the same guess, the grey
// signal means "no more L than already accounted for" and "L is not at p".

/**
 * Normalize a 5-char feedback string into G/Y/. form. Accepts:
 *   "gy..g" | "GY..G"   (letters)
 *   "21002"             (digits: 2=green, 1=yellow, 0=grey)
 *   mixed forms         (e.g. "gy0.g")
 */
export function normalizeFeedback(input: string): string {
  if (input.length !== 5) {
    throw new Error(`feedback must be 5 chars, got "${input}" (${input.length})`);
  }
  let out = '';
  for (let i = 0; i < 5; i++) {
    const ch = input[i]!.toLowerCase();
    if (ch === 'g' || ch === '2') out += 'G';
    else if (ch === 'y' || ch === '1') out += 'Y';
    else if (ch === '.' || ch === '0' || ch === '-') out += '.';
    else throw new Error(`feedback[${i}]: unrecognized char "${ch}"`);
  }
  return out;
}

export class GameState {
  greens: Map<number, string> = new Map();
  yellows: Map<string, Set<number>> = new Map();
  minCounts: Map<string, number> = new Map();
  maxCounts: Map<string, number> = new Map();
  turn = 1;
  candidates: string[];

  constructor(initialCandidates: readonly string[]) {
    this.candidates = [...initialCandidates];
  }

  /**
   * Apply one turn of feedback. `guess` is 5 lowercase letters; `feedback`
   * is a 5-char string in any form accepted by normalizeFeedback.
   */
  applyFeedback(guess: string, feedback: string): void {
    if (guess.length !== 5) throw new Error(`guess must be 5 chars: "${guess}"`);
    const fb = normalizeFeedback(feedback);

    // Per-letter counts within this guess.
    const greenN = new Map<string, number>();
    const yellowN = new Map<string, number>();
    const greyN = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      const L = guess[i]!;
      const m = fb[i]!;
      const tgt = m === 'G' ? greenN : m === 'Y' ? yellowN : greyN;
      tgt.set(L, (tgt.get(L) ?? 0) + 1);
    }

    // Update min/max counts per unique letter.
    const seen = new Set<string>([...greenN.keys(), ...yellowN.keys(), ...greyN.keys()]);
    for (const L of seen) {
      const known = (greenN.get(L) ?? 0) + (yellowN.get(L) ?? 0);
      if (known > (this.minCounts.get(L) ?? 0)) this.minCounts.set(L, known);
      if ((greyN.get(L) ?? 0) > 0) {
        // Grey for L locks the upper bound at exactly the known count.
        const prev = this.maxCounts.get(L) ?? 5;
        if (known < prev) this.maxCounts.set(L, known);
      }
    }

    // Per-position updates.
    for (let i = 0; i < 5; i++) {
      const L = guess[i]!;
      const m = fb[i]!;
      if (m === 'G') {
        this.greens.set(i, L);
      } else if (m === 'Y') {
        this.addYellowForbidden(L, i);
      } else {
        // m === '.': only forbid this position if L is known to be in the answer.
        if ((this.minCounts.get(L) ?? 0) > 0) this.addYellowForbidden(L, i);
      }
    }
  }

  private addYellowForbidden(letter: string, pos: number): void {
    let s = this.yellows.get(letter);
    if (!s) {
      s = new Set();
      this.yellows.set(letter, s);
    }
    s.add(pos);
  }
}
