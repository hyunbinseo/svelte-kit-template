# 06 Query Layer

How routes, remote functions, and CLI scripts reach the database. This is the most open spec.

## Ideas

- Plain functions taking `db`, bound query sets, repository modules, or per-route `server.ts` — pick what reads best at the call site and in tests.
- Audited reads as a per-call or per-module choice.
- Enforce "sync transaction callbacks" with types.
- Domain verbs for names (`find`, `create`, `claim`, `mark`, `link`, `discard`, `grant`, `revoke`) over SQL verbs.

## Checklist

- [ ] Transactions reject async callbacks (type error and runtime error). `node:sqlite` is sync; an async callback would commit early.
- [ ] Read-then-write paths run in `immediate` transactions.
- [ ] Multi-row invariants (e.g. closing a user revokes their roles and sessions; granting a role requires an active user without it) live in procedures shared by SvelteKit and CLI.
- [ ] Deletes that span tables are procedures too, e.g. one that deletes logins with their attempts (children first), called by closing a user ([08](./08-auth.md)) and the purge job ([12](./12-operations.md)).
- [ ] Each procedure runs in one transaction, reads the clock inside it, guards every row it depends on, returns falsy on no-op — and each guard is tested.
- [ ] Reads are not audited by default; a route can opt in ([07](./07-audit-logging.md)).
- [ ] Drizzle's sync API is used.
- [ ] Values are always bound, never written into SQL text, so errors and telemetry carry no data ([10](./10-observability.md)). `sql.raw` is for identifiers and constants only; ESLint flags it for review.
- [ ] Every read of a soft-deleted table states its filter inline (e.g. `isNull(t.revokedAt)`), including expiry where the table has one (e.g. `gt(t.expiresAt, now)` for sessions), and procedure tests cover it. Drizzle has no global scopes, so a hidden default couldn't be enforced (like Rails' `discard`, not Laravel's `SoftDeletes`).
