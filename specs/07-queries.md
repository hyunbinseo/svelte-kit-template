# 07 Queries

**Goal**: SvelteKit server modules read through queries and write through commands ([CQRS](https://martinfowler.com/bliki/CQRS.html)), so they hold no SQL.

## Rules

### Boundary

1. Modules in `src/` outside `src/db/` (remote files, `+server`, `+page.server`, `+layout.server`, `hooks.server`, `$lib/server`) don't build SQL. Lint bans their value imports of `drizzle-orm` (and its subpaths) and of `schema.ts`, and every property of `db`; passing `db` to a query or command stays allowed. Type imports stay allowed, for key types ([06](./06-commands.md) rule 10). The `db` ban matches by name, so an alias or destructuring gets past it; accepted. Why: a remote file reads as what it does, not how it queries, and SQL moved into a helper would read the same.
2. `DrizzleDb` has no `insert`, `update`, `delete`, `run`, or `with`, like a deferred `tx` ([06](./06-commands.md) rule 6), so `AppDb` and 08 Audit Logging's db get the same restriction ([06](./06-commands.md) rule 4). So only an immediate `tx`, opened only in commands and tests ([06](./06-commands.md) rule 8), can write. Raw SQL through `all`, `get`, or `values` gets past it; accepted. Without `with`, a query can't use a CTE; accepted.
3. Commands and CLI scripts may build SQL. Why: a command's SQL sits beside its guards, and a wrapper per statement would add only indirection.
4. Lint bans `sql.raw` and `inlineParams` everywhere, so values stay bound and out of error text ([05](./05-database.md) rule 11). Identifiers use `sql.identifier`; a constant takes an inline disable.
5. An enum's `as const` array ([05](./05-database.md) rule 29) lives outside `src/db/server/`, and `schema.ts` imports it. Why: remote files' Valibot schemas and the UI import it, and rule 1 and server-only modules would block it in `schema.ts`.

### Queries

6. A query only reads. Every write is a command.
7. A query takes `db: AppDbOrTx` (`AppDb`, `AppTx`, or `AppReadTx`) first, then one object keyed as commands are ([06](./06-commands.md) rules 9–10): `findActiveUser(db, { userId })`. A query with no keys takes `db` alone. A command may call it with its `tx`.
8. A query's statements may see writes land in between, unless a command calls it with its `tx`. A query whose reads must share one snapshot (a list and its count) opens one deferred transaction and takes `db: AppDb`, since a `tx` would open a savepoint, which takes no `behavior` ([06](./06-commands.md) rule 3). Lint extends [06](./06-commands.md) rule 8 to query files, banning `immediate` there.
9. A query reads no clock: the caller passes `now` ([06](./06-commands.md) rule 16).
10. A query states its soft-delete and expiry filters inline, and its name states the state it narrows to (`findActiveUser`). Why: Drizzle has no global scopes, so a hidden default couldn't be enforced.
11. Row access (is this order the viewer's?) is a filter in the query, not a check after it: `findCustomerOrder(db, { customerId, orderId })` returns `undefined` for a missing, cancelled, or another customer's order alike. Why: a missed check can't leak the row, and one 404 for all three reveals no IDs.
12. Queries live in the `queries.ts` of the prefix folder ([05](./05-database.md) rule 3) of the table they select `from`, whoever calls them. Query files follow [06](./06-commands.md) rule 13, its lint ban included, so a command can call them from the CLI.
13. Each query has tests next to it, on `createTestAppDb`, seeding inactive rows beside active ones, and rows the access filter excludes (rule 11).

## Files

- `src/db/server/shared/drizzle.ts`: `DrizzleDb` changed, `DrizzleDbOrTx` added.
- `src/db/server/app/drizzle.ts`: `AppDbOrTx` added.

## Checks

- [ ] A value import of `drizzle-orm` or a `schema.ts`, and `db.select`, fail lint in a remote file, a `+page.server.ts`, `hooks.server.ts`, and a `$lib/server` module; a type import and `findX(db, …)` pass (try each, then revert).
- [ ] `db.insert`, `db.update`, `db.delete`, and `db.run` fail `vpr check`; the same calls on an immediate `tx` pass (try each, then revert).
- [ ] A sample query accepts `db`, an immediate `tx`, and a deferred `tx`, and `db.insert` inside it fails `vpr check` (try it, then revert).
- [ ] In a query file, a deferred transaction passes lint and an immediate one fails (try each, then revert).
- [ ] `sql.raw` and `inlineParams` fail lint (try each, then revert).
- [ ] A `$app/*` or `#db/app/client.ts` import in a query file fails lint (try each, then revert).
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
