# 05 Database

**Goal**: SvelteKit, CLI scripts, and tests open the app's SQLite database the same way, from a schema that follows one set of conventions and ships its migrations.

## Rules

### Layout

1. Database code is server-only, in `src/db/server/[database]/`, reached through `#db/*` (e.g. `#db/app/user/schema.ts`): SvelteKit rejects client imports from any `server` directory ([server-only modules](https://svelte.dev/docs/kit/server-only-modules)). Code shared by every database sits in `src/db/server/shared/`.
2. `app` is the only database here; code is written per database name, so 08 Audit Logging adds `audit` beside it.
3. Inside a database folder, one folder per table name prefix (e.g. `user/` for `user`, `user_session`) holds that prefix's `schema.ts`, its test, and later its queries and commands.

### Files on Disk

4. A database's file is `[DATA_DIR]/[mode]/[database].db`, so modes never share one ([03](./03-environment.md) rule 2). `DATA_DIR` defaults to `data`, relative to the working directory, and `.gitignore` ignores `/data/`. `prepareDatabasePath` takes the mode as an argument, since `src/db/` can't read `import.meta.env` under `cli/`'s config ([02](./02-cli-separation.md) rule 5): the SvelteKit client passes `import.meta.env.MODE`, parsed with `ModeSchema` so an unknown mode fails, and `cli/` passes `mode`.
5. In mode `production`, a relative `DATA_DIR` fails, since the database can't live inside a release directory ([04](./04-build-output.md) rule 7). So `vpr start` in a checkout needs an absolute `DATA_DIR` in `.env.production.local`, migrated with `MODE=production node cli/db/migrate.ts`; accepted.
6. The mode's directory is created owner-only (`700`). An existing one with other permissions fails, except on Windows.
7. `deploy/app.service` sets an absolute `DATA_DIR`: a directory systemd creates for the service, outside the deploy root, shared by every release. Not the deploy root's `shared/`, so app state stays out of the deploy tree and systemd gives the directory the service's owner.
8. While `building`, the SvelteKit client opens `:memory:`, so a build creates no files and prerendered pages can't read the database; accepted.

### Connections

9. Every connection comes from `openConnection`: a 5-second busy timeout, so concurrent processes wait instead of failing, and WAL for file databases. Foreign keys stay on. Lint bans value imports from `node:sqlite` elsewhere; type imports stay allowed.
10. The SvelteKit client closes its connection on `sveltekit:shutdown`, except in dev, which doesn't emit it and would add a listener per module reload.
11. Query errors never hold bound values, in any field or message; SQL text stays. Drizzle omits them unless `paramsInErrors` is set ([drizzle-orm#5939](https://github.com/drizzle-team/drizzle-orm/issues/5939)). A test on a db from `createAppDb` fails when a prepare or run error's fully inspected output holds a bound value.

### Migrations

12. Migrations live in `drizzle/[database]/` and ship with the template, so a fresh clone or deployment works without generating.
13. Until the template's first release, a spec that changes the schema regenerates the single `init` migration instead of adding one.
14. `cli/db/drizzle-kit/[database].ts` is the drizzle-kit config for one database, reading env through `cli/lib/env.ts` (03 rule 19). `vpr db:generate` and `vpr db:studio` run it in mode `development`. drizzle-kit loads `.env` into `process.env` first ([drizzle-kit v0.20.0](https://github.com/drizzle-team/drizzle-kit-mirror/releases/tag/v0.20.0)), outranking the other env files, so a variable its config uses (`DATA_DIR`) is never set in `.env`, as a `.env` comment states; accepted.
15. No `db:push`: the schema changes only through migrations.
16. `cli/db/migrate.ts` applies every database's migrations for its mode with Drizzle's migrator on an `openConnection` connection, so it waits out the server's writes. Not `drizzle-kit migrate`, whose connection options may differ. `vpr db:migrate:development` and `vpr db:migrate:preview` run it; production uses rule 19's unit.
17. Starting the server never migrates. A production deploy migrates with rule 19's unit after `release:build` and before `release:activate`; neither script migrates.
18. The SvelteKit client fails on open when the database is behind the release's migrations in `drizzle/[database]/`, except while `building`. Ahead passes, so an older release starts (rule 20). `hooks.server.ts` imports `#db/app/client.ts`, so a skipped migration fails the server's start, not a request. Dev loads hooks on its first request; accepted.
19. `deploy/app-migrate@.service` is a sample oneshot unit, instanced by SHA: it runs `cli/db/migrate.ts` with that release's `node`, from that release, with `app.service`'s `DATA_DIR` and env files, so nothing is retyped. Every sample unit that opens a database runs as `app.service`'s user, so the files it creates (`-wal` and `-shm` included) stay openable by the server.
20. A migration runs while the previous release still serves, and stays in place when an older release is activated (04 rule 8); Drizzle can't revert one, so undoing a migration is a new one. So a migration must keep older releases working ([expand, then contract](https://martinfowler.com/bliki/ParallelChange.html)). Not checked; accepted.

### Tables

21. Tables are `snakeCase.table`.
22. A table whose ID reaches clients (URLs, forms, cookies) has a UUIDv7 primary key, `text`, defaulting to `node:crypto`'s `randomUUIDv7`, so IDs reveal no row counts and can't be guessed in sequence. They reveal creation time; accepted. Other tables use `integer().primaryKey({ autoIncrement: true })`. Either way, a deleted ID is never reused, since audit entries that outlive a purged row would point at a new one.
23. Columns stay in table order: schema files opt out of lint's sorted keys.
24. Foreign keys don't cascade or set null, since a cascade deletes from tables no logged statement names (08 Audit Logging). So deleting a still-referenced row fails, and a delete across tables deletes children first (06 Commands).
25. `user` holds `id` (a UUID) and `createdAt`. Later specs add the columns they need.

### Columns

26. Timestamps are `[verb]At`, `integer({ mode: 'timestamp_ms' })`, with no default, SQL or `$defaultFn`, so `Insert` requires them: commands pass the time they read (06 rule 16).
27. Actors are `[verb]By`, a nullable foreign key to `user`; `null` means the system, or no user yet. So a user referenced as an actor can't be deleted (rule 24).
28. Soft delete is a `[verb]At`/`[verb]By`/`[verb]Reason` group: a set `At` marks the row soft-deleted and requires `Reason`; `By` is its actor (rule 27). `Reason` and `By` stay null while `At` is.
29. A soft-deleted row is never restored; restoring means inserting a new row, and updates to a group match only rows whose `At` is null (06 Commands). Raw SQL can still restore one (rule 34); accepted.
30. Enums are `text({ enum })`, checked only by TypeScript and Valibot, since SQLite has no enum type; accepted. A list only grows, since stored rows may hold any value it ever had. Each list is one `as const` array, shared by the schema, Valibot, and UI labels.

### Constraints

31. "One active row" rules are unique indexes filtered on the group's `At` being null (e.g. one unrevoked grant per user and role).
32. Rules on a row's own columns that won't change are `CHECK`s (e.g. date format, hash length, expiry after creation).
33. A foreign key column gets an index where it's looked up.
34. No triggers, since drizzle-kit can't declare one and silently drops it when rebuilding a table ([drizzle-orm#6693](https://github.com/drizzle-team/drizzle-orm/issues/6693)).

### Personal Data

35. A user who leaves keeps their `user` row, closed (rule 28), and rows referencing it stay; closing erases their personal data, so the rest no longer identifies them. A project needing more may add a command that deletes a user's rows, children first, then the user; it fails while another row references them as an actor.
36. Personal data lives only where closing can erase it: nullable columns on `user` (e.g. `contact`), set to null, or tables keyed to the user (e.g. `user_profile`), whose rows are deleted. Free text a user writes into other tables isn't erased; accepted.

### Tests

37. `createTestAppDb` opens an in-memory db and applies every `drizzle/app/` migration, as production does. It's disposable with `using`.
38. Each `schema.ts` has a test next to it, with a `describe` per table, covering each of its constraints.

## Files

- `src/lib/env.ts`: `DbEnvSchema`.
- `src/env.ts`: `DATA_DIR` added.
- `src/db/server/shared/database.ts`: `DatabaseName`, `prepareDatabasePath`.
- `src/db/server/shared/connection.ts`: `openConnection`.
- `src/db/server/app/user/schema.ts`: `userTable`, `UserInsert`, `UserSelect`.
- `src/db/server/app/drizzle.ts`: `AppDb`, `createAppDb`.
- `src/db/server/app/client.ts`: `db`.
- `src/db/server/app/testing.ts`: `createTestAppDb`.
- `cli/lib/env.ts`: `dbEnv` added.
- `cli/db/drizzle-kit/app.ts`
- `cli/db/migrate.ts`
- `deploy/app-migrate@.service`
- `drizzle/app/[timestamp]_init/`

## Checks

- [ ] `vpr db:migrate:development` creates `data/development/app.db` in a `700` directory, and `vpr dev` reads it.
- [ ] A `700` check fails on a pre-existing `755` mode directory.
- [ ] The production server and `app-migrate@[sha]` fail with a relative `DATA_DIR`.
- [ ] After `vpr db:migrate:preview`, `vpr preview` opens `data/preview/app.db`.
- [ ] `vpr build` creates no `data/`.
- [ ] After a request to the built server, SIGTERM closes its connection (by hand: the listener runs).
- [ ] `vpr db:migrate:development` succeeds while another connection holds a write lock for under 5 seconds.
- [ ] A `node:sqlite` value import outside `connection.ts` fails lint; a type import passes.
- [ ] The rule 11 test fails with `paramsInErrors` set in `createAppDb`.
- [ ] Deleting a `user` that another row references fails (with a sample child table).
- [ ] A new `CHECK` without a regenerated migration fails its schema test.
- [ ] `vpr db:generate` on an unchanged schema generates nothing.
- [ ] With `deploy/app.service`, the server opens its database under the service's state directory.
- [ ] With a pending migration, `vpr dev` fails on its first request and the production server on start, even for a route that doesn't read the database; after migrating, both serve.
- [ ] `app-migrate@[sha]` migrates that database from a built, unactivated release, while the server keeps serving the previous one.
- [ ] On a fresh state directory, the database files `app-migrate@[sha]` creates are owned by `app.service`'s user, and the server opens them.
- [ ] The production server built with an unknown mode fails on start.
