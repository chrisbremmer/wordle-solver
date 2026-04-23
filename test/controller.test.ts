// GameController tests (spec §2 + §9). Drives a game from a known answer
// using the cache to compute feedback on the fly — same approach the
// benchmark uses.

import { describe, expect, it } from 'vitest';

import { getPattern } from '../src/core/feedback.js';
import { PatternCache } from '../src/core/patternCache.js';
import { GameController } from '../src/controller.js';

// Tiny synthetic universe so the test is fast and deterministic.
const ANSWERS = ['boost', 'bobby', 'alloy', 'aloft', 'erase', 'eaten'];
const GUESSES = [
  'salet', // hardcoded opener
  'crane',
  'audio',
  'eerie',
  'llama',
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

describe('GameController.play', () => {
  it.each(ANSWERS)('solves "%s" within MAX_TURNS', async (answer) => {
    const controller = new GameController(cache, ANSWERS);
    const outcome = await controller.play((guess) =>
      patternToFeedback(getPattern(guess, answer)),
    );
    expect(outcome.solved).toBe(true);
    expect(outcome.guesses).toBeLessThanOrEqual(6);
    // Last trace entry must be the all-green winning guess.
    expect(outcome.trace.at(-1)?.feedback).toBe('GGGGG');
    expect(outcome.trace.at(-1)?.guess).toBe(answer);
  });

  it('reports failure with empty trace if feedback is inconsistent', async () => {
    const controller = new GameController(cache, ANSWERS);
    // Always-grey feedback is consistent with no answer in the list, so
    // candidates collapse to 0 after turn 2 (some letters in salet appear).
    const outcome = await controller.play(() => '.....');
    expect(outcome.solved).toBe(false);
    expect(outcome.trace.length).toBeGreaterThanOrEqual(1);
  });
});
