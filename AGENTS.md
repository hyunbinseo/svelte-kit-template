# AGENTS.md

## Code Style

Beyond lint (`eslint.config.js`):

- Build file paths with `node:path`.
- Read `user.id`, not `const { id } = user`. Destructure only where no such name exists: an argument object, `$props()`, `{ default }` from a dynamic import.
- No single-call wrappers. A helper must hide logic.
- Name what a value is (`activeUser`, not `data`).
- Booleans read as predicates (`isValid`, `hasRole`). Names that mirror an HTML attribute stay (`disabled`).
- A literal used more than once is a named constant (`USER_ID`).
- Check with `node:assert/strict` or Valibot, not hand-rolled `if`/`throw`. Exception: a CLI script's expected failure ([02](specs/02-cli-separation.md) rule 14).
- Keep library default messages (assertions, Valibot).
- Blank lines separate steps within a function and surround each multi-line statement. Related one-liners stay together.
- Comment briefly, only what the code and docs don't say. Full sentences end with punctuation. A link is a full URL with no trailing period (`// See <URL>`).
