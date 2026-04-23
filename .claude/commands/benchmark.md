---
description: Plays all 2,315 answers and reports avg / max / distribution
argument-hint: "[--sample N] [--hard] [--scorer entropy|oneply|frequency|minimax]"
---

Delegate to the `benchmark-runner` agent to run the integration benchmark and produce the structured report.

Argument handling:
- `--sample N` — play only the first N answers (quick iteration).
- `--hard` — enforce Hard Mode (every guess must satisfy known greens / yellows / counts).
- `--scorer X` — use `entropy` (default), `oneply`, `frequency`, or `minimax`.
- Multiple flags combine: e.g. `--sample 100 --hard --scorer minimax`.

Pass `$ARGUMENTS` straight through to the agent.

Targets (spec §10, normal mode): avg < 3.50, max ≤ 6, win rate 100%. Hard Mode relaxes these — expect ~3.52 avg / ~99.8% win / 5 fails on the full set.
