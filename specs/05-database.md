# 05 Database

SQLite foundation: connections, schema, migrations, and two databases — `app` (application data) and `audit` (query log, [07](./07-audit-logging.md)).

App schema to support (columns are a starting point, not a contract):

- `user` — contact, created by, soft-delete (deactivated at/by)
- `user_profile` — 1:1 with user, created on onboarding (birth date)
- `user_role` — role, assigned by, soft-delete (revoked at/by/reason); one active row per user and role
- `user_session` — secret hash, created/expires at, IP, soft-delete (revoked at/by/reason)
- `login` — contact, optional user, code, expires at, IP, send ID
- `login_attempt` — success flag, attempted at, IP

## Ideas

- Soft-delete column groups stay consistent via `CHECK` constraints.
- Filtered unique indexes for "one active row" rules.
- One drizzle-kit config per DB, environment chosen by mode.
- Decide whether the template ships app migrations or lets each project generate the first one.

## Checklist

- [ ] All connections share one factory: busy timeout (concurrent processes wait instead of failing), WAL.
- [ ] Schema conventions (naming, soft delete, constraints, indexes) are consistent and documented.
- [x] Generate/migrate scripts exist per DB and environment; production migration reads production env.
- [ ] Connections close on `sveltekit:shutdown`.
- [ ] Drizzle query errors never expose query params in messages or `inspect()` output — tested. (Drizzle includes them by default; find the lightest fix.)

## Decisions

- drizzle-kit configs: one per database, `cli/db/drizzle-kit/[database].ts`. Each is one line calling `defineDatabaseConfig(database)` (`cli/db/drizzle-kit/config.ts`), which reads the mode from `MODE` (required, one of `development`, `e2e`, `production`, so a typo can't create a new data directory), loads the mode's env files with `process.loadEnvFile` (highest precedence first, since it never overrides), parses `DATA_DIR`, builds the path, and creates its directory. drizzle-kit has no `--mode` or `--env-file` flag ([drizzle-team/drizzle-orm#4588](https://github.com/drizzle-team/drizzle-orm/issues/4588)), so scripts prefix `MODE=[mode]`, once per `&&` command; `vpr` applies the prefix itself, so it works on Windows ([voidzero-dev/vite-plus#3140](https://github.com/voidzero-dev/vite-plus/issues/3140)). The repo requires Vite+, so `pnpm run` on Windows isn't supported. It's the one CLI exception that reads env files in TS ([02](./02-cli-separation.md)). drizzle-kit also loads `.env` into `process.env` before its config runs ([v0.20.0](https://github.com/drizzle-team/drizzle-kit-mirror/releases/tag/v0.20.0)), so `.env` values outrank `.env.local` and `.env.[mode]`. Accepted: don't set `DATA_DIR` in `.env` (noted there). Rejected: a custom env file reader that worked around this. Rejected: one config per database and mode (`[mode].[database].ts`, five files).
- Migrations: `drizzle/app/` and `drizzle/audit/`. Schemas: `src/db/server/app/schema.ts` and `src/db/server/audit/schema.ts` (empty until [07](./07-audit-logging.md)).
- Scripts: `db:generate:app`, `db:generate:audit` (generate doesn't connect, so any mode's config works; audit uses `e2e`, since development has no audit database and `production` would load `.env.production` and create `data/production/` locally); `db:migrate:[mode]` migrates every database of the mode; `db:push` and `db:studio` are development only.
- The SvelteKit client (`src/db/server/app/client.ts`) opens `:memory:` while `building` (build analysis and prerendering), so `vpr build` creates no files, e.g. no `data/` in the image ([12](./12-operations.md)). Prerendered pages can't read the database.
