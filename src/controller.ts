// GameController — drives a single game (spec §2, §9).

import { isCandidate } from './core/filter.js';
import type { PatternCache } from './core/patternCache.js';
import { pickBestGuess, type ScorerStrategy } from './core/scorer.js';
import { GameState, normalizeFeedback } from './core/state.js';

export const MAX_TURNS = 6;
const SOLVED = 'GGGGG';

export interface TurnTrace {
  turn: number;
  guess: string;
  feedback: string;
  candidatesAfter: number;
}

export interface GameOutcome {
  solved: boolean;
  guesses: number;
  trace: TurnTrace[];
}

/** Source of feedback for one turn. Returns the 5-char feedback string. */
export type FeedbackSource = (guess: string, turn: number) => Promise<string> | string;

export class GameController {
  constructor(
    private readonly cache: PatternCache,
    private readonly answers: readonly string[],
    private readonly scorer: ScorerStrategy = pickBestGuess,
  ) {}

  async play(getFeedback: FeedbackSource): Promise<GameOutcome> {
    const state = new GameState(this.answers);
    const trace: TurnTrace[] = [];

    while (state.turn <= MAX_TURNS) {
      const guess = this.scorer(state, this.cache);
      const raw = await getFeedback(guess, state.turn);
      const fb = normalizeFeedback(raw);

      if (fb === SOLVED) {
        trace.push({ turn: state.turn, guess, feedback: fb, candidatesAfter: 1 });
        return { solved: true, guesses: state.turn, trace };
      }

      state.applyFeedback(guess, fb);
      state.candidates = state.candidates.filter((w) => isCandidate(w, state));
      trace.push({
        turn: state.turn,
        guess,
        feedback: fb,
        candidatesAfter: state.candidates.length,
      });

      if (state.candidates.length === 0) {
        // The user supplied feedback inconsistent with our answer list, OR
        // the answer is outside our static list. Either way, can't continue.
        return { solved: false, guesses: state.turn, trace };
      }

      state.turn++;
    }

    return { solved: false, guesses: MAX_TURNS, trace };
  }
}
