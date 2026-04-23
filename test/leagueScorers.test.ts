// Smoke tests for the frequency + minimax scorers (spec §13.4).

import { describe, expect, it } from 'vitest';

import { FREQUENCY_OPENER, pickBestGuessFrequency } from '../src/core/frequencyScorer.js';
import { MINIMAX_OPENER, pickBestGuessMinimax } from '../src/core/minimaxScorer.js';
import { PatternCache } from '../src/core/patternCache.js';
import { GameState } from '../src/core/state.js';

const ANSWERS = ['boost', 'bobby', 'alloy', 'aloft', 'erase', 'eaten'];
const GUESSES = [
  'salet', 'crane', 'audio', 'eerie', 'llama',
  'arose', 'serai',
  ...ANSWERS,
];
const cache = PatternCache.build(GUESSES, ANSWERS);

describe('pickBestGuessFrequency', () => {
  it('returns the hardcoded opener on turn 1', () => {
    expect(pickBestGuessFrequency(new GameState(ANSWERS), cache)).toBe(FREQUENCY_OPENER);
  });

  it('with ≤2 candidates returns the first', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = ['eaten', 'erase'];
    expect(pickBestGuessFrequency(s, cache)).toBe('eaten');
  });

  it('throws when no candidates remain', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = [];
    expect(() => pickBestGuessFrequency(s, cache)).toThrow(/no candidates/);
  });

  it('mid-game returns a word from the guess pool', () => {
    const s = new GameState(ANSWERS);
    s.turn = 2;
    s.candidates = [...ANSWERS];
    const g = pickBestGuessFrequency(s, cache);
    expect(GUESSES).toContain(g);
  });
});

describe('pickBestGuessMinimax', () => {
  it('returns the hardcoded opener on turn 1', () => {
    expect(pickBestGuessMinimax(new GameState(ANSWERS), cache)).toBe(MINIMAX_OPENER);
  });

  it('with ≤2 candidates returns the first', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = ['eaten', 'erase'];
    expect(pickBestGuessMinimax(s, cache)).toBe('eaten');
  });

  it('mid-game returns a word from the guess pool', () => {
    const s = new GameState(ANSWERS);
    s.turn = 2;
    s.candidates = [...ANSWERS];
    const g = pickBestGuessMinimax(s, cache);
    expect(GUESSES).toContain(g);
  });

  it('on turn ≥5 falls back to entropy (returns a candidate)', () => {
    const s = new GameState(ANSWERS);
    s.turn = 5;
    s.candidates = [...ANSWERS];
    const g = pickBestGuessMinimax(s, cache);
    expect(s.candidates).toContain(g);
  });
});
