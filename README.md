# wordle-solver

A TypeScript Wordle solver. Targets ~3.43 average guesses using entropy scoring with a precomputed pattern cache. Runs locally as a CLI.

See [`docs/engineering-spec.md`](docs/engineering-spec.md) for the full design.

## Quick start

```bash
npm install
npm test              # unit + integration tests (must pass before anything else)
npm run build-cache   # builds ~34MB pattern cache to cache.bin (~20s, one-time)
npm run play          # interactive CLI: enter feedback after each guess
npm run benchmark     # plays all 2,315 answers, prints distribution
npm run analyze       # asks Claude to spot strategic patterns in logs/
```

## Post-game analysis with Claude (spec §13.2)

Every interactive game writes a JSON trace to `logs/`. Generate benchmark
logs with `npm run benchmark -- --sample 20 --log`. Then:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
npm run analyze
```

The analyze script uses `claude-opus-4-7` by default with adaptive thinking
and prompt caching on the system block (the engineering spec is the cached
context, so repeat runs cost ~10% of the first one). Override the model
with `WORDLE_ANALYZE_MODEL=claude-sonnet-4-6` if you want cheaper runs.

## Strategy

Entropy-based scoring with a hardcoded `SALET` opener. Beats human play (~4.0 avg) and gets within 0.01 guesses of the DP-optimal bound (3.4201) at a fraction of the build cost. See spec §1 for the strategy comparison.

## Project layout

```
src/
  data/         # answers.ts (2,309), guesses.ts (~14,855)
  core/
    feedback.ts      # getPattern(guess, answer) — duplicate-letter rules live here
    patternCache.ts  # precomputed (guess, answer) → pattern lookups
    state.ts         # GameState
    filter.ts        # prune candidates against state
    scorer.ts        # entropy scoring + endgame logic
  controller.ts      # GameController orchestrates a game
  cli.ts             # interactive CLI
  index.ts           # entry point
test/
  feedback.test.ts   # CRITICAL — duplicate-letter cases (spec §5)
  filter.test.ts
  scorer.test.ts
  integration.test.ts # plays N games, asserts avg < 3.5
```

## Targets

- Avg guesses: < 3.50 (target ~3.43)
- Max guesses: ≤ 6 (no losses)
- Win rate: 100%

## Scorers

`npm run benchmark -- --scorer entropy|oneply|frequency|minimax`

`npm run league` runs all four head-to-head over the same answer set. Full 2,315-answer numbers:

| scorer    | avg   | max | win    | fail | 2  | 3    | 4    | 5   | 6  | wall |
|-----------|-------|-----|--------|------|----|------|------|-----|----|------|
| entropy   | 3.434 | 6   | 100%   | 0    | 79 | 1224 | 945  | 63  | 4  | 33s  |
| oneply    | 3.472 | 6   | 100%   | 0    | 90 | 1159 | 951  | 114 | 1  | 247s |
| minimax   | 3.621 | 6   | 100%   | 0    | 56 | 910  | 1215 | 123 | 11 | 27s  |
| frequency | 3.721 | 6   | 99.0%  | 22   | 94 | 871  | 977  | 278 | 72 | 10s  |

Findings:
- Entropy is the winner. Spec §1's predictions of ~3.43 / ~3.5 / ~3.7 for entropy / minimax / frequency are accurate to two decimals.
- One-ply with a simple expected-guesses heuristic doesn't beat plain entropy — closing the gap to DP-optimal 3.42 needs full DP.
- Frequency is the only scorer that *fails* (22 / 2315) — fast and cheap, but ignores positional information so it occasionally runs out of turns.
- Minimax solves every game but ends up 0.2 worse than entropy on avg — minimizing the worst case sacrifices the easy splits.
