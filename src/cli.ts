// Interactive CLI — see spec §9. Designed for "laptop next to phone" play:
// solver suggests a guess, user types it into Wordle, pastes the emoji row
// back as feedback. Loops until the user quits.

import { createInterface, type Interface as ReadlineInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import { loadOrBuildCache } from './cacheLoader.js';
import { GameController, type GameOutcome } from './controller.js';
import { ANSWERS } from './data/answers.js';
import { writeLog } from './log.js';
import { formatShare } from './share.js';

async function playOne(controller: GameController, rl: ReadlineInterface): Promise<GameOutcome> {
  return controller.play(async (guess, turn) => {
    const ans = await rl.question(`Turn ${turn}: play "${guess.toUpperCase()}" → `);
    return ans.trim();
  });
}

function reportOutcome(outcome: GameOutcome): void {
  const collapsed = !outcome.solved && outcome.trace.at(-1)?.candidatesAfter === 0;

  if (outcome.solved) {
    console.log(`\nSolved in ${outcome.guesses} guess${outcome.guesses === 1 ? '' : 'es'}.`);
  } else if (collapsed) {
    console.log(
      '\nNo candidates remain — either the feedback you typed is wrong, ' +
        'or the answer is not in our static list. ' +
        'If the latter, run `npm run fetch-wordlists` to refresh src/data/.',
    );
  } else {
    console.log('\nFailed to solve in 6 guesses.');
  }

  for (const t of outcome.trace) {
    console.log(`  ${t.turn}. ${t.guess.toUpperCase()}  ${t.feedback}  (${t.candidatesAfter} left)`);
  }

  // Wordle-style share block — paste straight into Discord.
  console.log(`\n${formatShare(outcome)}`);
}

function persistLog(outcome: GameOutcome): void {
  const last = outcome.trace.at(-1);
  const answer = outcome.solved && last ? last.guess : undefined;
  writeLog({
    version: 1,
    timestamp: new Date().toISOString(),
    scorer: 'entropy',
    source: 'interactive',
    outcome: outcome.solved ? 'solved' : 'failed',
    guesses: outcome.guesses,
    answer,
    trace: outcome.trace,
  });
}

export async function playInteractive(): Promise<void> {
  const { cache, source, ms } = loadOrBuildCache();
  console.error(`cache: ${source} (${ms}ms)`);
  console.error(
    'feedback: G/Y/.  or  2/1/0  or  🟩/🟨/⬛  (e.g. "gy..g" or "🟩🟨⬛⬛🟩")',
  );

  const rl = createInterface({ input: stdin, output: stdout });
  const controller = new GameController(cache, ANSWERS);

  try {
    while (true) {
      console.log(); // blank line between games
      const outcome = await playOne(controller, rl);
      reportOutcome(outcome);
      persistLog(outcome);

      const again = (await rl.question('\nPlay another? (y/N) ')).trim().toLowerCase();
      if (again !== 'y' && again !== 'yes') break;
    }
  } finally {
    rl.close();
  }
}
