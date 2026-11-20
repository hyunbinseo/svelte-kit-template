# 08 Audit Logging

**Goal**: Every write to the app database, from SvelteKit or the CLI, is stored in a separate audit database before it runs, and kept only as long as the law requires.

## Rules

### Scope

1. `audit` is a second database ([05](./05-database.md) rule 2), laid out, migrated, and checked on open as `app` is ([05](./05-database.md) rules 1 and 3–19). Named `audit`, not `access`: "access log" usually means web server request logs.
2. Entries are stored in every mode but `development`, derived from the mode ([03](./03-environment.md) rule 2), so e2e runs exercise it. In `development`, the logger still runs and reads the context (rule 16) but stores nothing, so a statement that would fail unlogged in production fails in dev too. No audit database is opened there: `cli/db/migrate.ts` and the open check ([05](./05-database.md) rules 16 and 18) skip `audit`. While `building`, nothing is wrapped, since the app database is `:memory:` then ([05](./05-database.md) rule 8). `createTestAppDb` isn't wrapped. There, `cli/db/audit/purge.ts` fails as an expected failure ([02](./02-cli-separation.md) rule 14), and `db:studio` doesn't open `audit`.
3. Audit entries are a legal record, not a log, so the global PII rule doesn't cover them. They hold bound params and the client IP unmasked, since 접속기록 must show whose data a statement touched (`WHERE user_id = ?`). They stay in the local audit database, never reach third parties (13 Observability), and are read only for their audit purpose, never joined into app queries. Secrets are hashed before binding, so they never reach params (10 Sessions). Why no masking: the law asks for access control and tamper protection (rule 23), not masking, and a masked entry can't show whose data was touched.

### Logger

4. `auditConnection` wraps a `node:sqlite` connection in a `Proxy`, and Drizzle gets the wrapped one. Drizzle's node-sqlite driver prepares every statement through it, `begin`, `commit`, `rollback`, and savepoints included. The wrapper exposes only the members Drizzle's driver uses; any other (`exec`, `applyChangeset`, `function`, …) throws, since it could run SQL unlogged. Why not Drizzle's `logger`: it runs before execution, so it can't see failures ([drizzle-orm#387](https://github.com/drizzle-team/drizzle-orm/issues/387)), and it doesn't see transaction control. A connection is wrapped after `openConnection`'s pragmas and the migration check ([05](./05-database.md) rule 18) run on it, since a pragma counts as a write (rule 5), and a logged statement outside a request throws (rule 16).
5. A statement is a read only if its first keyword is `select`; everything else, pragmas included, is a write. Why: a misread can only over-log. `node:sqlite` doesn't expose `sqlite3_stmt_readonly`, and parsing SQL is out of scope.
6. Every write is logged. A read is logged through `auditedDb` (rule 12), while the context's `isStaff` is true (rule 15), and in the CLI (rule 14). A read on `db` outside a request has no context, so it isn't logged. Why staff: 접속기록 cover what 개인정보취급자 read, so their reads can't depend on a caller opting in.
7. Each run of a statement is logged (an audit entry is stored) before it runs, so a prepared statement run twice logs twice. If logging fails, the statement doesn't run and the error is thrown, so a transaction rolls back. If the statement then fails, its entry is marked failed.
8. Transaction control (`begin`, `savepoint`, `release`, `rollback to`) is held until the transaction logs another statement, then logged in order before it, and logged as it runs after that. `commit` and `rollback` are logged only if `begin` was. So a transaction that logs nothing, like a snapshot query's on `db` ([07](./07-queries.md) rule 8), stores nothing. A held entry's `loggedAt` is when it's stored, not when it ran; accepted.
9. If logging a `commit` fails, the throw lands inside Drizzle's transaction, so it rolls back: nothing is saved unlogged. A `rollback` (or `rollback to`) runs even if logging it fails, since it saves nothing, and the error goes to `report`, since a throw would replace the error that caused the rollback.
10. `report` takes the audit errors that mustn't stop anything (logging a rollback, marking an entry failed) and writes them to `console.error`. 13 Observability adds Sentry.
11. A `begin` while the connection is already in a transaction fails an assertion before it's logged, so nesting across `db` and `auditedDb` throws, and the outer transaction rolls back.

### Clients

12. `db` and `auditedDb` share one app connection, wrapped twice: `db` logs writes (and staff reads, rule 6), `auditedDb` logs every read too. A server module opts a read in by passing `auditedDb` to a query ([07](./07-queries.md) rule 7). While `building`, `auditedDb` is `db`. Lint extends [07](./07-queries.md) rule 1's `db` property ban to `auditedDb`. Why one connection: with two, a nested transaction would wait out the busy timeout, then fail.
13. The audit database's own client is unwrapped, since logging an entry would log itself.
14. CLI scripts open the app database through `openDbs`, whose client logs reads too, so every CLI statement is logged. Why: CLI operators are staff (rule 17), and a script has no request to opt in from. `cli/db/migrate.ts` runs migrations on a raw connection, so a data migration ([05](./05-database.md) rule 29) is unlogged; accepted.

### Context

15. Each logged statement reads its context: `userId`, `ip`, `pathname`, and `isStaff` (개인정보취급자), from a getter `auditConnection` takes, so `logger.ts` imports no `$app/*` and `cli/` can use it ([02](./02-cli-separation.md) rule 6). `isAuditEnabled` takes the mode, as `prepareDatabasePath` does ([05](./05-database.md) rule 4).
16. In SvelteKit, `client.ts`'s getter reads `getRequestEvent()`: `getClientAddress()` and `url.pathname`. `userId` is `null` and `isStaff` is `false` until 10 Sessions sets the user and a later spec adds roles. A logged statement outside a request throws, so nothing writes unlogged, and the server can't write in the background (at startup, on a timer); a later spec that needs to gives it a context. `deploy/app.service` sets adapter-node's `ADDRESS_HEADER` and `XFF_DEPTH` to match `deploy/Caddyfile` ([04](./04-build-output.md) rule 12), so `ip` is the client's, not Caddy's.
17. In the CLI, `pathname` is the script's path relative to the project root, `userId` and `ip` are `null`, and `isStaff` is `true`. Why staff: CLI operators are 개인정보취급자.

### Schema

18. `entry_sql` holds each statement's SQL text once, unique by its SHA-256 `hash`. It's never purged: SQL text holds no values ([07](./07-queries.md) rule 4), and `createEntry` caches its IDs.
19. `entry` holds one logged statement: its SQL, `params` as JSON, `loggedAt`, the context (rule 15), `connectionId`, and `hasFailed`. `userId` has no foreign key, since users live in the app database, so it isn't a `[verb]By` actor ([05](./05-database.md) rule 27).
20. `params` encodes every value `node:sqlite` binds: a `bigint` as its decimal string, a `Uint8Array` as base64. Why: `JSON.stringify` throws on a `bigint`, which would block the write (rule 7). An encoded value and a string param look alike; accepted.
21. `connectionId` is a UUIDv7 per app connection, shared by its two wrappers, `db` and `auditedDb` (rule 12). Why: transactions on one connection don't interleave (`node:sqlite` is sync), so a `begin`, its statements, and its `commit` or `rollback` are the entries between them with the same `connectionId`, even while another process logs too.
22. Entries are written by commands ([06](./06-commands.md)), each in its own immediate transaction on the audit database: `createEntry` takes the SQL text, reads the clock, and finds or creates the SQL row, caching its ID by hash per `AuditDb` once its transaction commits, so a rollback or another database leaves no stale ID; `markEntryFailed` sets `hasFailed`.

### Protection

23. Only `createEntry`, `markEntryFailed`, and `purgeEntries` write to `audit`. Tamper protection is the mode directory's owner-only permissions ([05](./05-database.md) rule 6). A process running as the service's user can still alter entries, and off-host backup is the deployer's; accepted.
24. Reviewing entries at least monthly ([개인정보의 안전성 확보조치 기준](https://www.law.go.kr/행정규칙/개인정보의안전성확보조치기준) 제8조 ②) is the operator's. The template ships no viewer; accepted.

### Retention

25. Staff entries are kept 2 years; other entries, 3 months. Why: 접속기록 cover what 개인정보취급자 do, kept at least 1 year, and 2 for 50,000+ data subjects or sensitive or unique-ID data ([개인정보의 안전성 확보조치 기준](https://www.law.go.kr/행정규칙/개인정보의안전성확보조치기준) 제8조 ①), so the template keeps 2. Users' own actions aren't 접속기록; only their login records must be kept, for 3 months (통신비밀보호법), and keeping them longer without a basis breaches 개인정보 보호법 제21조 ①. Whether either binds a small service is uncertain; the fallback is 제15조 ① 6호 (정당한 이익). Verify against current law.
26. `purgeEntries`, a CLI-only command ([06](./06-commands.md) rule 15), deletes staff entries logged more than 2 calendar years ago and others more than 3 calendar months ago, in UTC (3 months before May 31 is Feb 28), and returns the count. `cli/db/audit/purge.ts` runs it and prints the count, the destruction record (파기 기록).
27. `deploy/app-audit-purge.service` and `deploy/app-audit-purge.timer` are sample units: daily, they run the purge script with `current/node` from `current`, with `app.service`'s `DATA_DIR` and env files.
28. A closed user's params in entries outlive closing ([05](./05-database.md) rule 33) until the purge; accepted, since the law requires keeping them.

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
- `cli/db/audit/purge.ts`
- `cli/db/drizzle-kit/audit.ts`
- `deploy/app.service`: `ADDRESS_HEADER` and `XFF_DEPTH` added.
- `deploy/app-audit-purge.service`
- `deploy/app-audit-purge.timer`
- `drizzle/audit/[timestamp]_init/`

## Checks

- [ ] In mode `preview`, a write from a remote function stores its entry (SQL, params, IP, pathname) before it runs; a read through `db` stores none, and the same read through `auditedDb` stores one.
- [ ] With `isStaff` set in the context, a read through `db` stores an entry (try it, then revert).
- [ ] A command stores `begin`, its statements, and `commit`, sharing one `connectionId`; a snapshot query on `db` stores nothing.
- [ ] A prepared statement run twice stores two entries.
- [ ] A `bigint` and a `Uint8Array` param are stored encoded, and the write runs.
- [ ] In mode `development`, `vpr db:migrate:development` and `vpr dev` create no `audit.db`, and a write outside a request still throws (try it, then revert). `vpr build` creates none either, and the purge script fails without creating one.
- [ ] A failing statement's entry has `hasFailed` set.
- [ ] While logging fails, a write doesn't run and throws, and a rollback still runs and reports (try each, then revert).
- [ ] When logging a `commit` fails, the transaction rolls back (try it, then revert).
- [ ] A `begin` on `auditedDb` inside a transaction on `db` throws, and the outer transaction rolls back.
- [ ] `exec` and `applyChangeset` on a wrapped connection throw.
- [ ] A logged statement outside a request throws (try it, then revert).
- [ ] Behind `deploy/Caddyfile`, an entry's `ip` is the client's, not Caddy's.
- [ ] A sample CLI script's read and write each log its path as `pathname`, with `isStaff` set (try it, then revert).
- [ ] `purgeEntries` deletes only expired entries, clamping month ends, on a faked clock.
- [ ] A property of `auditedDb` fails lint in a remote file (try it, then revert).
- [ ] With the sample units, the purge runs and its count reaches the journal.
- [ ] After a rolled-back `createEntry`, the next one for the same SQL creates its row; a second `AuditDb` doesn't reuse the first one's IDs (try each, then revert).
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
