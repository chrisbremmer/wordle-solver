// Share-block formatter tests.

import { describe, expect, it } from 'vitest';

import type { GameOutcome } from '../src/controller.js';
import { feedbackToEmojiRow, formatShare } from '../src/share.js';

describe('feedbackToEmojiRow', () => {
  it('maps G/Y/. to the corresponding emoji', () => {
    expect(feedbackToEmojiRow('GY..G')).toBe('🟩🟨⬛⬛🟩');
    expect(feedbackToEmojiRow('GGGGG')).toBe('🟩🟩🟩🟩🟩');
    expect(feedbackToEmojiRow('.....')).toBe('⬛⬛⬛⬛⬛');
  });

  it('rejects bad length', () => {
    expect(() => feedbackToEmojiRow('GY..')).toThrow();
  });

  it('rejects unknown char', () => {
    expect(() => feedbackToEmojiRow('GYxYG')).toThrow();
  });
});

describe('formatShare', () => {
  const trace = [
    { turn: 1, guess: 'salet', feedback: '.Y...', candidatesAfter: 102 },
    { turn: 2, guess: 'brond', feedback: 'YYY..', candidatesAfter: 2 },
    { turn: 3, guess: 'abhor', feedback: 'GGGGG', candidatesAfter: 1 },
  ];

  it('formats a solved game', () => {
    const outcome: GameOutcome = { solved: true, guesses: 3, trace };
    expect(formatShare(outcome)).toBe(
      'Wordle solver 3/6\n\n⬛🟨⬛⬛⬛\n🟨🟨🟨⬛⬛\n🟩🟩🟩🟩🟩\n',
    );
  });

  it('formats a failed game with X/6', () => {
    const outcome: GameOutcome = {
      solved: false,
      guesses: 6,
      trace: Array.from({ length: 6 }, (_, i) => ({
        turn: i + 1,
        guess: 'salet',
        feedback: '.....',
        candidatesAfter: 1,
      })),
    };
    expect(formatShare(outcome).startsWith('Wordle solver X/6\n\n')).toBe(true);
    expect(formatShare(outcome).match(/⬛/g)?.length).toBe(30); // 6 rows × 5
  });
});
