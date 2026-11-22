# AGENTS.md

## Code Style

Beyond lint (`eslint.config.js`):

- Names say what a value is and whose: `activeUser.id`, not `data.id` or a destructured `id` (in callbacks too).
- Booleans read as predicates (`isValid`, `hasRole`), except props mirroring an HTML attribute (`disabled`).
- A literal used more than once is a named constant (`USER_ID`).
- A helper must hide logic; no single-call wrappers.
- Build file paths with `node:path`.
- Check with `node:assert/strict` or Valibot, keeping their default messages.
  - No hand-rolled `if`/`throw`, except a CLI script's expected failure ([02](specs/02-cli-separation.md) rule 13).
- Write Drizzle queries and constraints with its builders and operators; `sql` only where none exists.
  - In DDL (`CHECK`, index `where`), write literals into `sql`'s text, not interpolated ([drizzle-orm#3144](https://github.com/drizzle-team/drizzle-orm/issues/3144)).
- Group related one-liners; blank lines go between groups and around multi-line statements.
- Comment briefly, only what the code and docs don't say.
  - Full sentences end with punctuation.
  - A URL ends the line (`// See https://example.com`).
