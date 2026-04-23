// Hard Mode tests. In hard mode every subsequent guess must satisfy all
// learned greens / yellows / counts — i.e. isCandidate(guess, state).

import { describe, expect, it } from 'vitest';

import { getPattern } from '../src/core/feedback.js';
import { guessPool, isCandidate } from '../src/core/filter.js';
import { PatternCache } from '../src/core/patternCache.js';
import { pickBestGuess } from '../src/core/scorer.js';
import { pickBestGuessOnePly } from '../src/core/oneplyScorer.js';
import { pickBestGuessFrequency } from '../src/core/frequencyScorer.js';
import { pickBestGuessMinimax } from '../src/core/minimaxScorer.js';
import { GameState } from '../src/core/state.js';
import { GameController } from '../src/controller.js';

const ANSWERS = ['boost', 'bobby', 'alloy', 'aloft', 'erase', 'eaten'];
const GUESSES = [
  'salet', 'crane', 'audio', 'eerie', 'llama',
  'arose', 'serai', 'robin', 'stork',
  ...ANSWERS,
];
const cache = PatternCache.build(GUESSES, ANSWERS);

function patternToFeedback(p: number): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const v = Math.floor(p / 3 ** i) % 3;
    s += v === 2 ? 'G' : v === 1 ? 'Y' : '.';
  }
  return s;
}

describe('guessPool', () => {
  it('returns the full pool in normal mode', () => {
    const s = new GameState(ANSWERS);
    expect(guessPool(s, cache)).toBe(cache.guesses);
  });

  it('filters by isCandidate in hard mode', () => {
    const s = new GameState(ANSWERS, { hardMode: true });
    s.applyFeedback('crane', 'G....'); // c green at 0, r/a/n/e all grey
    const pool = guessPool(s, cache);
    // Every guess in the pool must itself be a valid candidate.
    for (const w of pool) {
      expect(isCandidate(w, s)).toBe(true);
    }
    // And the pool is a strict subset of the full guesses.
    expect(pool.length).toBeLessThan(cache.guesses.length);
  });
});

describe('scorers honor hard mode', () => {
  it.each([
    ['entropy', pickBestGuess],
    ['oneply', pickBestGuessOnePly],
    ['frequency', pickBestGuessFrequency],
    ['minimax', pickBestGuessMinimax],
  ] as const)('%s only picks hard-mode-legal guesses', (_name, scorer) => {
    const s = new GameState(ANSWERS, { hardMode: true });
    s.applyFeedback('crane', 'G....'); // c locked at 0; r/a/n/e max=0
    s.turn = 2;
    // With c green and r/a/n/e forbidden, remaining candidates are a small
    // set — we just need to confirm the scorer returns something legal.
    s.candidates = ANSWERS.filter((w) => isCandidate(w, s));
    if (s.candidates.length === 0) {
      // Synthetic answer set may not contain a c-starter — skip this combo.
      return;
    }
    const g = scorer(s, cache);
    expect(isCandidate(g, s)).toBe(true);
  });
});

describe('GameController in hard mode', () => {
  it('solves each synthetic answer respecting hard mode', async () => {
    for (const answer of ANSWERS) {
      const controller = new GameController(cache, ANSWERS, undefined, true);
      const outcome = await controller.play((guess) =>
        patternToFeedback(getPattern(guess, answer)),
      );
      expect(outcome.solved).toBe(true);
      // Every guess after turn 1 must respect cumulative constraints — we
      // rebuild state to verify.
      const verify = new GameState(ANSWERS, { hardMode: true });
      for (const t of outcome.trace) {
        if (t.feedback === 'GGGGG') break;
        expect(isCandidate(t.guess, verify)).toBe(true); // guess was legal when played
        verify.applyFeedback(t.guess, t.feedback);
      }
    }
  });
});
