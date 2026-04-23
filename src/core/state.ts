// GameState — see spec §4.
//
// Tracks all constraints learned across turns. Crucial detail: greys are
// modeled via maxCounts, NOT a flat grey set, because a "grey" in one
// position can still permit the letter elsewhere when it appears multiple
// times in the guess.

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
   * TODO(spec §4, §7): apply a feedback string ("gy..g" or "21002") for the
   * given guess, updating greens/yellows/minCounts/maxCounts.
   */
  applyFeedback(_guess: string, _feedback: string): void {
    throw new Error('GameState.applyFeedback: not implemented (spec §4)');
  }
}
