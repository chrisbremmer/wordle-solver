// Integration benchmark (spec §10). Plays all answers; asserts:
//   - avg < 3.50 (target ~3.43)
//   - max ≤ 6 (no losses)
//   - win rate = 100%
// Logs any game ≥5 guesses for inspection.

import { describe, it } from 'vitest';

describe('integration benchmark (spec §10)', () => {
  it.todo('plays all 2,309 answers with avg < 3.50, max ≤ 6, 100% win rate');
});
