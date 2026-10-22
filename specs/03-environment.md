# 03 Environment

Typed, validated env vars across modes (`development`, `e2e`, `production`) for SvelteKit, CLI, and drizzle-kit.

Variables needed so far:

| Variable     | Notes                                            |
| ------------ | ------------------------------------------------ |
| `DATA_DIR`   | Optional; database directory, defaults to `data` |
| `SITE_NAME`  | Public                                           |
| `SENTRY_DSN` | Public, optional                                 |

Plus adapter-node's `HOST`, `PORT`, `ADDRESS_HEADER`, `XFF_DEPTH` in production.

## Ideas

- As few committed env files as possible; decide which (`.env`, `.env.[mode]`) the template ships.
- One schema shared by SvelteKit (`defineEnvVars`) and CLI, instead of ad hoc asserts in scripts.
- This is a Vite project: env files load by mode (e.g. `vite dev` loads `.env`, `.env.development`).

  ```
  .env                # loaded in all cases
  .env.local          # loaded in all cases, ignored by git
  .env.[mode]         # only loaded in specified mode
  .env.[mode].local   # only loaded in specified mode, ignored by git
  ```

- Use Vite's `.gitignore` (`*.local`) instead of ignoring `.env*`.

## Checklist

- [x] Every variable is declared once, with a schema; the app fails fast on invalid values.
- [x] CLI scripts and drizzle-kit read the same variables with the same validation.
- [x] Audit logging can't be enabled in development.
- [x] Local overrides and secrets go in gitignored `*.local` files.
- [x] E2E can never touch the development or production database.

## Decisions

- Env schemas in `src/lib/env.ts`, one Valibot object schema per consumer, named per Valibot's [naming convention](https://valibot.dev/guides/naming-convention/): `AppEnvSchema` (`SITE_NAME`, `SENTRY_DSN`), `DbEnvSchema` (`DATA_DIR`), `AdapterNodeEnvSchema`. No SvelteKit or Vite imports (they'd break `cli/canary.ts`, see [02](./02-cli-separation.md)). `src/env.ts` lists each variable with its module's schema plus SvelteKit's `description`, `public`, and `static`, which only SvelteKit uses. The CLI parses each value it needs on its own (e.g. `v.parse(DbEnvSchema.entries.DATA_DIR, env.DATA_DIR)`): a failed `v.parse` prints its whole input, so parsing the full env could print secrets. Tests check that modules don't declare the same variable (`src/lib/env.test.ts`) and that `src/env.ts` lists every `AppEnvSchema` and `DbEnvSchema` variable with its schema (`src/env.test.ts`). Rejected: one record in SvelteKit's shape (needs a custom `validateEnv` to parse), and carrying SvelteKit's config on the schemas (`v.description`, `v.metadata`) to map it back in `src/env.ts`. The rules are the same in every mode; mode-specific behavior (database paths, audit) lives in code (`src/db/server/shared.ts`).
- No expansion: values must not contain `$`, escaped or not. Vite expands `$NAME` with dotenv-expand ([docs](https://vite.dev/guide/env-and-mode#env-files)) and can't turn it off; Node.js `--env-file` doesn't expand. Noted in `.env`, not checked: only env file values are expanded, so a schema check would also reject a `$` set by the process env. Rejected: expanding in the CLI too (`dotenv-expand`).
- Committed: `.env` (shared: `SITE_NAME`, plus which tools load it automatically) and `.env.production` (adapter-node settings for the default deployment, a reverse proxy on the same host; hosts override them in `.env.production.local`). `node build` doesn't load env files (adapter-node only reads `process.env`; without them it listens on `0.0.0.0`), so the production start command must load them: `node --env-file=.env --env-file-if-exists=.env.local --env-file=.env.production --env-file-if-exists=.env.production.local build` (later files win, the process env wins over all, like Vite). Lives in the container image's start command ([12](./12-operations.md)), not a `start` script. No `.env.development` or `.env.e2e`: nothing differs yet. All values are non-secret and quoted. `.env.local.example` is where secrets go, with a note on keeping their values out of validation messages. `.gitignore` uses Vite's `*.local` instead of `.env*`.
- The mode is named `e2e`, not `test`: Vitest runs in mode `test` and would load `.env.test`.
- Databases: `[DATA_DIR]/[mode]/[app|audit].db`, built in code (`prepareDatabaseFile`, which creates `[DATA_DIR]/[mode]/` as `700` and asserts it's still `700`; `DATA_DIR` itself isn't checked), e.g. `data/production/app.db`. Only `DATA_DIR` is configurable (default `data`, gitignored), so no mode can open another mode's database and the app and audit databases can't be swapped. One directory per mode, so resetting a mode is `rm -rf data/[mode]`, `-wal`/`-shm` files included. Relative to the working directory, so it works on Windows too; the production server runs from the project root. Directories are created on connect (`node:sqlite` doesn't), mode `700` so other Linux users can't read them. On a server, deploys must not delete `data/` ([12](./12-operations.md)). Rejected: `DATABASE_APP_URL`/`DATABASE_AUDIT_URL` validated to end with `[mode]/[app|audit].db` (two variables that could only change the parent directory); `db/` (reads like code, next to `src/db/`); one shared `data/` with the mode in file names (resetting a mode means matching files); an absolute path like `/var/lib/app/` (doesn't exist on Windows).
- Audit logging is on in every mode except development (`isAuditEnabled`), so production is always audited and e2e runs like production. Not configurable: no variable can turn it off in production or on in development.
- Empty values are rejected; comment out unset variables instead. Plain Valibot schemas, no helpers. Valibot's default messages include the value, which is fine while nothing is secret; a secret needs custom messages or a redaction API ([valibot#1440](https://github.com/open-circle/valibot/issues/1440)).
- `SITE_NAME` and `SENTRY_DSN` are public and `static`: inlined at build, so Sentry code can be dropped when unset ([10](./10-observability.md)). The rest are read at startup.
- adapter-node's `HOST`, `PORT`, `ADDRESS_HEADER`, `XFF_DEPTH` aren't declared: app code doesn't import them, adapter-node reads them from `process.env` itself, and SvelteKit would only check them at production start (they're unset in other modes). adapter-node reads more variables than these, so declaring them would cover only part of it. `AdapterNodeEnvSchema` keeps their schemas and descriptions for a check before launching the app (not built yet). `.env.production` sets them for the reverse-proxy setup. `vpr preview` ignores them (Vite's server, not adapter-node's). No `BUILD_ID`: [04](./04-build-output.md) identifies builds by git commit SHA at build time.
- Fail fast: the production server (`node build`) exits at startup on invalid values. `vpr build` also validates runtime values (SvelteKit's route analysis runs the server with the build env), so a production build uses `.env.production`'s values, like `vpr preview`. In dev, SvelteKit reports invalid values on the first request (500 with the issue list), not at startup; accepted, since validating in `vite.config.ts` would also run for `vp fmt` and `vp test`.
- E2E builds and previews with `--mode e2e` (`playwright.config.ts`).
- Unit tests use Vitest's `expect`: `requireAssertions` doesn't count `node:assert` calls. [11](./11-testing.md) reconciles this with its `node:assert/strict` rule.
- Valibot added as a devDependency, like the other packages (adapter-node bundles it). The CLI imports it at runtime, so production installs need devDependencies until [04](./04-build-output.md)/[12](./12-operations.md) decide.
