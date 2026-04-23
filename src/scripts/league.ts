// Solver-vs-solver league (spec §13.4). Runs every scorer over the same
// answer set and prints a side-by-side comparison.
//
//   npm run league                 — full set, all 4 scorers
//   npm run league -- --sample 200 — quicker run on the first 200 answers
//   npm run league -- --skip oneply,minimax  — exclude slow scorers
//
// Plays are deterministic for a given (scorer, answer) so re-runs reproduce.

import { loadOrBuildCache } from '../cacheLoader.js';
import { pickBestGuessFrequency } from '../core/frequencyScorer.js';
import { pickBestGuessMinimax } from '../core/minimaxScorer.js';
import { pickBestGuessOnePly } from '../core/oneplyScorer.js';
import { pickBestGuess, type ScorerStrategy } from '../core/scorer.js';
import { ANSWERS } from '../data/answers.js';
import { runBenchmark, type BenchmarkReport } from './benchmarkLib.js';

const SCORERS: Array<{ name: string; fn: ScorerStrategy }> = [
  { name: 'entropy', fn: pickBestGuess },
  { name: 'oneply', fn: pickBestGuessOnePly },
  { name: 'frequency', fn: pickBestGuessFrequency },
  { name: 'minimax', fn: pickBestGuessMinimax },
];

const args = process.argv.slice(2);
const sampleIdx = args.indexOf('--sample');
const sampleN = sampleIdx >= 0 ? Number(args[sampleIdx + 1]) : 0;
const skipIdx = args.indexOf('--skip');
const skip = new Set(
  skipIdx >= 0 ? (args[skipIdx + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean) : [],
);

const { cache, source: cacheSource, ms: cacheMs } = loadOrBuildCache(true);
console.error(`cache: ${cacheSource} (${cacheMs}ms)`);

const answers: readonly string[] = sampleN > 0 ? ANSWERS.slice(0, sampleN) : ANSWERS;
console.error(`league: ${answers.length} answers, ${SCORERS.length - skip.size} scorers\n`);

interface Row {
  name: string;
  report: BenchmarkReport;
  wallMs: number;
}
const rows: Row[] = [];

for (const { name, fn } of SCORERS) {
  if (skip.has(name)) {
    console.error(`  [skip] ${name}`);
    continue;
  }
  process.stderr.write(`  ${name}: `);
  const t0 = Date.now();
  const report = await runBenchmark(cache, answers, ANSWERS, {
    scorer: fn,
    onProgress: (done, total) => {
      if (done === total) process.stderr.write('done\n');
    },
  });
  rows.push({ name, report, wallMs: Date.now() - t0 });
}

// Print a comparison table.
const buckets = ['1', '2', '3', '4', '5', '6'] as const;
const colW = { name: 11, avg: 7, max: 5, win: 7, fail: 6 };

const head =
  'scorer'.padEnd(colW.name) +
  'avg'.padEnd(colW.avg) +
  'max'.padEnd(colW.max) +
  'win'.padEnd(colW.win) +
  'fail'.padEnd(colW.fail) +
  buckets.map((b) => b.padStart(5)).join(' ') +
  '   wall';
console.log('\n' + head);
console.log('-'.repeat(head.length));

for (const r of rows) {
  const d = r.report.distribution;
  const row =
    r.name.padEnd(colW.name) +
    r.report.avgGuesses.toFixed(3).padEnd(colW.avg) +
    String(r.report.maxGuesses).padEnd(colW.max) +
    `${(r.report.winRate * 100).toFixed(1)}%`.padEnd(colW.win) +
    String(d.FAIL ?? 0).padEnd(colW.fail) +
    buckets.map((b) => String(d[b] ?? 0).padStart(5)).join(' ') +
    `   ${(r.wallMs / 1000).toFixed(1)}s`;
  console.log(row);
}

// Best line.
if (rows.length > 0) {
  const best = rows.reduce((a, b) => (a.report.avgGuesses < b.report.avgGuesses ? a : b));
  console.log(`\nbest avg: ${best.name} (${best.report.avgGuesses.toFixed(3)})`);
}
