// Pattern cache tests (spec §6).

import { describe, expect, it } from 'vitest';

import { getPattern } from '../src/core/feedback.js';
import { PatternCache } from '../src/core/patternCache.js';

const SMALL_GUESSES = ['salet', 'crane', 'audio', 'eerie', 'llama'];
const SMALL_ANSWERS = ['boost', 'bobby', 'alloy', 'aloft', 'erase', 'eaten'];

describe('PatternCache.build', () => {
  it('returns the same patterns as getPattern for every (g, a) pair', () => {
    const cache = PatternCache.build(SMALL_GUESSES, SMALL_ANSWERS);
    for (let g = 0; g < SMALL_GUESSES.length; g++) {
      for (let a = 0; a < SMALL_ANSWERS.length; a++) {
        expect(cache.get(g, a)).toBe(getPattern(SMALL_GUESSES[g]!, SMALL_ANSWERS[a]!));
      }
    }
  });

  it('exposes word→index maps', () => {
    const cache = PatternCache.build(SMALL_GUESSES, SMALL_ANSWERS);
    expect(cache.guessIndex.get('crane')).toBe(1);
    expect(cache.answerIndex.get('alloy')).toBe(2);
  });

  it('patternFor() looks up by word', () => {
    const cache = PatternCache.build(SMALL_GUESSES, SMALL_ANSWERS);
    expect(cache.patternFor('eerie', 'eaten')).toBe(getPattern('eerie', 'eaten'));
  });

  it('patternFor() throws on unknown words', () => {
    const cache = PatternCache.build(SMALL_GUESSES, SMALL_ANSWERS);
    expect(() => cache.patternFor('zzzzz', 'eaten')).toThrow(/unknown guess/);
    expect(() => cache.patternFor('crane', 'zzzzz')).toThrow(/unknown answer/);
  });
});

describe('PatternCache (de)serialize', () => {
  it('round-trips identically', () => {
    const cache = PatternCache.build(SMALL_GUESSES, SMALL_ANSWERS);
    const bytes = cache.serialize();
    const back = PatternCache.deserialize(bytes, SMALL_GUESSES, SMALL_ANSWERS);
    for (let g = 0; g < SMALL_GUESSES.length; g++) {
      for (let a = 0; a < SMALL_ANSWERS.length; a++) {
        expect(back.get(g, a)).toBe(cache.get(g, a));
      }
    }
  });

  it('rejects mismatched word-list sizes', () => {
    const cache = PatternCache.build(SMALL_GUESSES, SMALL_ANSWERS);
    const bytes = cache.serialize();
    expect(() => PatternCache.deserialize(bytes, SMALL_GUESSES, [...SMALL_ANSWERS, 'extra'])).toThrow(
      /does not match wordlists/,
    );
  });

  it('rejects bad magic header', () => {
    const bad = new Uint8Array(20); // all zeros
    expect(() => PatternCache.deserialize(bad, SMALL_GUESSES, SMALL_ANSWERS)).toThrow(
      /bad magic/,
    );
  });
});
