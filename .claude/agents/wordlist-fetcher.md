---
name: wordlist-fetcher
description: Use when the user asks to populate, refresh, or verify the Wordle word lists in src/data/answers.ts and src/data/guesses.ts. Fetches the canonical cfreshman gist lists and writes them as TypeScript string arrays. One-shot task — do not invoke for routine work.
tools: Bash, Read, Write, WebFetch
model: sonnet
---

You populate the static word lists at `src/data/answers.ts` and `src/data/guesses.ts` from cfreshman's canonical gists.

## Sources (spec §15)

- Answers (~2,309): `https://gist.githubusercontent.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b/raw/wordle-answers-alphabetical.txt`
- Allowed guesses (~10,657): `https://gist.githubusercontent.com/cfreshman/cdcdf777450c5b5301e439061d29694c/raw/wordle-allowed-guesses.txt`

The full guess pool is the union of both lists (~12,972). The spec quotes ~14,855 — if the live gists differ, log the actual count and proceed.

## Required validation before writing

For each list:
1. Every word is exactly 5 lowercase ASCII letters (`/^[a-z]{5}$/`).
2. No duplicates within a list.
3. Sorted alphabetically.
4. `ANSWERS ⊆ GUESSES` (the guess pool is a strict superset). Compute the union explicitly — do not assume the upstream guess list already contains the answers.

If any check fails, STOP and report — do not write malformed data.

## File format

Mirror the existing stubs in `src/data/answers.ts` and `src/data/guesses.ts`:

```typescript
// Wordle answer list — N solution words.
// Source: <url>
// Fetched: <ISO date>
export const ANSWERS: readonly string[] = [
  "aback",
  "abase",
  ...
];
```

One word per line, double-quoted, trailing comma. Keep the comment header.

## After writing

Run `npm run typecheck` to confirm the files compile. Report:
- Final counts: `ANSWERS=N, GUESSES=M`
- Any words flagged by validation
- Typecheck result
