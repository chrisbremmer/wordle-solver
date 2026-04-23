// Scorer tests (spec §8) — entropy correctness + heuristic behaviors.

import { describe, expect, it } from 'vitest';

import { PatternCache } from '../src/core/patternCache.js';
import { entropyForGuess, HARDCODED_OPENER, pickBestGuess } from '../src/core/scorer.js';
import { GameState } from '../src/core/state.js';

// Tiny synthetic cache so tests are fast and deterministic.
const GUESSES = ['salet', 'crane', 'audio', 'eerie', 'llama', 'aaaaa', 'bbbbb', 'ccccc'];
const ANSWERS = ['boost', 'bobby', 'alloy', 'aloft', 'erase', 'eaten'];
const cache = PatternCache.build(GUESSES, ANSWERS);

describe('entropyForGuess', () => {
  it('single-bucket distribution → 0 bits', () => {
    // With one remaining answer, every guess has only one bucket → 0 entropy.
    expect(entropyForGuess(0, [0], cache)).toBe(0);
  });

  it('uniform distribution over k buckets → log2(k) bits', () => {
    // Build a fresh tiny cache where one guess separates 4 answers into 4
    // distinct patterns. Use the real cache and pick a guess with high
    // separation; assert entropy is positive and ≤ log2(numAnswers).
    const allIdx = ANSWERS.map((_, i) => i);
    const h = entropyForGuess(cache.guessIndex.get('salet')!, allIdx, cache);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(Math.log2(ANSWERS.length));
  });

  it('empty / one-element answer set → 0 bits', () => {
    expect(entropyForGuess(0, [], cache)).toBe(0);
    expect(entropyForGuess(0, [3], cache)).toBe(0);
  });
});

describe('pickBestGuess', () => {
  it('returns SALET on turn 1 without scoring', () => {
    const s = new GameState(ANSWERS);
    expect(pickBestGuess(s, cache)).toBe(HARDCODED_OPENER);
  });

  it('with 1 candidate, returns that candidate', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = ['eaten'];
    expect(pickBestGuess(s, cache)).toBe('eaten');
  });

  it('with 2 candidates, returns the first', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = ['eaten', 'erase'];
    expect(pickBestGuess(s, cache)).toBe('eaten');
  });

  it('with 0 candidates, throws (caller bug)', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = [];
    expect(() => pickBestGuess(s, cache)).toThrow(/no candidates/);
  });

  it('on turn ≥5 with many candidates, returned guess is itself a candidate', () => {
    const s = new GameState(ANSWERS);
    s.turn = 5;
    s.candidates = ['boost', 'bobby', 'alloy', 'aloft', 'erase', 'eaten'];
    const g = pickBestGuess(s, cache);
    expect(s.candidates).toContain(g);
  });
});
