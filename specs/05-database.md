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
- [ ] Generate/migrate scripts exist per DB and environment; production migration reads production env.
- [ ] Connections close on `sveltekit:shutdown`.
- [ ] Drizzle query errors never expose query params in messages or `inspect()` output — tested. (Drizzle includes them by default; find the lightest fix.)

## Decisions

- The SvelteKit client (`src/db/server/app/client.ts`) opens `:memory:` while `building` (build analysis and prerendering), so `vpr build` creates no files, e.g. no `data/` in the image ([12](./12-operations.md)). Prerendered pages can't read the database.
