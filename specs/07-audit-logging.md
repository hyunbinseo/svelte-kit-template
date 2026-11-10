# 07 Audit Logging

Log database queries to a separate audit DB, from both SvelteKit and CLI.

## Ideas

- Drizzle's logger runs before execution, so failed queries look successful ([drizzle-team/drizzle-orm#387](https://github.com/drizzle-team/drizzle-orm/issues/387)) — look for a way around it.
- Share request-context lookup with Sentry user tagging.
- Log the CLI script name where a request pathname would go.

## Checklist

- [x] Off in development, on in every other mode (`isAuditEnabled` in `src/db/server/shared/database.ts`, see [03](./03-environment.md)).
- [x] Writes always logged (including `begin`/`commit`/`rollback`; CTEs count as writes); reads only when opted in.
- [x] SQL text deduplicated by hash; each entry records time, user ID, client IP, pathname, params, and whether the actor is a 개인정보취급자 (the CLI, or a user with a role).
- [x] Entries are purged by class: 개인정보취급자 entries after 2 years, others after 3 months ([12](./12-operations.md)).
- [x] A failed audit write blocks the query before it runs; a failed `commit` log rolls back the transaction.
- [x] A failed `rollback` log never blocks the rollback (including savepoints) — it's reported instead.
- [x] Nesting transactions across audited and unaudited clients throws cleanly.
- [x] Each rule above has a test.

## Decisions

- The audit log serves two legal records, with different retention. 접속기록 (access records) cover what 개인정보취급자 (staff: admins and CLI operators) do in the system ([개인정보의 안전성 확보조치 기준](https://www.law.go.kr/행정규칙/개인정보의안전성확보조치기준) 제2조, 제8조): at least 1 year, 2 years for 50,000+ data subjects or sensitive or unique-ID data, so the template keeps 2 years. Users' own actions aren't 접속기록; only their login records must be kept, for 3 months (통신비밀보호법). With no other basis, keeping them longer would breach 제21조 ①, so other entries go after 3 months. Both bases are uncertain for a small service: whether 통신비밀보호법's login records bind it, and whether a 고시 counts as another law under 제21조 ③. The fallback for both is 제15조 ① 6호 (정당한 이익), as Naver cites for misuse prevention. Verify against current law. Named `audit`, not `access`: "access log" usually means web server request logs.
- Params are logged unmasked: without them, an entry can't show whose data a query touched (e.g. `WHERE id = ?`), which access records must show, and the logger covers every write (CLI included) without per-procedure code. Masking isn't required there; the logs must be access-controlled and protected from tampering and loss instead. Secrets never reach params: session secrets and login codes are hashed before the query ([08](./08-auth.md)). Audit rows stay in the local audit database and never go to third parties ([10](./10-observability.md)). The audit database is read only for its audit purpose, never joined with the app database in routine queries: that would undercut the separate storage 제21조 ③ requires ([08](./08-auth.md)). Retention: [12](./12-operations.md). Rejected: logging IDs only via per-procedure entries (manual, easy to miss).
- Hook: `auditConnection(connection, options)` (`src/db/server/audit/logger.ts`) wraps the `node:sqlite` connection in a `Proxy`, and Drizzle gets the wrapped one. Drizzle's node-sqlite driver sends every statement through `client.prepare()`, including `begin`, `commit`, `rollback`, and savepoints, so nothing bypasses it; `exec` (unlogged, unused by Drizzle) throws. Each statement's entry is written before it runs (autocommit on the audit connection), so a failed audit write throws and the statement never runs. If the statement then throws, the entry is marked `failed`, which fixes [drizzle-orm#387](https://github.com/drizzle-team/drizzle-orm/issues/387)'s "failed looks successful". Rejected: Drizzle's `logger` (runs before execution, can't see failures, and has no hook for `begin`/`commit`).
- Transactions: Drizzle runs `commit` inside its `try`, so a failed `commit` log throws there and Drizzle rolls back. A `rollback` (or `rollback to savepoint`) whose log fails runs anyway and passes the error to `report`. Drizzle swallows rollback errors, so throwing would hide it.
- Reads vs. writes: a statement is a read only if its first keyword is `select`. Everything else is logged, CTEs (`with`) and pragmas included, so a misread can only over-log. Rejected: parsing SQL, and `sqlite3_stmt_readonly` (`node:sqlite` doesn't expose it).
- Two clients on one connection: `db` logs writes, and `auditedDb` logs reads too. A route opts in per call by passing `auditedDb` ([06](./06-query-layer.md)). In development both are the same plain client. A `begin` while the connection is already in a transaction fails an `ok(!connection.isTransaction)` before it's logged, so nesting across clients throws an `AssertionError`, and the outer transaction rolls back. Rejected: a second connection for `auditedDb` (a nested transaction would wait out the busy timeout, then fail with `SQLITE_BUSY`).
- Schema (`src/db/server/audit/entry/schema.ts`): `entry_sql` (SQL text, unique SHA-256 `hash`), and `entry` (`sql_id`, `params` as JSON, `logged_at`, `user_id` without a foreign key, since users are in the app database, `ip`, `pathname`, `by_staff`, `failed`). The logger caches SQL IDs per `auditConnection` wrapper. `entry_sql` rows are never purged: they hold no values, and deleting one would break a running wrapper's cache.
- Context: `getContext()` is called for each logged statement. SvelteKit (`src/db/server/app/client.ts`) reads `getRequestEvent()`: `getClientAddress()`, `url.pathname`, and `locals.session?.userId` (set by [08](./08-auth.md)'s `handleSession`). A user is staff if they have an active role (`loadSessionRoles`, an unaudited read on `db`, so it doesn't log itself, cached per request). Sentry tags requests with `locals.session.userId` directly ([10](./10-observability.md)), so there's no shared lookup. The CLI (`openDbs`, `cli/db/client.ts`) logs the script path relative to the project root as `pathname`, `null` user and IP, and staff. Writes outside a request throw (`getRequestEvent`), so they can't run unlogged.
- Off while `building`: the app database is `:memory:` then ([05](./05-database.md)), so no audit file is opened.
- `report` logs with `console.error` and sends to Sentry (`captureException`, [10](./10-observability.md)).
- Purge: `purgeEntries(auditDb)` (`cli/db/audit/entry/procedures.ts`, CLI-only, [06](./06-query-layer.md)) deletes staff entries logged more than 2 calendar years ago and others more than 3 calendar months ago, computed with `Temporal` in UTC (month ends clamp: 3 months before May 31 is Feb 28), and returns the count for [12](./12-operations.md)'s destruction record. [12](./12-operations.md) runs it.
