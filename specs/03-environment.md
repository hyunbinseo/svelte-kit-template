# 03 Environment

**Goal**: Every env var is declared once with a schema, and SvelteKit and CLI scripts load and validate it the same way in every mode.

## Rules

### Modes

1. Modes are `development`, `preview`, `e2e`, and `production`. `preview` tries a production build locally, without production's env files or data; `vpr preview` builds and serves in it. `e2e`, not `test`, since Vitest runs in mode `test` and would load `.env.test`.
2. Schemas don't depend on the mode. Where modes must differ for safety (e.g. e2e never opening the production database), code derives it from the mode, not from a variable.

### Env Files

3. Env files (`.env`, `.env.[mode]`, and their `.local` variants) follow [Vite's names and order](https://vite.dev/guide/env-and-mode#env-files).
4. `.gitignore` ignores `*.local`, as Vite's does, not `.env*`.
5. `.env` is committed, with values shared by every mode. A mode file (e.g. `.env.production`) is added once a value differs.
6. Committed values are non-secret.
7. Values are quoted, since Vite and Node.js both cut an unquoted value at `#`.
8. Secrets go in `*.local` files. `.env.local.example` lists their names, added with the first secret.
9. Values never contain `$`, even escaped: Vite expands `$NAME` with no opt-out, and Node.js's `--env-file` reads `\$` literally. A `.env` comment states it. Not checked; accepted.
10. Empty values are invalid. An unset variable is commented out.

### Redaction

11. `parseRedacted` parses like Valibot's `parse`, but its thrown `ValiError` holds no input value, in any field or message, since Valibot's errors hold the input even with custom messages ([open-circle/valibot#1440](https://github.com/open-circle/valibot/issues/1440)). Path keys stay, for `flatten`.
12. Lint bans importing Valibot's throwing APIs (`assert`, `parse`, `parser`, their async variants, and the `args` and `returns` actions), pointing to `parseRedacted`; the namespace import ban ([01](./01-conventions.md)) covers `v.parse`. `safeParse` stays allowed, since it returns its issues.
13. A test fails `parseRedacted` if any input value appears in the fully inspected error (`node:util`'s `inspect` at unlimited depth), for object, pipe, and union schemas, and for a message set with `setSpecificMessage`.

### Schemas

14. `src/lib/env.ts` holds the mode schema and one Valibot object schema per consumer (e.g. `AppEnvSchema`), named per [Valibot's convention](https://valibot.dev/guides/naming-convention/). It imports neither SvelteKit nor Vite, so `cli/` can import it.
15. `src/env.ts` declares each variable SvelteKit reads, validated with `parseRedacted` and its schema from `src/lib/env.ts`. `description`, `public`, and `static` live only here. Adapter-node's own variables (`ORIGIN`, `PORT`, `ADDRESS_HEADER`, …) aren't app env: the deploy unit sets them, and no schema declares them.
16. Tests check that no variable is in two schemas, that every variable rejects an empty value, and that `src/env.ts` declares every variable of the schemas SvelteKit reads.
17. `SITE_NAME` is the first variable: required, public, and static.

### CLI

18. Scripts that read env run as `MODE=[mode] node [script]`, from a `package.json` script. `MODE`, not `--mode`, since drizzle-kit takes no such flag.
19. On import, `cli/lib/env.ts` validates `MODE`, loads its env files into `process.env` with Vite's `loadEnv`, then exports `mode` and each schema the CLI reads, parsed with `parseRedacted` (e.g. `appEnv`). Scripts that read env and tool configs (e.g. drizzle-kit, Playwright) import it, and lint bans `process.env` elsewhere in `cli/` and tool configs.
20. `vite.config.ts` doesn't import `cli/lib/env.ts`, since Vite loads it in every mode, without `MODE`. It reads only variables its parent process sets, never env-file values. An inline disable marks each `process.env` use there, and in a script that extends a child process's env.

### Server

21. The production server runs `node` with `--env-file-if-exists` for each env file of mode `production`, in Vite's order, so it reads the files the build read; a process env value wins, as in Vite. `vpr start` runs it. Flags, not `loadEnv`, so the server doesn't depend on build tooling; neither Node's config file nor `NODE_OPTIONS` accepts env-file options.
22. Secrets are never `static`, so a changed secret applies on restart, without a rebuild ([12-Factor config](https://12factor.net/config)). A test fails when a variable in `.env.local.example` is `static`.

## Files

- `src/lib/valibot.ts`: `parseRedacted`.
- `src/lib/env.ts`: `ModeSchema`, `Mode`, `AppEnvSchema`.
- `src/env.ts`: `variables`.
- `cli/lib/env.ts`: `mode`, `appEnv`.
- `.env`.

## Checks

- [ ] A missing or empty `SITE_NAME` fails `vpr build` and the first dev request.
- [ ] A sample script run with `MODE=e2e` reads `.env` and `.env.e2e.local` values through `appEnv`, and a process env value wins over both.
- [ ] An unknown or missing `MODE` fails importing `cli/lib/env.ts`.
- [ ] `vpr preview` builds and serves in mode `preview`, reading `.env.preview` values.
- [ ] Reading `process.env` in a `cli/` script fails lint.
- [ ] A `.env.local` file is untracked.
- [ ] The rule 13 test fails when any redaction step is removed.
- [ ] Importing `parse`, `parser`, or `assert` from `valibot` fails lint.
- [ ] The rule 16 tests fail when `src/env.ts` misses a variable.
- [ ] `vpr start` reads `.env` and `.env.production.local` values, and a process env value wins over both.
- [ ] The rule 22 test fails when a secret is `static`.
