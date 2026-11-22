# AGENTS.md

## Code Style

Beyond lint (`eslint.config.js`):

- Modules are `.js` or `.ts`. Exception: a config a tool reads only as CommonJS (e.g. PM2's) is `.cjs`.
- Build file paths with `node:path`.
- Read `user.id`, not `const { id } = user`. Destructure only where no such name exists: an argument object, `$props()`, `{ default }` from a dynamic import.
- No single-call wrappers. A helper must hide logic.
- Name what a value is (`activeUser`, not `data`).
- Booleans read as predicates (`isValid`, `hasRole`). Names that mirror an HTML attribute stay (`disabled`).
- A literal used more than once is a named constant (`USER_ID`).
- Check with `node:assert/strict` or Valibot, not hand-rolled `if`/`throw`. Exception: a CLI script's expected failure ([02](specs/02-cli-separation.md) rule 14).
- Write Drizzle queries and constraints with its builders and operators. Use `sql` only where none exists.
  - A literal in DDL (a `CHECK`, an index's `where`) goes in `sql`'s template text, not interpolated: drizzle-kit writes a bound value as `?` ([drizzle-orm#3144](https://github.com/drizzle-team/drizzle-orm/issues/3144)).
- Keep library default messages (assertions, Valibot).
- Blank lines separate steps within a function and surround each multi-line statement. Related one-liners stay together.
- Comment briefly, only what the code and docs don't say. Full sentences end with punctuation. A link is a full URL with no trailing period (`// See <URL>`).
