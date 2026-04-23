// One-ply scorer tests (spec §13.1). Smoke tests + behavioral coverage.

import { describe, expect, it } from 'vitest';

import { PatternCache } from '../src/core/patternCache.js';
import { pickBestGuessOnePly } from '../src/core/oneplyScorer.js';
import { HARDCODED_OPENER } from '../src/core/scorer.js';
import { GameState } from '../src/core/state.js';

const ANSWERS = ['boost', 'bobby', 'alloy', 'aloft', 'erase', 'eaten'];
const GUESSES = ['salet', 'crane', 'audio', 'eerie', 'llama', 'aaaaa', 'bbbbb', 'ccccc', ...ANSWERS];
const cache = PatternCache.build(GUESSES, ANSWERS);

describe('pickBestGuessOnePly', () => {
  it('returns SALET on turn 1 (delegates to fast path)', () => {
    const s = new GameState(ANSWERS);
    expect(pickBestGuessOnePly(s, cache)).toBe(HARDCODED_OPENER);
  });

  it('with ≤2 candidates returns the first', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = ['eaten', 'erase'];
    expect(pickBestGuessOnePly(s, cache)).toBe('eaten');
  });

  it('on turn ≥5 falls back to entropy (returns a candidate)', () => {
    const s = new GameState(ANSWERS);
    s.turn = 5;
    s.candidates = [...ANSWERS];
    const g = pickBestGuessOnePly(s, cache);
    expect(s.candidates).toContain(g);
  });

  it('throws when no candidates remain', () => {
    const s = new GameState(ANSWERS);
    s.turn = 3;
    s.candidates = [];
    expect(() => pickBestGuessOnePly(s, cache)).toThrow(/no candidates/);
  });

  it('mid-game (turn 2, many candidates) returns a guess in the pool', () => {
    const s = new GameState(ANSWERS);
    s.turn = 2;
    s.candidates = [...ANSWERS]; // 6 candidates triggers lookahead path
    const g = pickBestGuessOnePly(s, cache, { topK: 3, secondPoolSize: 5 });
    expect(GUESSES).toContain(g);
  });
});
