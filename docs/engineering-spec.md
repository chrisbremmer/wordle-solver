# Wordle Solver — Engineering Spec

**Owner:** Chris Bremmer
**Goal:** A TypeScript Wordle solver that averages ~3.43 guesses, runs locally as a CLI, and reliably beats human players (~4.0 avg). Optimize for build speed and correctness over squeezing the last 0.01 guesses of optimality.

---

## 1. Background & Strategy Decision

Wordle is a provably solved game. Exact Dynamic Programming achieves **3.4201 avg guesses, 5 worst-case**, using SALET as the opener. This bound is sharp — it cannot be improved.

We are deliberately **not** building the DP-optimal solver. Tradeoffs:

| Approach | Avg Guesses | Build Cost | Why / Why Not |
|---|---|---|---|
| DP-optimal | 3.42 | Days of compute, 6GB tree | Only 0.01 better than entropy. Not worth it. |
| **Entropy (chosen)** | **~3.43** | **Half a weekend** | Understandable, fast, crushes humans. |
| Minimax | ~3.5 | Similar to entropy | Worse average. |
| Frequency heuristic | ~3.7 | Trivial | Not competitive enough. |
| Deep RL | 3.5–3.9, loses some games | Weeks | Empirically worse than entropy for this problem. |
| LLM-as-solver | ~4.5+, breaks rules | N/A | LLMs fail at cross-turn constraint tracking. |

**Decision: Entropy solver with one-ply lookahead as an optional later enhancement.**

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                     CLI Loop                    │
│  (prompts for feedback pattern, prints guess)   │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │     GameController      │
        │  (state + turn manager) │
        └────────────┬────────────┘
                     │
     ┌───────────────┼────────────────┐
     │               │                │
┌────▼─────┐   ┌─────▼──────┐   ┌─────▼──────┐
│  State   │   │  Filter    │   │  Scorer    │
│ (greens, │   │ (prunes    │   │ (entropy,  │
│  yellows,│   │  candidate │   │  picks next│
│  counts) │   │  list)     │   │  guess)    │
└──────────┘   └─────┬──────┘   └─────┬──────┘
                     │                │
                ┌────▼────────────────▼────┐
                │   PatternCache (2D int   │
                │   array, precomputed)    │
                └──────────────────────────┘
```

**Data layer** sits underneath — two word lists (answers ~2,309; guesses ~14,855) loaded once at startup.

---

## 3. Project Structure

```
wordle-solver/
├── package.json
├── tsconfig.json
├── src/
│   ├── data/
│   │   ├── answers.ts         # 2,309 solution words
│   │   └── guesses.ts         # 14,855 valid guesses (superset incl. answers)
│   ├── core/
│   │   ├── feedback.ts        # getPattern(guess, answer) → Pattern
│   │   ├── patternCache.ts    # precomputes & serves feedback lookups
│   │   ├── state.ts           # GameState class
│   │   ├── filter.ts          # filters candidates against state
│   │   └── scorer.ts          # entropy scoring + endgame logic
│   ├── controller.ts          # GameController — orchestrates a game
│   ├── cli.ts                 # interactive CLI
│   └── index.ts               # entry point
├── test/
│   ├── feedback.test.ts       # CRITICAL — duplicate letter cases
│   ├── filter.test.ts
│   ├── scorer.test.ts
│   └── integration.test.ts    # plays N games, asserts avg < 3.5
└── README.md
```

---

## 4. Core Data Structures

### Pattern encoding

Each guess produces a 5-position pattern. Encode as base-3 integer (0–242):

- `0` = grey (letter not in word)
- `1` = yellow (letter in word, wrong position)
- `2` = green (letter correct position)

```typescript
type Pattern = number; // 0-242, base-3 encoded

// Position 0 is least significant: GREEN at pos 0 = 2, at pos 1 = 6, at pos 2 = 18...
// Example: "GYYY." (green, yellow, yellow, yellow, grey)
//   = 2 + 1*3 + 1*9 + 1*27 + 0*81 = 2 + 3 + 9 + 27 = 41
```

Integer encoding is **essential** for the pattern cache — a 2D int array is ~5x smaller and faster than strings.

### GameState

```typescript
class GameState {
  greens: Map<number, string>;          // position → letter
  yellows: Map<string, Set<number>>;    // letter → positions it's NOT at
  greys: Set<string>;                   // letters not in word (with nuance for dupes)
  minCounts: Map<string, number>;       // minimum occurrences
  maxCounts: Map<string, number>;       // maximum occurrences (for duplicate handling)
  turn: number;                         // 1-6
  candidates: string[];                 // remaining possible answers
}
```

---

## 5. Critical Implementation: The Feedback Function

**This is the #1 source of bugs.** Wordle's duplicate-letter rules are non-obvious. Get this wrong and the solver silently misranks candidates.

### Algorithm (two-pass)

```typescript
function getPattern(guess: string, answer: string): Pattern {
  const result = [0, 0, 0, 0, 0]; // 0=grey default
  const answerChars = answer.split('');
  const used = [false, false, false, false, false];

  // Pass 1: mark all GREENS first, consuming answer letters
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 2;
      used[i] = true;
    }
  }

  // Pass 2: mark YELLOWS against unconsumed answer letters
  for (let i = 0; i < 5; i++) {
    if (result[i] === 2) continue; // already green
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === answerChars[j]) {
        result[i] = 1;
        used[j] = true;
        break;
      }
    }
  }

  // Encode to base-3 int
  return result[0] + result[1]*3 + result[2]*9 + result[3]*27 + result[4]*81;
}
```

### Required unit tests

These cases MUST pass before anything else works:

| Guess | Answer | Expected Pattern | Why |
|---|---|---|---|
| `BOOKS` | `BOOST` | `GG.GG` (greens first) | No dupe confusion |
| `BOOKS` | `BOBBY` | `GG...` | Second O is grey (only one O in answer) |
| `LLAMA` | `ALLOY` | `YY.Y.` | Two Ls: both yellow because answer has two Ls |
| `LLAMA` | `ALOFT` | `Y....` | Two Ls but answer has one — first L yellow, second grey |
| `SPEED` | `ERASE` | `.Y.YY` | Two Es in guess, two in answer, positions differ |
| `EERIE` | `EATEN` | `G...Y` | Three Es vs two — first green, last yellow, middle grey |

Write these tests FIRST. Do not proceed until they pass.

---

## 6. Pattern Cache

The single biggest perf win. Precompute `feedback(guess, answer)` for every (guess, answer) pair and store as a flat `Uint8Array`.

```typescript
// Size: 14,855 guesses × 2,309 answers × 1 byte = ~34MB
// Pattern fits in a byte (0-242), so Uint8Array is ideal.

class PatternCache {
  private data: Uint8Array;
  private numAnswers: number;

  constructor(guesses: string[], answers: string[]) {
    this.numAnswers = answers.length;
    this.data = new Uint8Array(guesses.length * answers.length);
    for (let g = 0; g < guesses.length; g++) {
      for (let a = 0; a < answers.length; a++) {
        this.data[g * this.numAnswers + a] = getPattern(guesses[g], answers[a]);
      }
    }
  }

  get(guessIdx: number, answerIdx: number): Pattern {
    return this.data[guessIdx * this.numAnswers + answerIdx];
  }
}
```

**Build time:** ~10–30 seconds on startup. Cache to disk (`cache.bin`) after first build.

---

## 7. Filter

Given current state, filter candidate answers to those consistent with all feedback so far.

```typescript
function isCandidate(word: string, state: GameState): boolean {
  // Check greens
  for (const [pos, letter] of state.greens) {
    if (word[pos] !== letter) return false;
  }
  // Check yellows — letter must be present but NOT at forbidden positions
  for (const [letter, forbiddenPositions] of state.yellows) {
    if (!word.includes(letter)) return false;
    for (const pos of forbiddenPositions) {
      if (word[pos] === letter) return false;
    }
  }
  // Check min/max counts (handles duplicates correctly)
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const [letter, min] of state.minCounts) {
    if ((counts.get(letter) ?? 0) < min) return false;
  }
  for (const [letter, max] of state.maxCounts) {
    if ((counts.get(letter) ?? 0) > max) return false;
  }
  return true;
}
```

**Use `minCounts`/`maxCounts`, NOT a simple grey set.** A letter can be "grey" in one position while still being present elsewhere in the word — the grey signal really means "no more of this letter than already marked green/yellow."

---

## 8. Entropy Scorer

For each candidate guess, bucket remaining answers by the pattern they'd produce, then compute Shannon entropy.

```typescript
function entropyForGuess(
  guessIdx: number,
  remainingAnswerIndices: number[],
  cache: PatternCache
): number {
  const buckets = new Int32Array(243); // 243 possible patterns
  for (const aIdx of remainingAnswerIndices) {
    buckets[cache.get(guessIdx, aIdx)]++;
  }
  const total = remainingAnswerIndices.length;
  let entropy = 0;
  for (let i = 0; i < 243; i++) {
    if (buckets[i] === 0) continue;
    const p = buckets[i] / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function pickBestGuess(state: GameState, cache: PatternCache): string {
  // Hardcoded opener — don't recompute
  if (state.turn === 1) return 'salet';

  const remaining = state.candidates;
  // Endgame: ≤2 candidates, just guess one
  if (remaining.length <= 2) return remaining[0];

  // Endgame: late turn with few candidates — prefer guessing a candidate
  //   over maximum-info probe (can't afford another turn)
  const preferCandidate = state.turn >= 5 || remaining.length <= 3;
  const pool = preferCandidate ? remaining : ALL_GUESSES;

  let bestGuess = pool[0];
  let bestScore = -1;
  for (const guess of pool) {
    const score = entropyForGuess(indexOf(guess), indicesOf(remaining), cache);
    // Tiebreaker: if two guesses have equal entropy, prefer one in candidate set
    //   (could be the answer — saves a turn)
    if (score > bestScore ||
        (score === bestScore && remaining.includes(guess) && !remaining.includes(bestGuess))) {
      bestGuess = guess;
      bestScore = score;
    }
  }
  return bestGuess;
}
```

### Key heuristics

- **Hardcoded opener:** Always SALET. Saves ~2 seconds per game.
- **Two-candidate rule:** Never probe with 2 left — 50/50 is worth the shot.
- **Late-turn override:** On turn 5+, only guess actual candidates (can't afford a wasted probe).
- **Candidate tiebreaker:** Among equal-entropy guesses, prefer one in the remaining candidate set — it might be the answer.

---

## 9. Controller + CLI

```typescript
// Pseudocode for the interactive loop
async function playInteractive() {
  const state = new GameState(ALL_ANSWERS);
  while (state.turn <= 6) {
    const guess = pickBestGuess(state, cache);
    console.log(`Turn ${state.turn}: guess "${guess.toUpperCase()}"`);
    const feedback = await prompt(
      'Enter feedback (G=green, Y=yellow, .=grey, e.g. "gy..g"): '
    );
    if (feedback === 'ggggg') {
      console.log(`Solved in ${state.turn} guesses!`);
      return;
    }
    state.applyFeedback(guess, feedback);
    state.candidates = state.candidates.filter(w => isCandidate(w, state));
    state.turn++;
    console.log(`  ${state.candidates.length} candidates remaining`);
  }
  console.log('Failed to solve in 6 guesses.');
}
```

CLI should accept feedback as `gy..g` or `21002` — whichever feels natural.

---

## 10. Testing Strategy

### Unit tests (must pass before anything else)

1. `feedback.test.ts` — all 6 duplicate-letter cases from section 5
2. `filter.test.ts` — verify filter respects greens, yellows, and dupe counts
3. `scorer.test.ts` — SALET against full answer list should score ~5.87 bits

### Integration test

Play all 2,309 answers; assert:

- **Avg guesses < 3.50** (target: ~3.43)
- **Max guesses ≤ 6** (no losses)
- **Win rate = 100%**

Log any game taking ≥5 guesses for inspection.

---

## 11. Build & Run

```bash
npm install
npm test              # must pass all feedback tests
npm run build-cache   # builds ~34MB pattern cache, ~20s
npm run play          # interactive CLI
npm run benchmark     # plays all 2309 answers, prints stats
```

Target benchmark output:

```
Played 2309 games
Avg guesses: 3.43
Max guesses: 5
Win rate: 100%
Distribution: { 1: 1, 2: 78, 3: 1050, 4: 1080, 5: 100, 6: 0, FAIL: 0 }
```

---

## 12. Out of Scope (Explicitly Do Not Build)

- Hard mode (different optimal tree, adds complexity for no gameplay benefit)
- Wordle variants (Quordle, Absurdle, Duotrigordle)
- LLM integration in the solve loop (breaks constraint tracking, adds latency)
- Neural net scorer (empirically worse than entropy for this problem)
- Web UI (CLI is faster for daily use)
- Auto-scraping NYT Wordle (just type the answer after playing)

---

## 13. Future Enhancements (Only If Bored)

Listed in order of effort vs payoff:

1. **One-ply lookahead scorer** — score each guess by "expected remaining candidates after best follow-up." ~10x slower, closes most of the 3.43 → 3.42 gap. Worth it only for the learning.
2. **Post-game analysis with Claude** — log every game, feed the log to Claude for pattern analysis ("your friend X consistently wastes turn 3 on re-probing already-known letters"). The one legit AI integration.
3. **Chrome extension** — auto-read the board from the NYT site. Defeats the purpose of playing but fun to build.
4. **Solver-vs-solver league** — compare entropy, one-ply, minimax, and frequency heuristics on the same daily answer.

---

## 14. Quick Reference — What Claude Code Should Do First

1. Scaffold the project structure from section 3
2. Implement `feedback.ts` + its tests — **DO NOT PROCEED until all 6 duplicate cases pass**
3. Implement `patternCache.ts` with disk serialization
4. Implement `filter.ts` + tests
5. Implement `scorer.ts` with SALET hardcoded
6. Implement `controller.ts` + `cli.ts`
7. Run the integration benchmark — assert avg < 3.50

If benchmark fails: the bug is almost certainly in feedback or filter, not scorer. Re-check duplicate letter handling first.

---

## 15. Word Lists

Source: https://gist.github.com/cfreshman

- Answers: `cfreshman/wordle-answers-alphabetical.txt` (~2,309 words)
- Guesses: `cfreshman/wordle-allowed-guesses.txt` (~10,657 words; combine with answers for full ~12,972 set)

Download these into `src/data/` as TypeScript string arrays. Do not fetch at runtime.
