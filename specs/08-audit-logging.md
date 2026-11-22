# 08 Audit Logging

**Goal**: Every write to the app database, from SvelteKit or the CLI, is stored in a separate audit database before it runs, and kept only as long as the law requires.

## Rules

### Scope

1. `audit` is a second database ([05](./05-database.md) rule 2), laid out, migrated, and checked on open as `app` is (05 rules 1 and 3–19). Named `audit`, since "access log" usually means web server logs.
2. Entries are stored in every mode but `development`, so e2e runs exercise it. In `development`, the logger still runs and reads the context (rule 16), so a statement that would fail unlogged fails in dev too, but no audit database is opened: `cli/db/migrate.ts`, `cli/db/purge.ts`, the open check, and `db:studio` skip it. Nothing is wrapped while `building` (05 rule 8) or in `createTestAppDb`.
3. Audit entries are a legal record, not a log, so the global PII rule doesn't cover them: they hold bound params and the client IP unmasked, since 접속기록 must show whose data a statement touched (`WHERE user_id = ?`). They stay in the local audit database and are read only for their audit purpose, never by app queries. Secrets are hashed before binding (10 Sessions).

### Logger

4. `auditConnection` wraps a `node:sqlite` connection, and Drizzle gets the wrapped one, so every statement, transaction control included, passes through it. It exposes only the members Drizzle's driver uses; any other (`exec`, `applyChangeset`, `function`, …) throws, since it could run SQL unlogged. Why not Drizzle's `logger`: it sees neither failures nor transaction control ([drizzle-orm#387](https://github.com/drizzle-team/drizzle-orm/issues/387)). A connection is wrapped after `openConnection`'s pragmas and the migration check (05 rule 18), which would otherwise log outside a request (rule 16).
5. A statement is a read only if its first keyword is `select`; anything else, pragmas included, is a write, so a misread only over-logs. `node:sqlite` doesn't expose `sqlite3_stmt_readonly`.
6. Every write is logged. A read is logged through `auditedDb` (rule 12), in the CLI (rule 14), and while the context's `isStaff` is true, since 접속기록 cover what 개인정보취급자 read, opted in or not. A read on `db` outside a request isn't logged.
7. Each run of a statement is stored as an entry before it runs, so a prepared statement run twice logs twice. If logging fails, the statement doesn't run and the error is thrown, rolling back its transaction. If the statement fails, its entry is marked failed.
8. Transaction control (`begin`, `savepoint`, `release`, `rollback to`) is held until the transaction logs another statement, then stored in order before it; after that, it's logged as it runs. `commit` and `rollback` are logged only if `begin` was, so a transaction that logs nothing (a snapshot query on `db`, [07](./07-queries.md) rule 8) stores nothing. A held entry's `loggedAt` is when it's stored; accepted.
9. If logging a `commit` fails, the transaction rolls back, so nothing is saved unlogged. A `rollback` or `rollback to` runs even if logging it fails, and the error goes to `report`, since a throw would hide the error that caused the rollback.
10. `report` writes the audit errors that mustn't stop anything (logging a rollback, marking an entry failed) to `console.error`. 13 Observability adds Sentry.
11. A `begin` while the connection is already in a transaction fails an assertion before it's logged, so nesting `db` and `auditedDb` transactions throws and rolls back the outer one.

### Clients

12. `db` and `auditedDb` share one app connection, wrapped twice; `auditedDb` also logs every read. A server module opts a read in by passing `auditedDb` to a query. While `building`, `auditedDb` is `db`. Lint extends 07 rule 1's `db` ban to `auditedDb`. Why one connection: with two, a nested transaction would wait out the busy timeout, then fail.
13. The audit database's client is unwrapped, since logging an entry would log itself. 05 rule 11's test also runs on a db from `createAuditDb`: `createEntry` binds every entry's params, and its errors reach `report`.
14. CLI scripts open the app database through `openDbs`, whose client logs every read: CLI operators are staff (rule 17), and a script has no request to opt in from. `cli/db/migrate.ts` runs migrations unwrapped, so a data migration is unlogged; accepted.

### Context

15. Each logged statement reads its context, `userId`, `ip`, `pathname`, and `isStaff` (개인정보취급자), from a getter `auditConnection` takes, so `logger.ts` imports no `$app/*` and `cli/` can use it. `isAuditEnabled` takes the mode, as `prepareDatabasePath` does (05 rule 4).
16. In SvelteKit, the getter reads `getRequestEvent()`'s `getClientAddress()` and `url.pathname`. `userId` is `null` and `isStaff` `false` until 10 Sessions sets the user and a later spec adds roles. A logged statement outside a request throws, so the server can't write in the background (at startup, on a timer) until a later spec gives it a context. `deploy/app.service` sets adapter-node's `ADDRESS_HEADER` and `XFF_DEPTH` to match `deploy/Caddyfile`, so `ip` is the client's, not Caddy's.
17. In the CLI, `pathname` is the script's path relative to the project root, `userId` and `ip` are `null`, and `isStaff` is `true` (rule 14).

### Schema

18. `entry_sql` holds each statement's SQL text once, unique by its SHA-256 `hash`. It's never purged, since SQL text holds no values (07 rule 4) and `createEntry` caches its IDs.
19. `entry` holds one logged statement: its SQL, `params` as JSON, `loggedAt`, the context (rule 15), `connectionId`, and `hasFailed`. `userId` has no foreign key, since users live in the app database.
20. `params` encodes a `bigint` as its decimal string and a `Uint8Array` as base64, since `JSON.stringify` throws on a `bigint`, which would block the write. An encoded value and a string look alike; accepted.
21. `connectionId` is a UUIDv7 per app connection, shared by `db` and `auditedDb`. Transactions on one connection don't interleave, so a transaction's entries are those with its `connectionId` between its `begin` and its `commit` or `rollback`, even while another process logs.
22. Entries are written by commands ([06](./06-commands.md)), each in its own immediate transaction on the audit database. `createEntry` reads the clock and finds or creates the SQL row, caching its ID by hash per `AuditDb` once its transaction commits, so a rollback or another database leaves no stale ID. `markEntryFailed` sets `hasFailed`.

### Protection

23. Only `createEntry`, `markEntryFailed`, and `purgeEntries` write to `audit`. Tamper protection is the mode directory's owner-only permissions (05 rule 6). The service's user can still alter entries, and off-host backup is the deployer's; accepted.
24. Reviewing entries at least monthly ([개인정보의 안전성 확보조치 기준](https://www.law.go.kr/행정규칙/개인정보의안전성확보조치기준) 제8조 ②) is the operator's; the template ships no viewer.

### Retention

25. Staff entries are kept 2 years; others, 3 months. 개인정보취급자's 접속기록 are kept at least 1 year, and 2 for 50,000+ data subjects or sensitive or unique-ID data (기준 제8조 ①), so the template keeps 2. Users' own actions aren't 접속기록: only their login records must be kept, for 3 months (통신비밀보호법), and keeping them longer without a basis breaches 개인정보 보호법 제21조 ①. Whether either binds a small service is uncertain; the fallback basis is 제15조 ① 6호 (정당한 이익). Verify against current law.
26. `purgeEntries`, a CLI-only command (06 rule 15), deletes staff entries logged more than 2 calendar years ago and others more than 3 calendar months ago, in UTC (3 months before May 31 is Feb 28), and returns the count. `cli/db/purge.ts` runs every database's purges and prints each count as the destruction record (파기 기록); later specs add theirs.
27. `deploy/app-purge.service` and `deploy/app-purge.timer` are sample units: daily, they run `cli/db/purge.ts` with `current/node` from `current`, with `app.service`'s user, `DATA_DIR`, and env files (05 rule 19).
28. A closed user's params in entries outlive closing (05 rule 35) until the purge, as the law requires.

## Files

- `src/db/server/shared/database.ts`: `DatabaseName` changed, `isAuditEnabled` added.
- `src/db/server/audit/drizzle.ts`: `AuditDb`, `AuditTx`, `createAuditDb`.
- `src/db/server/audit/entry/schema.ts`: `entrySqlTable`, `EntrySqlInsert`, `EntrySqlSelect`, `entryTable`, `EntryInsert`, `EntrySelect`.
- `src/db/server/audit/entry/commands.ts`: `createEntry`, `markEntryFailed`.
- `src/db/server/audit/logger.ts`: `AuditContext`, `auditConnection`.
- `src/db/server/audit/testing.ts`: `createTestAuditDb`.
- `src/db/server/app/client.ts`: `db` audited, `auditedDb` added.
- `cli/db/client.ts`: `openDbs`.
- `cli/db/migrate.ts`: skips `audit` in `development`.
- `cli/db/audit/entry/commands.ts`: `purgeEntries`.
- `cli/db/purge.ts`
- `cli/db/drizzle-kit/audit.ts`
- `deploy/app.service`: `ADDRESS_HEADER` and `XFF_DEPTH` added.
- `deploy/app-purge.service`
- `deploy/app-purge.timer`
- `drizzle/audit/[timestamp]_init/`

## Checks

- [ ] In mode `preview`, a write from a remote function stores its entry (SQL, params, IP, pathname) before it runs; a read through `db` stores none, and the same read through `auditedDb` stores one.
- [ ] With `isStaff` set in the context, a read through `db` stores an entry.
- [ ] A command stores `begin`, its statements, and `commit`, sharing one `connectionId`; a snapshot query on `db` stores nothing.
- [ ] A prepared statement run twice stores two entries.
- [ ] A `bigint` and a `Uint8Array` param are stored encoded, and the write runs.
- [ ] In mode `development`, `vpr db:migrate:development` and `vpr dev` create no `audit.db`, and a write outside a request still throws. `vpr build` and `cli/db/purge.ts` create none either.
- [ ] A failing statement's entry has `hasFailed` set.
- [ ] The 05 rule 11 test fails with `paramsInErrors` set in `createAuditDb`.
- [ ] While logging fails, a write doesn't run and throws, and a rollback still runs and reports.
- [ ] When logging a `commit` fails, the transaction rolls back.
- [ ] A `begin` on `auditedDb` inside a transaction on `db` throws, and the outer transaction rolls back.
- [ ] `exec` and `applyChangeset` on a wrapped connection throw.
- [ ] A logged statement outside a request throws.
- [ ] Behind `deploy/Caddyfile`, an entry's `ip` is the client's, not Caddy's.
- [ ] A sample CLI script's read and write each log its path as `pathname`, with `isStaff` set.
- [ ] `purgeEntries` deletes only expired entries, clamping month ends, on a faked clock.
- [ ] A property of `auditedDb` fails lint in a remote file.
- [ ] With the sample units, the purge runs and its count reaches the journal.
- [ ] After a rolled-back `createEntry`, the next one for the same SQL creates its row; a second `AuditDb` doesn't reuse the first one's IDs.
