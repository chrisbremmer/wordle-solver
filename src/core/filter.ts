// Candidate filter — see spec §7.
//
// Use minCounts/maxCounts (NOT a simple grey set) to handle duplicates
// correctly. "Grey" really means "no more occurrences of this letter than
// already accounted for by greens/yellows in the same guess."

import type { GameState } from './state.js';

/**
 * TODO(spec §7): true if `word` is consistent with every constraint in state.
 */
export function isCandidate(_word: string, _state: GameState): boolean {
  throw new Error('isCandidate: not implemented (spec §7)');
}
