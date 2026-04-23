// GameController — orchestrates a single game (spec §2, §9).

import type { PatternCache } from './core/patternCache.js';

export interface GameOutcome {
  solved: boolean;
  guesses: number;
  trace: Array<{ guess: string; feedback: string }>;
}

export class GameController {
  constructor(
    private readonly _cache: PatternCache,
    private readonly _answers: readonly string[],
    private readonly _guesses: readonly string[],
  ) {}

  /**
   * Drive a game where `getFeedback` supplies the pattern for each guess.
   * Used both by the interactive CLI (prompt user) and the benchmark
   * (compute feedback against a known answer). TODO(spec §9).
   */
  async play(_getFeedback: (guess: string, turn: number) => Promise<string>): Promise<GameOutcome> {
    throw new Error('GameController.play: not implemented (spec §9)');
  }
}
