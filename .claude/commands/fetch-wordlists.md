---
description: Populate src/data/answers.ts and src/data/guesses.ts from cfreshman's gists (one-time)
---

Delegate to the `wordlist-fetcher` agent. It will:

1. Fetch the answers list (~2,309) and the allowed-guesses list from cfreshman's canonical gists
2. Validate each entry (5 lowercase ASCII letters, no dupes, sorted)
3. Compute the union so `ANSWERS ⊆ GUESSES`
4. Write both files in the existing TypeScript array format
5. Run `npm run typecheck` to confirm they compile

Report final counts and any validation failures.
