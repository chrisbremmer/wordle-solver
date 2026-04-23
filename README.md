# wordle-solver

A TypeScript Wordle solver. Targets ~3.43 average guesses using entropy scoring with a precomputed pattern cache. Runs locally as a CLI, designed for the "Wordle on phone, solver on laptop" workflow.

**Status:** spec-complete (see [`docs/engineering-spec.md`](docs/engineering-spec.md)). 68 unit tests + a full 2,315-answer integration benchmark passing. Hits 3.434 avg / 100% win rate — within 0.01 of the DP-optimal 3.42 bound.

---

## Prerequisites

- **Node 20 or later** (`node --version` to check)
- npm (bundled with Node)
- ~150 MB free disk for `node_modules` + `cache.bin`

No internet needed at runtime — the answer/guess word lists are baked in. Only the optional `npm run analyze` and `npm run fetch-wordlists` need network access.

---

## Install

```bash
git clone https://github.com/chrisbremmer/wordle-solver.git
cd wordle-solver
npm install
```

That's it. Tests run in <1s without setup; the pattern cache builds itself on first `play` / `benchmark` (~3s) and is reused after that.

---

## Daily play — the main workflow

This is what you'll actually run day-to-day, alongside Wordle on your phone.

```bash
npm run play
```

**What you see, turn by turn:**

```
cache: disk (6ms)
feedback: G/Y/.  or  2/1/0  or  🟩/🟨/⬛  (e.g. "gy..g" or "🟩🟨⬛⬛🟩")

Turn 1: play "SALET" →
```

**What you do:**

1. Type **SALET** into Wordle on your phone.
2. Wordle shows you a row of colored squares. Read them back to the CLI in any of three forms:
   - **Emoji** — long-press on the result row in the Wordle share modal, copy, paste: `🟩🟨⬛⬛🟩`
   - **Letters** — `gy..g` (G=green, Y=yellow, .=grey)
   - **Digits** — `21002` (2=green, 1=yellow, 0=grey)
3. Hit Enter. The solver suggests the next guess.
4. Repeat. The solver tells you it's solved when you type back `🟩🟩🟩🟩🟩` (or `ggggg`).

**Discord-ready share block** prints automatically at the end:

```
Wordle solver 4/6

⬛🟨⬛⬛⬛
⬛🟨🟩⬛⬛
⬛🟩🟩🟩🟩
🟩🟩🟩🟩🟩
```

Copy that into your friends' Discord channel.

**Loop mode** — after each game you'll see `Play another? (y/N)`. `y` resets and starts a fresh game; anything else exits. Useful for grinding through past Wordles.

---

## All commands

| Command | What it does | When to use |
|---|---|---|
| `npm run play` | Interactive CLI | Daily play |
| `npm test` | All tests (incl. full 2,315-game benchmark, ~95s) | Sanity check after pulling changes |
| `npm run typecheck` | `tsc --noEmit` | Before committing |
| `npm run test:feedback` | Just the dup-letter unit tests | Editing `feedback.ts` |
| `npm run build-cache` | Build `cache.bin` (~3s, ~29MB) | Manual rebuild after refreshing word lists |
| `npm run benchmark` | Plays all 2,315 answers, prints distribution | Verify changes don't regress |
| `npm run league` | Runs all 4 scorers head-to-head | Compare strategies |
| `npm run analyze` | Sends `logs/` to Claude for strategic-pattern report | Find leaks in your play |
| `npm run fetch-wordlists` | Re-pulls cfreshman's gists into `src/data/` | When NYT adds words you don't have |

### Useful flags

```bash
# Quick benchmark on a sample
npm run benchmark -- --sample 100

# Try a different scorer
npm run benchmark -- --scorer minimax

# Persist one log file per benchmark game (for analyze)
npm run benchmark -- --sample 20 --log

# League on a sample, skip the slow scorers
npm run league -- --sample 200 --skip oneply,minimax
```

---

## Optional: post-game analysis with Claude

Every interactive game writes a JSON trace to `logs/`. To get strategic feedback:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."   # https://console.anthropic.com
npm run analyze
```

Defaults to `claude-opus-4-7` with adaptive thinking and prompt caching on the engineering spec (so repeat runs cost ~10% of the first). Override with `WORDLE_ANALYZE_MODEL=claude-sonnet-4-6` for cheaper runs.

If you have no logs yet, generate some quickly from the benchmark:

```bash
npm run benchmark -- --sample 20 --log
npm run analyze
```

---

## Strategy & numbers

Entropy-based scoring with a hardcoded `SALET` opener. Beats human play (~4.0 avg) and gets within 0.01 of DP-optimal at a fraction of the build cost. Spec §1 explicitly chose this tradeoff over true DP.

Full 2,315-answer league results:

| scorer    | avg   | max | win    | fail | 2  | 3    | 4    | 5   | 6  | wall |
|-----------|-------|-----|--------|------|----|------|------|-----|----|------|
| entropy   | 3.434 | 6   | 100%   | 0    | 79 | 1224 | 945  | 63  | 4  | 33s  |
| oneply    | 3.472 | 6   | 100%   | 0    | 90 | 1159 | 951  | 114 | 1  | 247s |
| minimax   | 3.621 | 6   | 100%   | 0    | 56 | 910  | 1215 | 123 | 11 | 27s  |
| frequency | 3.721 | 6   | 99.0%  | 22   | 94 | 871  | 977  | 278 | 72 | 10s  |

Spec §1's predictions of ~3.43 / ~3.5 / ~3.7 for entropy / minimax / frequency are accurate to two decimals. One-ply lookahead with a simple expected-guesses heuristic doesn't beat plain entropy — closing the gap to DP-optimal 3.42 needs full DP.

---

## Project layout

```
src/
  data/
    answers.ts            ANSWERS (2,315 solution words, from cfreshman gist)
    guesses.ts            GUESSES (12,972 valid guesses, union of both gists)
  core/
    feedback.ts           getPattern(guess, answer) — DUP-LETTER LOGIC LIVES HERE
    patternCache.ts       precomputed (guess, answer) → pattern, ~29MB Uint8Array
    state.ts              GameState + normalizeFeedback (G/Y/. & emoji & digits)
    filter.ts             isCandidate (greens / yellows / min / maxCounts)
    scorer.ts             entropy scoring + SALET opener + endgame heuristics
    oneplyScorer.ts       experimental top-K expected-guesses lookahead
    frequencyScorer.ts    classic letter-frequency baseline (AROSE opener)
    minimaxScorer.ts      worst-case-bucket-size baseline (SERAI opener)
  controller.ts           GameController.play(getFeedback) — drives one game
  cli.ts                  interactive readline loop with emoji + share block
  cacheLoader.ts          load-or-build cache.bin with stale-header detection
  log.ts                  GameLog schema, writeLog / readAllLogs
  share.ts                Wordle-style share-block formatter
  index.ts                entry point (npm run play)
  scripts/
    buildCache.ts         npm run build-cache
    benchmark.ts          npm run benchmark
    benchmarkLib.ts       reusable benchmark engine (used by tests too)
    league.ts             npm run league
    analyze.ts            npm run analyze (Claude API)
test/
  feedback.test.ts        CRITICAL — duplicate-letter cases (spec §5)
  filter.test.ts          GameState + isCandidate + normalizeFeedback
  scorer.test.ts          entropy + heuristics
  oneplyScorer.test.ts
  leagueScorers.test.ts   frequency + minimax
  patternCache.test.ts    build / serialize / deserialize
  controller.test.ts      synthetic-cache full-game smoke
  share.test.ts           share block formatter
  integration.test.ts     plays all 2,315 answers, asserts spec §10 targets
docs/
  engineering-spec.md     source of truth for the design
.claude/                  Claude Code agents, slash commands, settings
CLAUDE.md                 per-session context if you use Claude Code on this repo
```

---

## Troubleshooting

**`npm run play` says "cache.bin not found. Building (~30s)"** — first-time only, takes ~3s in practice. Lets you rebuild without thinking about it.

**`No candidates remain`** during play means either (a) you typed wrong feedback, or (b) the answer isn't in our static list. Run `npm run fetch-wordlists` to refresh from cfreshman's gist; if the answer still isn't there it's a brand-new NYT word.

**`ANTHROPIC_API_KEY is not set`** when running `npm run analyze` — get a key at <https://console.anthropic.com>, then `export ANTHROPIC_API_KEY="sk-ant-..."`. The other scripts don't need a key.

**Tests slow** — `npm test` runs the full 2,315-game integration benchmark (~95s including a fresh cache build inside the worker). To skip it: `npx vitest run --exclude test/integration.test.ts` (~0.5s).

**Cache stale after editing word lists** — `cache.bin` is keyed by word-list size in its header; if `src/data/*.ts` changes, the next `play`/`benchmark` rebuilds it automatically.

---

## Tests / verification

```bash
npm run typecheck   # TypeScript strict-mode check
npm test            # 68 unit + 1 full-set integration (~95s, asserts spec §10)
```

Spec §10 targets: avg < 3.50, max ≤ 6, 100% win rate. The integration test actually plays all 2,315 answers and asserts these hold.

---

## What this is / isn't

**Is** — a daily-play assistant. CLI alongside the NYT Wordle app on your phone. Suggests guesses, accepts emoji feedback, prints a Discord-ready share block.

**Isn't** — a Chrome extension that reads the NYT board automatically (spec §13.3, deliberately out of scope), a hard-mode solver (spec §12), an LLM-driven solver (spec §1, empirically worse than entropy), or a DP-optimal solver (spec §1, 0.01 better at days-of-compute cost).

See spec §12 for the full out-of-scope list.
