---
description: Send game logs to Claude for strategic-pattern analysis (spec §13.2)
argument-hint: "[path/to/log.json ...]"
allowed-tools: Bash(npm run analyze:*), Bash(test -n \"$ANTHROPIC_API_KEY\"*)
---

Send Wordle game traces from `logs/` to Claude for strategic-pattern analysis. Requires `ANTHROPIC_API_KEY` in the environment — if missing, tell the user to `export ANTHROPIC_API_KEY="sk-ant-..."` and retry.

Default behavior (no args): analyze every log under `logs/`.
With file paths in `$ARGUMENTS`: analyze only those.

!`npm run analyze -- $ARGUMENTS`

Uses `claude-opus-4-7` by default with prompt caching on the engineering spec so repeat runs cost ~10% of the first. Override model with `WORDLE_ANALYZE_MODEL=claude-sonnet-4-6`.

If the user has no logs yet, suggest generating some: `npm run benchmark -- --sample 20 --log`.
