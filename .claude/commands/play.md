---
description: Launch the interactive Wordle solver CLI
argument-hint: "[--hard]"
allowed-tools: Bash(npm run play:*)
---

Launch the interactive solver. The CLI suggests a guess each turn and accepts feedback as:
- **Emoji** (paste from Wordle share modal): `🟩🟨⬛⬛🟩`
- **Letters**: `gy..g`  (G=green, Y=yellow, .=grey)
- **Digits**: `21002`  (2=green, 1=yellow, 0=grey)

If the user passes `--hard` in `$ARGUMENTS`, add it to the command to enforce Wordle Hard Mode (every guess must satisfy all learned greens / yellows).

!`npm run play -- $ARGUMENTS`

After each game prints a Discord-ready share block and asks `Play another? (y/N)`.
