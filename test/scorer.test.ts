// Scorer tests (spec §8) — entropy correctness + heuristic behaviors.

import { describe, it } from 'vitest';

describe('entropyForGuess (spec §8)', () => {
  it.todo('SALET against the full answer list scores ~5.87 bits');
  it.todo('uniform-bucket guess scores log2(numBuckets)');
  it.todo('single-bucket guess scores 0 bits');
});

describe('pickBestGuess (spec §8)', () => {
  it.todo('returns SALET on turn 1 without scoring');
  it.todo('with ≤2 candidates, returns first candidate');
  it.todo('on turn ≥5, restricts pool to candidates only');
  it.todo('breaks ties toward a guess that is itself a candidate');
});
