# CLAUDE.md

Interim rules while `specs/` is in progress. [13](./specs/13-agent-docs.md) replaces this with `AGENTS.md`.

## Code

- Use library defaults. No custom error messages:
  - Runtime checks: `node:assert/strict` (`ok`, `equal`, `deepEqual`).
  - Valibot: default messages. Exception: secrets, see `.env.local.example`.
- Prefer plain library calls over project helpers. Inline a helper with one or two callers.
- Use subpath imports (`#…`, see `package.json` `imports`), even within the same folder. Use `./` only where none applies.
- Build file paths with `node:path` (`join`), not string templates.
- In `src/env.ts`, set `public` and `static` explicitly on every variable.
- Tests:
  - Put them next to the file they test (`x.ts` → `x.test.ts`).
  - Use `describe` only when a file tests several units.
- Comments:
  - Keep them short.
  - Only full sentences end with appropriate punctuation.
  - Write links as full URLs, so they're clickable: `See <URL>`, with no period after the URL.

## Workflow

- Update the relevant spec's `## Decisions` when a decision changes.
- Ask before running migrations.
