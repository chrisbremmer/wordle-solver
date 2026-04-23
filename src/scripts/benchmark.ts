// Plays all (or a sample of) answers and prints distribution + avg/max
// (spec §10, §11). Run via `npm run benchmark [-- --sample N] [--quiet]`.

import { loadOrBuildCache } from '../cacheLoader.js';
import { ANSWERS } from '../data/answers.js';
import { pickBestGuessFrequency } from '../core/frequencyScorer.js';
import { pickBestGuessMinimax } from '../core/minimaxScorer.js';
import { pickBestGuessOnePly } from '../core/oneplyScorer.js';
import { pickBestGuess, type ScorerStrategy } from '../core/scorer.js';
import { runBenchmark } from './benchmarkLib.js';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const logGames = args.includes('--log');
const hardMode = args.includes('--hard');
const sampleIdx = args.indexOf('--sample');
const sampleN = sampleIdx >= 0 ? Number(args[sampleIdx + 1]) : 0;
const scorerIdx = args.indexOf('--scorer');
const scorerName = scorerIdx >= 0 ? args[scorerIdx + 1] : 'entropy';

let scorer: ScorerStrategy;
if (scorerName === 'oneply') scorer = pickBestGuessOnePly;
else if (scorerName === 'entropy') scorer = pickBestGuess;
else if (scorerName === 'frequency') scorer = pickBestGuessFrequency;
else if (scorerName === 'minimax') scorer = pickBestGuessMinimax;
else {
  console.error(`unknown --scorer "${scorerName}" (entropy | oneply | frequency | minimax)`);
  process.exit(2);
}

const { cache } = loadOrBuildCache(!quiet);

let answers: readonly string[] = ANSWERS;
if (sampleN > 0) {
  // Deterministic sample (seeded shuffle by index parity for reproducibility).
  const shuffled = [...ANSWERS].sort((a, b) => a.localeCompare(b));
  answers = shuffled.slice(0, Math.min(sampleN, shuffled.length));
}

const t0 = Date.now();
const report = await runBenchmark(cache, answers, ANSWERS, {
  scorer,
  logGames,
  scorerName,
  hardMode,
  onProgress: quiet ? undefined : (done, total) => {
    if (done % 50 === 0 || done === total) {
      process.stderr.write(`\r  ${done}/${total}`);
    }
  },
});
if (!quiet) process.stderr.write('\n');
const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

const pad = (n: number) => String(n).padStart(4);
const dist = Object.entries(report.distribution)
  .map(([k, v]) => `${k}: ${v}`)
  .join(', ');

console.log('Benchmark report');
console.log('----------------');
console.log(`Scorer:       ${scorerName}${hardMode ? ' (hard)' : ''}`);
console.log(`Games:        ${report.total}`);
console.log(`Avg guesses:  ${report.avgGuesses.toFixed(3)}    [target < 3.50]`);
console.log(`Max guesses:  ${report.maxGuesses}             [target ≤ 6]`);
console.log(`Win rate:     ${(report.winRate * 100).toFixed(2)}%      [target 100%]`);
console.log(`Distribution: { ${dist} }`);
if (report.hardGames.length > 0) {
  console.log(`≥5-guess games (${report.hardGames.length}):`);
  for (const g of report.hardGames.slice(0, 10)) {
    console.log(`  ${pad(g.guesses)}  ${g.answer}  → ${g.guesses === 0 ? 'FAIL' : ''}`);
  }
}
console.log(`Wall time:    ${elapsedSec}s`);
