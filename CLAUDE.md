# CLAUDE.md

Interim rules while `specs/` is in progress. [13](./specs/13-agent-docs.md) replaces this with `AGENTS.md`.

## Code

- Use library defaults. No custom error messages:
  - Runtime checks: `node:assert/strict` (`ok`, `equal`, `deepEqual`).
  - Valibot: default messages. Exception: secrets, see `.env.local.example`.
- Prefer plain library calls over project helpers. Inline a helper with one or two callers.
- Use subpath imports (`#…`, see `package.json` `imports`), even within the same folder. Exceptions: SvelteKit's `./$types.ts`, and inline disables where no subpath applies (`src/env.test.ts`, `src/routes/+layout.svelte`).
- Build file paths with `node:path` (`join`), not string templates.
- No bare `as const`. Add `satisfies` with the narrowest type that fits, e.g. `as const satisfies readonly ReasonCode[]`.
- Declare a derived type right above its source: `export type UserRole = …;` then `export const userRoles = …`.
- Separate steps with a blank line, and put one around multi-line statements. Keep related one-liners (e.g. a group of `expect`s) together.
- Assert invariants the schema guarantees (`ok`). Return falsy only for guards.
- Names:
  - Name what a value is, not its shape: `loginIds`, `activeUser`, `actorId`, not `ids`, `current`, `by`, `r`. Booleans read as predicates (`isValid`).
  - Keep an object when it has a natural name, and read its fields: a row from `userTable` is `user`, read as `user.id` and `user.contact`, so each field carries its context. Destructure only when no such name exists, e.g. a query or procedure's argument object (`{ closedBy, userId }`, see [06](./specs/06-query-layer.md)) or `{ default: x }` from a dynamic import. Don't destructure just to shorten access.
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
