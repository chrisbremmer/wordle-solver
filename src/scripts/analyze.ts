// Post-game analysis with Claude (spec §13.2). Reads game logs from logs/
// and asks Claude to spot strategic patterns across them. Run with:
//
//   npm run analyze              — analyze every log under logs/
//   npm run analyze -- file.json — analyze specific files
//
// Requires ANTHROPIC_API_KEY in the environment.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { LOG_DIR, readAllLogs, readLogFile, type GameLog } from '../log.js';

const MODEL = process.env.WORDLE_ANALYZE_MODEL ?? 'claude-opus-4-7';
const SPEC_PATH = resolve(process.cwd(), 'docs/engineering-spec.md');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set.');
  console.error('Get a key at https://console.anthropic.com, then:');
  console.error('  export ANTHROPIC_API_KEY="sk-ant-..."');
  process.exit(2);
}

// CLI args: optional list of specific log files; default = all logs.
const args = process.argv.slice(2);
let logs: GameLog[];
if (args.length === 0) {
  logs = readAllLogs(LOG_DIR);
} else {
  logs = args
    .map((p) => readLogFile(resolve(p)))
    .filter((l): l is GameLog => l !== null);
}

if (logs.length === 0) {
  console.error('No game logs found.');
  console.error(`Play a game (npm run play) or generate logs from the benchmark:`);
  console.error('  npm run benchmark -- --sample 20 --log');
  process.exit(1);
}

console.error(`Analyzing ${logs.length} game${logs.length === 1 ? '' : 's'} with ${MODEL}…`);

const spec = readFileSync(SPEC_PATH, 'utf8');

// System block — frozen across runs, sized to qualify for Opus 4.7 caching
// (≥4K tokens; the spec alone is ~4K). Cache hits cost ~10% of write price,
// so repeat analyses on different log sets are cheap.
const systemBlocks: Anthropic.TextBlockParam[] = [
  {
    type: 'text',
    text: `You are a Wordle strategy coach. The user has built a TypeScript solver
that uses entropy-based scoring with a hardcoded SALET opener. They will give
you JSON traces of games the solver played. Your job is to spot strategic
patterns — both in the solver's behavior and in any hand-played games — and
produce concise, actionable findings.

The full engineering spec for the solver is below. Use it as ground truth
about how the solver is supposed to play, then compare against the actual
traces to find divergences and missed opportunities.

────────── ENGINEERING SPEC ──────────

${spec}

────────── ANALYSIS INSTRUCTIONS ──────────

For each batch of game traces, produce a report with these sections in order:

1. **Summary** — N games analyzed, distribution of guess counts, win rate,
   notable outliers.
2. **Per-game observations** — only for games that took ≥4 guesses or failed.
   Skim 1–2 sentences each. Cite the turn where the inefficiency happened.
3. **Cross-game patterns** — what does the solver (or human) consistently do
   wrong? Examples to look for:
     - re-probing already-known letters (ignoring greens/yellows)
     - guesses that violate min/max counts the state already learned
     - committing to a candidate guess when a high-entropy probe would have
       narrowed faster
     - on turn ≥5, scoring from the full guess pool instead of candidates
     - dup-letter mishandling (the #1 bug class — see spec §5)
4. **Recommendations** — concrete prompt-level changes (heuristic tweaks,
   tiebreaker adjustments, opener reconsideration). Tie each to the
   evidence from §2 / §3.

Keep the whole report under 600 words. Be direct. Cite specific game logs
by their answer (or "unknown" if not solved) so the user can find them.`,
    cache_control: { type: 'ephemeral' },
  },
];

const userText = `Here are ${logs.length} game traces in JSON form. Produce the report.

\`\`\`json
${JSON.stringify(logs, null, 2)}
\`\`\``;

const client = new Anthropic();

try {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system: systemBlocks,
    messages: [{ role: 'user', content: userText }],
  });

  for (const block of response.content) {
    if (block.type === 'text') process.stdout.write(block.text);
  }
  process.stdout.write('\n');

  console.error(
    `\n[usage] in=${response.usage.input_tokens}  ` +
      `cache_read=${response.usage.cache_read_input_tokens ?? 0}  ` +
      `cache_write=${response.usage.cache_creation_input_tokens ?? 0}  ` +
      `out=${response.usage.output_tokens}  ` +
      `stop=${response.stop_reason}`,
  );
} catch (err) {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error('Anthropic auth failed — check ANTHROPIC_API_KEY.');
    process.exit(2);
  }
  if (err instanceof Anthropic.RateLimitError) {
    console.error('Rate limited; try again in a minute.');
    process.exit(3);
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
    process.exit(4);
  }
  throw err;
}
