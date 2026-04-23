# wordle-solver

Entropy-based Wordle solver in TypeScript. Targets ~3.43 avg guesses, 100% win rate.

**Source of truth:** [`docs/engineering-spec.md`](docs/engineering-spec.md). When the spec and this file disagree, the spec wins — update this file.

## Stack

- Node 20+, TypeScript (strict, ESM, `noUncheckedIndexedAccess`)
- Vitest for unit + integration tests
- `tsx` for running TS scripts directly (no build step needed for `play` / `build-cache` / `benchmark`)
- No frontend, no framework, no external services. CLI only.

## Layout

```
src/
  data/         answers.ts (2,309), guesses.ts (~14,855) — static word lists
  core/
    feedback.ts      ★ getPattern(guess, answer) — duplicate-letter rules
    patternCache.ts  precomputed (guess, answer) → pattern, ~34MB Uint8Array
    state.ts         GameState (greens, yellows, min/maxCounts, candidates)
    filter.ts        isCandidate(word, state)
    scorer.ts        entropyForGuess + pickBestGuess (SALET opener hardcoded)
  controller.ts      GameController.play(getFeedback)
  cli.ts             interactive readline loop
  scripts/
    buildCache.ts    persists cache.bin (one-off, ~20s)
    benchmark.ts     plays all 2,309 answers, prints distribution
test/
  feedback.test.ts   ★ duplicate-letter cases — implement first
  filter.test.ts
  scorer.test.ts
  integration.test.ts
```

## ★ Critical: feedback.ts is the #1 bug source

Wordle's duplicate-letter rules are non-obvious. A buggy `getPattern` silently misranks every candidate downstream — the integration benchmark fails, but the failure mode points nowhere useful.

**Rules of engagement:**
1. The two-pass algorithm in spec §5 is mandatory: greens first (consume answer slots), then yellows against unconsumed slots only.
2. The 6 duplicate-letter test cases in `test/feedback.test.ts` MUST pass before touching anything downstream.
3. Use `minCounts`/`maxCounts` in state — never a flat grey set. A "grey" letter can still be present in the word elsewhere.
4. Pattern encoding: base-3 int 0..242. Position 0 is least significant. `getPattern` returns this int — strings are 5x slower and break the cache.

When editing `src/core/feedback.ts` or `src/core/filter.ts`, the `feedback-reviewer` subagent will be auto-delegated to verify the duplicate-letter cases still pass.

## Workflow

```bash
npm install
npm test               # unit + integration
npm run typecheck      # tsc --noEmit
npm run test:feedback  # just the dup-letter cases
npm run build-cache    # writes cache.bin (~34MB, ~20s, one-time)
npm run play           # interactive CLI (writes logs/<ts>-<answer>.json)
npm run benchmark      # plays all 2,315; expects avg < 3.50
                       #   --scorer entropy|oneply
                       #   --sample N
                       #   --log     write logs/ for every game
                       #   --quiet
npm run analyze        # send logs/ to Claude for strategic-pattern report
                       # requires ANTHROPIC_API_KEY; default model is opus-4-7
```

Slash commands wrap the same scripts: `/feedback-check`, `/build-cache`, `/play`, `/benchmark`, `/fetch-wordlists`.

## Conventions

- ESM imports use explicit `.js` extensions (TS resolves to `.ts` source). Required for `verbatimModuleSyntax`.
- No comments that describe WHAT — only the non-obvious WHY (e.g. "use Uint8Array because pattern fits in a byte and string keys 5x slower").
- `cache.bin` is gitignored. Anyone can rebuild with `npm run build-cache`.
- The opener is hardcoded to `salet`. Don't try to "rediscover" it at startup — saves ~2s per game.

## Out of scope

Hard mode, Wordle variants (Quordle, etc.), LLM-in-the-solve-loop, neural scorer, web UI, NYT scraping. See spec §12.
