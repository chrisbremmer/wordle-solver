// Pattern cache — see spec §6.
//
// Holds getPattern(guess, answer) for every (guess, answer) pair as a flat
// Uint8Array. Pattern fits in a byte (0..242) so storage is exactly
// |guesses| × |answers| bytes (~155MB for the full 12,972 × 2,315 set;
// the spec quoted ~34MB based on smaller lists).

import { getPattern, type Pattern } from './feedback.js';

/** Magic header so a stale or wrong file fails loudly instead of silently. */
const MAGIC = 0x57535043; // "WSPC" big-endian
const VERSION = 1;
const HEADER_BYTES = 16; // magic(4) + version(4) + numGuesses(4) + numAnswers(4)

export class PatternCache {
  readonly guesses: readonly string[];
  readonly answers: readonly string[];
  readonly guessIndex: Map<string, number>;
  readonly answerIndex: Map<string, number>;
  private readonly data: Uint8Array;

  private constructor(
    guesses: readonly string[],
    answers: readonly string[],
    data: Uint8Array,
  ) {
    this.guesses = guesses;
    this.answers = answers;
    this.data = data;
    this.guessIndex = new Map(guesses.map((w, i) => [w, i]));
    this.answerIndex = new Map(answers.map((w, i) => [w, i]));
  }

  /** Build the cache from scratch. ~10–30s on the full lists. */
  static build(guesses: readonly string[], answers: readonly string[]): PatternCache {
    const data = new Uint8Array(guesses.length * answers.length);
    const nA = answers.length;
    for (let g = 0; g < guesses.length; g++) {
      const guess = guesses[g]!;
      const base = g * nA;
      for (let a = 0; a < nA; a++) {
        data[base + a] = getPattern(guess, answers[a]!);
      }
    }
    return new PatternCache(guesses, answers, data);
  }

  get(guessIdx: number, answerIdx: number): Pattern {
    return this.data[guessIdx * this.answers.length + answerIdx]!;
  }

  /** Convenience: pattern lookup by word. Throws on unknown words. */
  patternFor(guess: string, answer: string): Pattern {
    const g = this.guessIndex.get(guess);
    const a = this.answerIndex.get(answer);
    if (g === undefined) throw new Error(`unknown guess: "${guess}"`);
    if (a === undefined) throw new Error(`unknown answer: "${answer}"`);
    return this.get(g, a);
  }

  /** Pack header + payload into a single buffer suitable for fs.writeFile. */
  serialize(): Uint8Array {
    const out = new Uint8Array(HEADER_BYTES + this.data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, MAGIC, false);
    view.setUint32(4, VERSION, false);
    view.setUint32(8, this.guesses.length, false);
    view.setUint32(12, this.answers.length, false);
    out.set(this.data, HEADER_BYTES);
    return out;
  }

  /**
   * Reconstruct from disk bytes. The caller passes the in-memory word lists
   * and we verify the counts match the header — this catches stale cache
   * files (e.g. written before the answer list was updated).
   */
  static deserialize(
    bytes: Uint8Array,
    guesses: readonly string[],
    answers: readonly string[],
  ): PatternCache {
    if (bytes.length < HEADER_BYTES) {
      throw new Error('pattern cache: file too short');
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint32(0, false);
    const version = view.getUint32(4, false);
    const nG = view.getUint32(8, false);
    const nA = view.getUint32(12, false);
    if (magic !== MAGIC) throw new Error('pattern cache: bad magic header');
    if (version !== VERSION) {
      throw new Error(`pattern cache: version ${version} != expected ${VERSION}`);
    }
    if (nG !== guesses.length || nA !== answers.length) {
      throw new Error(
        `pattern cache: header (${nG}, ${nA}) does not match wordlists (${guesses.length}, ${answers.length}). Rebuild with \`npm run build-cache\`.`,
      );
    }
    const expectedSize = HEADER_BYTES + nG * nA;
    if (bytes.length !== expectedSize) {
      throw new Error(
        `pattern cache: payload size ${bytes.length - HEADER_BYTES} != expected ${nG * nA}`,
      );
    }
    return new PatternCache(guesses, answers, bytes.slice(HEADER_BYTES));
  }
}
