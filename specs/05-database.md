# 05 Database

**Goal**: SvelteKit, CLI scripts, and tests open the app's SQLite database the same way, from a schema that follows one set of conventions and ships its migrations.

## Rules

### Layout

1. Database code is server-only, in `src/db/server/[database]/`, reached through `#db/*` (e.g. `#db/app/user/schema.ts`). Why `server/`: SvelteKit rejects client imports from any `server` directory ([server-only modules](https://svelte.dev/docs/kit/server-only-modules)). Code shared by every database sits in `src/db/server/shared/`.
2. `app` is the only database here. Code is written per database name, so 08 Audit Logging adds `audit` beside it.
3. Inside a database folder, one folder per table name prefix (e.g. `user/` for `user`, `user_session`) holds that prefix's `schema.ts` and its test. Later specs add their queries and commands there.

### Files on Disk

4. A database's file is `[DATA_DIR]/[mode]/[database].db`, so modes never share a file ([03](./03-environment.md) rule 2). `DATA_DIR` defaults to `data`, resolved against the working directory, so development uses `data/development/app.db` in the checkout. `.gitignore` ignores `/data/`, so a checkout's databases stay untracked, `-wal` and `-shm` files included.
5. In mode `production`, a relative `DATA_DIR` fails. Why: the server runs from a release directory ([04](./04-build-output.md) rule 7), and a relative path would give each release its own database, removed with it.
6. The mode's directory is created owner-only (`700`). An existing one with other permissions fails, except on Windows.
7. `deploy/app.service` sets an absolute `DATA_DIR`: a directory systemd creates for the service, outside the deploy root. Every release shares it. Why not the deploy root's `shared/`: app state stays out of the deploy tree, and systemd gives the directory the service's owner.
8. While `building`, the SvelteKit client opens `:memory:`, so a build creates no files. Prerendered pages can't read the database; accepted.

### Connections

9. Every connection comes from `openConnection`: a 5-second busy timeout, so concurrent processes wait instead of failing, and WAL for file databases (in-memory ones report `memory`). Foreign keys stay on (`node:sqlite`'s default). Lint bans value imports from `node:sqlite` elsewhere; type imports stay allowed.
10. The SvelteKit client closes its connection on `sveltekit:shutdown`. Dev doesn't emit it, and skips the listener, since each module reload would add one.
11. Query errors never hold bound values, in any field or message. Drizzle omits them unless `paramsInErrors` is set ([drizzle-orm#5939](https://github.com/drizzle-team/drizzle-orm/issues/5939)). A test on a db from `createAppDb` fails when a prepare or run error's fully inspected output holds a bound value. SQL text stays.

### Migrations

12. Migrations live in `drizzle/[database]/`. The template ships the app's migrations, so a fresh clone and a fresh deployment work without generating.
13. Until the template's first release, a spec that changes the schema regenerates the single `init` migration instead of adding one.
14. `cli/db/drizzle-kit/[database].ts` is the drizzle-kit config for one database, reading env through `cli/lib/env.ts` ([03](./03-environment.md) rule 19). `vpr db:generate` and `vpr db:studio` run it in mode `development`. drizzle-kit loads `.env` into `process.env` first ([drizzle-kit v0.20.0](https://github.com/drizzle-team/drizzle-kit-mirror/releases/tag/v0.20.0)), so a `.env` value outranks the other env files there. A variable drizzle-kit reads is never set in `.env`, stated in a `.env` comment; accepted.
15. No `db:push`: the schema changes only through migrations, which tests and production apply.
16. `cli/db/migrate.ts` applies every database's migrations for its mode, through `openConnection`, so it waits for the server's writes instead of failing. `vpr db:migrate:development` and `vpr db:migrate:preview` run it; production uses rule 19's unit.
17. Starting the server never migrates. A production deploy migrates by hand, between building a release and activating it, using that release's migrations (rule 19).
18. The SvelteKit client fails on open, in every mode but while `building` (rule 8), when a migration in `drizzle/[database]/` isn't applied, so a skipped migration fails the restart instead of a request. Applied migrations the release doesn't ship pass: a rollback runs on the newer schema (rule 20).
19. `deploy/app-migrate@.service` is a sample oneshot unit, instanced by SHA: it runs `cli/db/migrate.ts` with that release's `node`, from that release, with `app.service`'s `DATA_DIR` and env files. Why a unit: the migration reads the same database and env as the server, without retyping them.
20. A migration runs while the previous release still serves, so it stays compatible with that release ([expand, then contract](https://martinfowler.com/bliki/ParallelChange.html)). Not checked; accepted.

### Tables

21. Tables are `snakeCase.table`. Each table exports `[Name]Insert` and `[Name]Select`.
22. A table whose ID reaches clients (URLs, forms, cookies) has a UUIDv7 primary key: `text`, defaulting to `node:crypto`'s `randomUUIDv7` in the schema. Why: client IDs reveal no row counts and can't be guessed in sequence. They reveal creation time; accepted. Other tables use `integer().primaryKey({ autoIncrement: true })`. Either way, a deleted ID is never reused, since audit entries that outlive a purged row would otherwise point at a new one. 1:1 tables use the parent's ID as their primary key.
23. Columns stay in table order: schema files opt out of lint's sorted keys.
24. Foreign keys don't cascade or set null, so deleting a row that others still reference fails. A delete across tables is a command that deletes children first (06 Commands), so each table's delete is its own audited statement.
25. `user` holds `id` (a UUID) and `createdAt`. Later specs add the columns they need.

### Columns

26. Timestamps are `[verb]At`, `integer({ mode: 'timestamp_ms' })`, with no SQL default: commands pass the time they read (06 Commands).
27. Actors are `[verb]By`, a nullable foreign key to `user`. `null` means the system, or no user yet. Since foreign keys don't cascade (rule 24), a user referenced as an actor can't be deleted.
28. Soft delete is a final `[verb]At`/`[verb]By`/`[verb]Reason` group: `Reason` is set exactly when `At` is, and `By` requires `At`. A soft-deleted row is never restored; restoring means inserting a new row. Updates to a group match only rows whose `At` is null (06 Commands). No trigger enforces it: drizzle-kit can't declare one, and drops it unnoticed when it rebuilds a table. Raw SQL can still restore a row; accepted. One helper declares a group's `CHECK`s, added with the first group.
29. Enums are `text({ enum })` with no `CHECK`: SQLite can't alter a `CHECK`, so a new value would rebuild the table. Renaming or removing a stored value needs a data migration; accepted. Each list is one `as const` array, so the schema, Valibot, and UI labels share it.

### Constraints

30. "One active row" rules are unique indexes filtered on the group's `At` being null.
31. Cheap value rules are `CHECK`s (e.g. date format, hash length, expiry after creation). Their expressions use Drizzle's operators, and `sql` only where none exists or where an operator would bind a value.
32. A foreign key column gets an index where it's looked up.

### Personal Data

33. A user who leaves keeps their `user` row, closed (rule 28), and rows referencing it stay. Closing erases their personal data, so the rest no longer identifies them. Where a project needs more, a command may delete a user's rows, children first, then the user; it fails while another row references them as an actor.
34. Personal data lives only where closing can erase it: nullable columns on `user` (e.g. `contact`), set to null, or tables keyed to the user (e.g. `user_profile`), whose rows are deleted. Free text a user writes into other tables isn't erased; accepted.

### Tests

35. `createTestAppDb` opens an in-memory db with the migrations applied, disposable with `using`. Why migrations, not the schema: tests run the SQL production runs, and catch a missing migration.
36. Each `schema.ts` has a test next to it, with a `describe` per table, covering each of its constraints.

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
- [ ] A `700` check fails on a pre-existing `755` mode directory (try it, then revert).
- [ ] The production server and `app-migrate@[sha]` fail with a relative `DATA_DIR`.
- [ ] After `vpr db:migrate:preview`, `vpr preview` opens `data/preview/app.db`.
- [ ] `vpr build` creates no `data/`.
- [ ] After a request to the built server, SIGTERM closes its connection (by hand: the listener runs).
- [ ] `vpr db:migrate:development` succeeds while another connection holds a write lock for under 5 seconds (try it, then revert).
- [ ] A `node:sqlite` value import outside `connection.ts` fails lint; a type import passes.
- [ ] The rule 11 test fails with `paramsInErrors` set in `createAppDb` (try it, then revert).
- [ ] Deleting a `user` that another row references fails (try it with a sample child table, then revert).
- [ ] A new `CHECK` without a regenerated migration fails its schema test (try it, then revert).
- [ ] `vpr db:generate` on an unchanged schema generates nothing.
- [ ] With `deploy/app.service`, the server opens its database under the service's state directory.
- [ ] With a pending migration, `vpr dev` and the production server fail on start; after migrating, they start (try it, then revert).
- [ ] `app-migrate@[sha]` migrates that database from a built, unactivated release, while the server keeps serving the previous one.
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
