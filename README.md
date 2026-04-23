# wordle-solver

A TypeScript Wordle solver. Targets ~3.43 average guesses using entropy scoring with a precomputed pattern cache. Runs locally as a CLI.

See [`docs/engineering-spec.md`](docs/engineering-spec.md) for the full design.

## Quick start

```bash
npm install
npm test              # unit + integration tests (must pass before anything else)
npm run build-cache   # builds ~34MB pattern cache to cache.bin (~20s, one-time)
npm run play          # interactive CLI: enter feedback after each guess
npm run benchmark     # plays all 2,309 answers, prints distribution
```

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
