# CLAUDE.md

Interim rules while `specs/` is in progress. [13](./specs/13-agent-docs.md) replaces this with `AGENTS.md`.

## Code

- Use library defaults. No custom error messages:
  - Runtime checks: `node:assert/strict` (`ok`, `equal`, `deepEqual`).
  - Valibot: default messages. Exception: secrets, see `.env.local.example`.
- Prefer plain library calls over project helpers. Inline a helper with one or two callers.
- Use subpath imports (`#…`, see `package.json` `imports`), even within the same folder. Use `./` only where none applies.
- Build file paths with `node:path` (`join`), not string templates.
- No bare `as const`. Add `satisfies` with the narrowest type that fits, e.g. `as const satisfies readonly SoftDeleteReason[]`.
- Declare a derived type right above its source: `export type UserRole = …;` then `export const userRoles = …`.
- Separate steps with a blank line, and put one around multi-line statements. Keep related one-liners (e.g. a group of `expect`s) together.
- Assert invariants the schema guarantees (`ok`). Return falsy only for guards.
- Names:
  - Name what a value is, not its shape: `loginIds`, `activeUser`, `actorId`, not `ids`, `current`, `by`, `r`. Booleans read as predicates (`isValid`).
  - Don't destructure to shorten access. Keep the object and read its fields (`user.id`, `login.id`), including parameters and `test.for` cases. Exception: `{ default: x }` from a dynamic import.
- In `src/env.ts`, set `public` and `static` explicitly on every variable.
- Tests:
  - Put them next to the file they test (`x.ts` → `x.test.ts`).
  - Use `describe` only when a file tests several units.
  - Name fixed values (`USER_ID`, `MISSING_ID`), not bare literals.
- Comments:
  - Keep them short.
  - Only full sentences end with appropriate punctuation. Start comments on their own line uppercase, and trailing ones lowercase (`// expired`).
  - Put a comment for a multi-line expression on its own line above it.
  - Say what the code can't (`// procedures only`), not what the value already says.
  - Write links as full URLs, so they're clickable: `See <URL>`, with no period after the URL.

## Workflow

- Update the relevant spec's `## Decisions` when a decision changes.
- Ask before running migrations.
