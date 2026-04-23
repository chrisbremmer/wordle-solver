---
description: Build the ~34MB pattern cache and write cache.bin (~20s)
allowed-tools: Bash(npm run build-cache), Bash(ls -lh cache.bin)
---

Build the pattern cache:

!`npm run build-cache`

Then confirm the file exists and report its size:

!`ls -lh cache.bin 2>/dev/null || echo "cache.bin missing — build failed"`

Expected size: ~34MB (|guesses| × |answers| bytes). Run once after first install or after the answer/guess lists change.
