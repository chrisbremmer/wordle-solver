---
description: Plays all 2,309 answers and reports avg / max / distribution
argument-hint: "[--full | --sample N]"
---

Delegate to the `benchmark-runner` agent to run the full integration benchmark and produce the structured report.

If `$ARGUMENTS` includes `--sample N`, ask the agent to play a random sample of N answers instead of the full set (useful for quick iteration during development). Otherwise run the full 2,309-answer benchmark.

Targets: avg < 3.50, max ≤ 6, win rate 100% (spec §10).
