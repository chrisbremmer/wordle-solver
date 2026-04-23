// Spec §5 duplicate-letter cases — the gating tests for the whole solver.
//
// Note: the spec §5 *table* has typos in several "Expected Pattern" entries
// (e.g. claims LLAMA/ALLOY → YY.Y. but the spec's own pseudocode and real
// Wordle both produce YGY.. because LLAMA[1]=L matches ALLOY[1]=L → green).
// We test against the algorithm's correct output, not the table.

import { describe, expect, it } from 'vitest';

import { getPattern, type Pattern } from '../src/core/feedback.js';

/** Build a Pattern from a string like "GG.Y." (position 0 = leftmost). */
function pat(s: string): Pattern {
  if (s.length !== 5) throw new Error(`pat: expected 5 chars, got "${s}"`);
  let p = 0;
  for (let i = 0; i < 5; i++) {
    const ch = s[i];
    const v = ch === 'G' ? 2 : ch === 'Y' ? 1 : ch === '.' ? 0 : -1;
    if (v < 0) throw new Error(`pat: bad char "${ch}"`);
    p += v * 3 ** i;
  }
  return p;
}

describe('getPattern (spec §5)', () => {
  it('BOOKS / BOOST → GGG.Y (no dupe confusion; trailing S yellow)', () => {
    expect(getPattern('books', 'boost')).toBe(pat('GGG.Y'));
  });

  it('BOOKS / BOBBY → GG... (second O grey, only one O in answer)', () => {
    expect(getPattern('books', 'bobby')).toBe(pat('GG...'));
  });

  it('LLAMA / ALLOY → YGY.. (pos 1 L is green; second A has no match)', () => {
    expect(getPattern('llama', 'alloy')).toBe(pat('YGY..'));
  });

  it('LLAMA / ALOFT → .GY.. (pos 1 L green; only one L in answer; A yellow)', () => {
    expect(getPattern('llama', 'aloft')).toBe(pat('.GY..'));
  });

  it('SPEED / ERASE → Y.YY. (left-to-right: pos 2 E claims yellow before pos 3)', () => {
    expect(getPattern('speed', 'erase')).toBe(pat('Y.YY.'));
  });

  it('EERIE / EATEN → GY... (left-to-right: pos 1 E gets the yellow, pos 4 E grey)', () => {
    expect(getPattern('eerie', 'eaten')).toBe(pat('GY...'));
  });
});

describe('getPattern — additional invariants', () => {
  it('identical guess and answer encodes all-green = 242', () => {
    expect(getPattern('crane', 'crane')).toBe(pat('GGGGG'));
    expect(pat('GGGGG')).toBe(242);
  });

  it('completely disjoint encodes all-grey = 0', () => {
    expect(getPattern('abcde', 'fghij')).toBe(0);
  });

  it('every output is in [0, 242]', () => {
    for (const g of ['salet', 'crane', 'audio', 'vivid']) {
      for (const a of ['eerie', 'fluff', 'array', 'mummy']) {
        const p = getPattern(g, a);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(242);
      }
    }
  });
});
