// Interactive CLI — see spec §9.
//
// Each turn: print the suggested guess, prompt for feedback in either
// "gy..g" or "21002" form, then print remaining-candidate count. Stops on
// all-green or when state.candidates becomes empty (typed wrong feedback?).

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { loadOrBuildCache } from './cacheLoader.js';
import { GameController } from './controller.js';
import { ANSWERS } from './data/answers.js';
import { writeLog } from './log.js';

export async function playInteractive(): Promise<void> {
  const { cache, source, ms } = loadOrBuildCache();
  console.error(`cache: ${source} (${ms}ms)`);
  console.error('feedback format: G=green, Y=yellow, .=grey  (or 2/1/0). e.g. "gy..g"\n');

  const rl = createInterface({ input: stdin, output: stdout });
  const controller = new GameController(cache, ANSWERS);

  try {
    const outcome = await controller.play(async (guess, turn) => {
      const ans = await rl.question(`Turn ${turn}: guess "${guess.toUpperCase()}" → `);
      return ans.trim();
    });

    if (outcome.solved) {
      console.log(`\nSolved in ${outcome.guesses} guess${outcome.guesses === 1 ? '' : 'es'}.`);
    } else if (outcome.trace.at(-1)?.candidatesAfter === 0) {
      console.log('\nNo candidates remain — answer may not be in the list, or feedback was mistyped.');
    } else {
      console.log('\nFailed to solve in 6 guesses.');
    }
    for (const t of outcome.trace) {
      console.log(`  ${t.turn}. ${t.guess.toUpperCase()}  ${t.feedback}  (${t.candidatesAfter} left)`);
    }

    // Persist a log so the analyze script has material to chew on.
    const last = outcome.trace.at(-1);
    const answer = outcome.solved && last ? last.guess : undefined;
    const logPath = writeLog({
      version: 1,
      timestamp: new Date().toISOString(),
      scorer: 'entropy',
      source: 'interactive',
      outcome: outcome.solved ? 'solved' : 'failed',
      guesses: outcome.guesses,
      answer,
      trace: outcome.trace,
    });
    console.error(`log: ${logPath}`);
  } finally {
    rl.close();
  }
}
