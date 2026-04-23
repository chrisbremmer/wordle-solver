// Benchmark engine — separated from the script so the integration test can
// exercise it directly without subprocess overhead.

import { GameController } from '../controller.js';
import { getPattern } from '../core/feedback.js';
import type { PatternCache } from '../core/patternCache.js';

export interface BenchmarkReport {
  total: number;
  wins: number;
  winRate: number;
  avgGuesses: number; // averages only over wins
  maxGuesses: number;
  distribution: Record<string, number>; // "1".."6" + "FAIL"
  hardGames: Array<{ answer: string; guesses: number }>; // ≥5 guesses, plus losses (guesses=0)
}

export interface RunOptions {
  onProgress?: (done: number, total: number) => void;
}

function patternToFeedback(p: number): string {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const v = Math.floor(p / 3 ** i) % 3;
    s += v === 2 ? 'G' : v === 1 ? 'Y' : '.';
  }
  return s;
}

export async function runBenchmark(
  cache: PatternCache,
  answersToPlay: readonly string[],
  candidatePool: readonly string[],
  opts: RunOptions = {},
): Promise<BenchmarkReport> {
  const controller = new GameController(cache, candidatePool);
  const dist: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, FAIL: 0 };
  const hard: BenchmarkReport['hardGames'] = [];
  let wins = 0;
  let sumGuesses = 0;
  let maxGuesses = 0;

  for (let i = 0; i < answersToPlay.length; i++) {
    const answer = answersToPlay[i]!;
    const outcome = await controller.play((guess) =>
      patternToFeedback(getPattern(guess, answer)),
    );
    if (outcome.solved) {
      wins++;
      sumGuesses += outcome.guesses;
      if (outcome.guesses > maxGuesses) maxGuesses = outcome.guesses;
      dist[String(outcome.guesses)]!++;
      if (outcome.guesses >= 5) hard.push({ answer, guesses: outcome.guesses });
    } else {
      dist.FAIL!++;
      hard.push({ answer, guesses: 0 });
    }
    opts.onProgress?.(i + 1, answersToPlay.length);
  }

  return {
    total: answersToPlay.length,
    wins,
    winRate: wins / answersToPlay.length,
    avgGuesses: wins === 0 ? 0 : sumGuesses / wins,
    maxGuesses,
    distribution: dist,
    hardGames: hard,
  };
}
