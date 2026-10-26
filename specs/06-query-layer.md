# 06 Query Layer

How routes, remote functions, and CLI scripts reach the database. This is the most open spec.

## Ideas

- Plain functions taking `db`, bound query sets, repository modules, or per-route `server.ts` — pick what reads best at the call site and in tests.
- Audited reads as a per-call or per-module choice.
- Enforce "sync transaction callbacks" with types.
- Domain verbs for names (`find`, `create`, `claim`, `mark`, `link`, `discard`, `grant`, `revoke`) over SQL verbs.

## Checklist

- [x] Transactions reject async callbacks (type error). `node:sqlite` is sync; an async callback would commit early.
- [x] Read-then-write paths run in `immediate` transactions.
- [ ] Multi-row invariants (e.g. closing a user revokes their roles and sessions; granting a role requires an active user without it) live in procedures shared by SvelteKit and CLI.
- [ ] Deletes that span tables are procedures too, e.g. one that deletes logins with their attempts (children first), called by closing a user ([08](./08-auth.md)) and the purge job ([12](./12-operations.md)).
- [ ] Each procedure runs in one transaction, reads the clock inside it, guards every row it depends on, returns falsy on no-op — and each guard is tested.
- [ ] Reads are not audited by default; a route can opt in ([07](./07-audit-logging.md)).
- [ ] Drizzle's sync API is used.
- [x] Values are always bound, never written into SQL text, so errors and telemetry carry no data ([10](./10-observability.md)). `sql.raw` is for identifiers and constants only; ESLint flags it for review.
- [ ] Every read of a soft-deleted table states its filter inline (e.g. `isNull(t.revokedAt)`), including expiry where the table has one (e.g. `gt(t.expiresAt, now)` for sessions), and procedure tests cover it. Drizzle has no global scopes, so a hidden default couldn't be enforced (like Rails' `discard`, not Laravel's `SoftDeletes`).

## Decisions

- `src/db/app/server/database.ts` holds what every client shares: the `AppDb` and `AppTx` types and `createDatabase(client)`. The SvelteKit client, `createTestDatabase`, and later the CLI client all call it, so tests run the same `transaction` as the app. Test databases migrate through a plain Drizzle instance on the same connection, since `migrate()` needs Drizzle's own class type.
- `db.transaction(callback, { behavior: 'immediate' })`: `AppDb` replaces Drizzle's signature, so the config is required, only `immediate` type-checks, and an async callback is a type error (`T extends PromiseLike ? never`, like Drizzle's own for sync drivers). `createDatabase` only casts Drizzle's client to `AppDb`; nothing is checked at runtime. Immediate, since every procedure reads before it writes, and a deferred transaction lets another writer slip in between (or fails with `SQLITE_BUSY` on upgrade, which the busy timeout doesn't retry). Left to review, since the type can't see them: a callback typed `any` or `unknown` that returns a promise (it would commit at its first `await`, and later statements would run outside the transaction), and casts. Rejected: runtime assertions in a wrapper (an `isPromise` check and a behavior check, for cases typed code rarely reaches); a `transaction(db, callback)` helper with ESLint flagging direct `.transaction()` calls; defaulting to `immediate` silently (the call site wouldn't show it).
