# 03 Environment

**Goal**: Every env var is declared once with a schema, and SvelteKit and CLI scripts load and validate it the same way in every mode.

## Rules

### Modes

1. Modes are `development`, `e2e`, and `production`. Why `e2e`, not `test`: Vitest runs in mode `test` and would load `.env.test`.
2. Schemas don't depend on the mode. Where modes must differ for safety (e.g. e2e never opening the production database), code derives it from the mode, not from a variable.

### Env Files

3. Env files (`.env`, `.env.[mode]`, and their `.local` variants) follow [Vite's names and order](https://vite.dev/guide/env-and-mode#env-files).
4. `.gitignore` ignores `*.local`, as Vite's does, not `.env*`.
5. Committed: `.env`, with values shared by every mode. A mode file (e.g. `.env.production`) is added when a value first differs by mode.
6. Committed values are non-secret.
7. Values are quoted.
8. Secrets go in `*.local` files. `.env.local.example` lists their names, added with the first secret.
9. Values never contain `$`, even escaped. Why: Vite expands `$NAME` with no opt-out, and Node.js's `--env-file` reads `\$` literally. Stated in a `.env` comment, not checked.
10. Empty values are invalid. An unset variable is commented out.

### Redaction

11. `parseRedacted` parses like Valibot's `parse`, but its thrown `ValiError` holds no input value, in any field or message. Path keys stay, for `flatten`. Why: Valibot's errors hold the input, even with custom messages ([open-circle/valibot#1440](https://github.com/open-circle/valibot/issues/1440)).
12. Lint bans importing `parse` from `valibot`, pointing to `parseRedacted`. `safeParse` stays allowed: its issues are returned, not thrown.
13. A test fails `parseRedacted` if any input value appears in the fully inspected error (`node:util`'s `inspect` at unlimited depth), for object, pipe, and union schemas, and for a message set with `setSpecificMessage`.

### Schemas

14. `src/lib/env.ts` holds the mode schema and one Valibot object schema per consumer (e.g. `AppEnvSchema`), named per [Valibot's convention](https://valibot.dev/guides/naming-convention/). It imports neither SvelteKit nor Vite, so `cli/` can import it ([02](./02-cli-separation.md)).
15. `src/env.ts` declares each variable SvelteKit reads, validated with `parseRedacted` and its schema from `src/lib/env.ts`. `description`, `public`, and `static` live only here.
16. Tests check that no variable is in two schemas, that every variable rejects an empty value, and that `src/env.ts` declares every variable of the schemas SvelteKit reads.
17. `SITE_NAME` is the first variable: required, public, and static.

### CLI

18. Scripts run as `MODE=[mode] node [script]`, from a `package.json` script. Why `MODE`, not `--mode`: drizzle-kit takes no such flag, and one spelling should serve both.
19. On import, `cli/lib/env.ts` validates `MODE`, loads its env files into `process.env` with Vite's `loadEnv`, then exports `mode` and each schema the CLI reads, parsed with `parseRedacted` (e.g. `appEnv`). Scripts and tool configs (e.g. drizzle-kit, Playwright) import it, and lint bans `process.env` elsewhere in both. Why on import: ESM runs imports before the importer's body.

## Files

- `src/lib/valibot.ts`: `parseRedacted`.
- `src/lib/env.ts`: `ModeSchema`, `Mode`, `AppEnvSchema`.
- `src/env.ts`: `variables`.
- `cli/lib/env.ts`: `mode`, `appEnv`.
- `.env`.

## Checks

- [ ] A missing or empty `SITE_NAME` fails `vpr build` and `node build`, and the first dev request (try each, then revert).
- [ ] A sample script run with `MODE=e2e` reads `.env` and `.env.e2e.local` values through `appEnv`, and a process env value wins over both (try it, then revert).
- [ ] An unknown or missing `MODE` fails importing `cli/lib/env.ts`.
- [ ] Reading `process.env` in a `cli/` script fails lint.
- [ ] A `.env.local` file is untracked.
- [ ] The rule 13 test fails when any redaction step is removed (try each, then revert).
- [ ] Importing `parse` from `valibot` fails lint.
- [ ] The rule 16 tests fail when `src/env.ts` misses a variable (try it, then revert).
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
