# 03 Environment

Typed, validated env vars across modes (`development`, `e2e`, `production`) for SvelteKit, CLI, and drizzle-kit.

Variables needed so far:

| Variable             | Notes                                                           |
| -------------------- | --------------------------------------------------------------- |
| `DATABASE_APP_URL`   | SQLite file path, per mode                                      |
| `DATABASE_AUDIT_URL` | Optional; audit logging off when unset                          |
| `SITE_NAME`          | Public                                                          |
| `SENTRY_DSN`         | Public, optional                                                |
| `BUILD_ID`           | Production only, if [04](./04-build-output.md) picks an env var |

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

- [ ] Every variable is declared once, with a schema; the app fails fast on invalid values.
- [ ] CLI scripts and drizzle-kit read the same variables with the same validation.
- [ ] Audit logging can't be enabled in development.
- [ ] Local overrides and secrets go in gitignored `*.local` files; an example file documents them.
- [ ] E2E can never touch the development or production database.
