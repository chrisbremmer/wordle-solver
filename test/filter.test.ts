// Filter tests (spec §7) — verify isCandidate respects greens, yellows, and
// min/max counts (NOT a flat grey set).

import { describe, it } from 'vitest';

describe('isCandidate (spec §7)', () => {
  it.todo('keeps words matching every green');
  it.todo('rejects words missing a yellow letter');
  it.todo('rejects words placing a yellow at a forbidden position');
  it.todo('respects minCounts (e.g. two Es required)');
  it.todo('respects maxCounts (e.g. only one E allowed)');
});
