// Filter + state tests (spec §4 + §7).

import { describe, expect, it } from 'vitest';

import { isCandidate } from '../src/core/filter.js';
import { GameState, normalizeFeedback } from '../src/core/state.js';

function freshState(words: readonly string[] = ['crane']): GameState {
  return new GameState(words);
}

describe('normalizeFeedback', () => {
  it('accepts letter form', () => {
    expect(normalizeFeedback('gy..g')).toBe('GY..G');
  });

  it('accepts digit form', () => {
    expect(normalizeFeedback('21002')).toBe('GY..G');
  });

  it('accepts mixed form', () => {
    expect(normalizeFeedback('g1.0G')).toBe('GY..G');
  });

  it('rejects wrong length', () => {
    expect(() => normalizeFeedback('gygy')).toThrow();
  });

  it('rejects unknown chars', () => {
    expect(() => normalizeFeedback('gy?.g')).toThrow();
  });
});

describe('GameState.applyFeedback', () => {
  it('records a green at the right position', () => {
    const s = freshState();
    s.applyFeedback('crane', 'G....');
    expect(s.greens.get(0)).toBe('c');
    expect(s.minCounts.get('c')).toBe(1);
  });

  it('records a yellow with the forbidden position', () => {
    const s = freshState();
    s.applyFeedback('crane', '.Y...');
    expect(s.yellows.get('r')?.has(1)).toBe(true);
    expect(s.minCounts.get('r')).toBe(1);
  });

  it('grey-only letter sets maxCount to 0', () => {
    const s = freshState();
    s.applyFeedback('crane', '.....');
    expect(s.maxCounts.get('c')).toBe(0);
    expect(s.maxCounts.get('e')).toBe(0);
    expect(s.minCounts.get('c') ?? 0).toBe(0);
  });

  it('dup-letter case: EERIE / EATEN learns minCount(E)=2, maxCount(E)=2', () => {
    const s = freshState();
    s.applyFeedback('eerie', 'GY...');
    expect(s.minCounts.get('e')).toBe(2);
    expect(s.maxCounts.get('e')).toBe(2);
    // Pos 4 was a grey-E with E in answer → forbid pos 4.
    expect(s.yellows.get('e')?.has(4)).toBe(true);
    // Pos 1 was yellow → forbid pos 1.
    expect(s.yellows.get('e')?.has(1)).toBe(true);
  });

  it('dup-letter case: LLAMA / ALOFT — only one L, locks maxCount(L)=1', () => {
    const s = freshState();
    // From feedback.test: LLAMA/ALOFT → .GY..  (pos 0 L grey, pos 1 L green, pos 2 A yellow)
    s.applyFeedback('llama', '.GY..');
    expect(s.minCounts.get('l')).toBe(1);
    expect(s.maxCounts.get('l')).toBe(1);
    expect(s.greens.get(1)).toBe('l');
    // Grey L at pos 0 with min(L)=1 → forbid pos 0 too.
    expect(s.yellows.get('l')?.has(0)).toBe(true);
  });

  it('accumulates yellow-forbidden positions across turns', () => {
    const s = freshState();
    s.applyFeedback('crate', '.Y...');
    s.applyFeedback('roast', 'Y....');
    expect(s.yellows.get('r')?.has(1)).toBe(true);
    expect(s.yellows.get('r')?.has(0)).toBe(true);
  });
});

describe('isCandidate (spec §7)', () => {
  it('keeps words matching every green', () => {
    // After "crane" / "G....": c green at 0, r/a/n/e all grey (maxCount=0).
    // Candidate must start with c and contain none of r/a/n/e.
    const s = freshState();
    s.applyFeedback('crane', 'G....');
    expect(isCandidate('chump', s)).toBe(true); // c at 0, no r/a/n/e
    expect(isCandidate('plumb', s)).toBe(false); // no c at pos 0
  });

  it('rejects words missing a yellow letter', () => {
    // After "robin" / "Y....": r yellow at 0, o/b/i/n all grey.
    // Candidate must contain r (not at 0) and none of o/b/i/n.
    const s = freshState();
    s.applyFeedback('robin', 'Y....');
    expect(isCandidate('larky', s)).toBe(true); // r at 2, no o/b/i/n
    expect(isCandidate('myths', s)).toBe(false); // no r
  });

  it('rejects words placing a yellow at a forbidden position', () => {
    // After "robin" / "Y....": r forbidden at pos 0, no o/b/i/n.
    const s = freshState();
    s.applyFeedback('robin', 'Y....');
    expect(isCandidate('rusty', s)).toBe(false); // r at pos 0 → forbidden (also has no o/b/i/n)
  });

  it('respects minCounts (two Es required)', () => {
    const s = freshState();
    s.applyFeedback('eerie', 'GY...');
    expect(isCandidate('eaten', s)).toBe(true);
    expect(isCandidate('crane', s)).toBe(false); // only 1 E
  });

  it('respects maxCounts (only one L allowed)', () => {
    const s = freshState();
    s.applyFeedback('llama', '.GY..');
    expect(isCandidate('alley', s)).toBe(false); // 2 Ls
    expect(isCandidate('aloft', s)).toBe(true); // 1 L
  });

  it('rejects wrong length defensively', () => {
    expect(isCandidate('crow', freshState())).toBe(false);
    expect(isCandidate('cranes', freshState())).toBe(false);
  });
});
