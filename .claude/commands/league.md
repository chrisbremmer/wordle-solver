---
description: Run entropy / oneply / frequency / minimax head-to-head (spec §13.4)
argument-hint: "[--sample N] [--skip scorer1,scorer2]"
allowed-tools: Bash(npm run league:*)
---

Run the solver league — plays the same answer set with each of the four scorers and prints a side-by-side comparison table. Takes ~5 minutes for the full set (oneply dominates at ~4 min; the other three are ~1 min combined).

Pass `$ARGUMENTS` through to the script:
- `--sample N` for a quick run on the first N answers.
- `--skip oneply,minimax` to exclude slow scorers.

!`npm run league -- $ARGUMENTS`

Expected full-set result: entropy wins at 3.434 avg, oneply is close at 3.472, minimax trails at 3.621, frequency at 3.721 (with 22 fails). Details in README.
