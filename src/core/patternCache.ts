// Pattern cache — see spec §6.
//
// Precomputes getPattern(guess, answer) for every (guess, answer) pair as a
// flat Uint8Array. Size: |guesses| × |answers| bytes (~34MB for full lists).
// Built once on startup or loaded from disk via cache.bin.

import type { Pattern } from './feedback.js';

export class PatternCache {
  // TODO(spec §6): private data: Uint8Array; private numAnswers: number;

  constructor(_guesses: readonly string[], _answers: readonly string[]) {
    throw new Error('PatternCache: not implemented (spec §6)');
  }

  get(_guessIdx: number, _answerIdx: number): Pattern {
    throw new Error('PatternCache.get: not implemented (spec §6)');
  }

  /** Serialize to a Buffer suitable for fs.writeFile (cache.bin). */
  serialize(): Uint8Array {
    throw new Error('PatternCache.serialize: not implemented (spec §6)');
  }

  /** Inverse of serialize(); reconstruct from disk bytes. */
  static deserialize(
    _bytes: Uint8Array,
    _numGuesses: number,
    _numAnswers: number,
  ): PatternCache {
    throw new Error('PatternCache.deserialize: not implemented (spec §6)');
  }
}
