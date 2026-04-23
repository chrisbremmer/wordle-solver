// Wordle-style share-block formatter. Output mirrors what the NYT app puts
// on the clipboard so the user can paste straight into Discord.

import type { GameOutcome, TurnTrace } from './controller.js';

const EMOJI: Record<string, string> = { G: '🟩', Y: '🟨', '.': '⬛' };
export const MAX_TURNS = 6;

/** "GY..G" → "🟩🟨⬛⬛🟩". Asserts each char is G/Y/. */
export function feedbackToEmojiRow(feedback: string): string {
  if (feedback.length !== 5) throw new Error(`feedback must be 5 chars: "${feedback}"`);
  let row = '';
  for (let i = 0; i < 5; i++) {
    const e = EMOJI[feedback[i]!];
    if (!e) throw new Error(`feedback[${i}]: bad char "${feedback[i]}"`);
    row += e;
  }
  return row;
}

/** Header score line: solved → "N/6", failed → "X/6". */
function scoreLine(outcome: GameOutcome): string {
  return `Wordle solver ${outcome.solved ? outcome.guesses : 'X'}/${MAX_TURNS}`;
}

/**
 * Build the full share block. Trailing newline so concatenation is friendly,
 * but no extra blank lines beyond the standard NYT layout (header, blank,
 * one row per turn).
 */
export function formatShare(outcome: GameOutcome): string {
  const rows = outcome.trace.map((t: TurnTrace) => feedbackToEmojiRow(t.feedback));
  return `${scoreLine(outcome)}\n\n${rows.join('\n')}\n`;
}
