// CRITICAL — duplicate-letter cases from spec §5. These tests MUST pass
// before the rest of the solver can be trusted. Implement getPattern(), then
// flip these from .todo to real assertions.

import { describe, it } from 'vitest';

describe('getPattern (spec §5)', () => {
  // Each case: [guess, answer, expected pattern string at positions 0..4].
  // Encoding when implemented: pattern = p0 + p1*3 + p2*9 + p3*27 + p4*81.

  it.todo('BOOKS / BOOST → GG.GG (no dupe confusion)');
  it.todo('BOOKS / BOBBY → GG... (second O grey, only one O in answer)');
  it.todo('LLAMA / ALLOY → YY.Y. (two Ls; both yellow because answer has two)');
  it.todo('LLAMA / ALOFT → Y.... (two Ls but answer has one; second L grey)');
  it.todo('SPEED / ERASE → .Y.YY (two Es each; positions differ)');
  it.todo('EERIE / EATEN → G...Y (three Es vs two; first green, last yellow, middle grey)');
});
