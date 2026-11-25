# 06 Commands

**Goal**: Every write runs in a command ([CQRS](https://martinfowler.com/bliki/CQRS.html)): a plain function, called alike by SvelteKit, CLI scripts, and tests, that runs one synchronous immediate transaction, guards the rows it depends on, and returns which guard failed.

## Rules

### Transactions

1. `db.transaction` requires `behavior: 'immediate'`, and its `tx` can write. Not `deferred`: a command reads before it writes, and a deferred transaction that takes the write lock late fails with `SQLITE_BUSY_SNAPSHOT`, which the busy timeout ([05](./05-database.md) rule 9) doesn't retry. 07 Queries adds a read-only `deferred`.
2. A callback that returns a promise is a type error, since `node:sqlite` is sync and an async callback would commit at its first `await`. Casts and callbacks typed `any` or `unknown` get past it; accepted.
3. `tx.transaction` opens a savepoint: same `tx` type, sync callback, no `config`.
4. `createAppDb` casts Drizzle's client to `AppDb`, unchecked at runtime. `DrizzleDb` and `DrizzleTx` in `src/db/server/shared/` hold the restricted types, so 08 Audit Logging's db shares them.
5. Database code uses Drizzle's sync API only: statements end in `.run()`, `.all()`, or `.get()`. Lint bans `await` under `src/db/` and in `cli/db/`'s `commands.ts` files. CLI scripts in `cli/db/` may await.

### Shape

6. A command takes `db: AppDb` first, then one object, so keys can't be swapped by position: `closeUser(db, { closedBy, closedReason, userId })`.
7. It calls `db.transaction` once and returns its result. Lint bans calling any `transaction` method outside command files and tests, matched by name, so an aliased client is caught. Bracket access and destructuring get past it; accepted. An unrelated `transaction` method (e.g. IndexedDB's) takes an inline disable.
8. An ID key is named after its target (`userId`, never `id`), so a swapped ID shows at the call site. Other keys are column names.
9. Each key's type is its column's `Select` type (`closedBy: UserSelect['closedBy']`), not `Insert`, whose nullable columns are optional, so a forgotten key would skip the column instead of writing `null`. A column that can't be `null` here uses `NonNullable<…>`; a narrower value uses its own type.
10. Values the command derives (the clock, a cascade's actor and reason, foreign keys it reads) aren't keys.
11. A command names one intent (`closeUser`, `grantRole`); a catch-all `updateUser` would mix several intents' guards.
12. Commands import neither `$app/*` nor any database's `client.ts`, so `cli/` and tests can call them ([02](./02-cli-separation.md)). Lint enforces it in command files.

### Placement

13. A command lives in a prefix folder's `commands.ts` (05 rule 3).
14. A command called only by CLI scripts lives in `cli/db/[database]/[prefix]/commands.ts`, so SvelteKit can't import it, and moves to `src/db/` once SvelteKit needs it.

### Time

15. A command reads the clock once, inside its transaction, and uses it for every timestamp it writes (05 rule 26) and every expiry it compares.
16. Tests fake the clock the command reads.

### Guards

17. A command checks every row it depends on inside its transaction (the target exists and is active, an actor is an active user or `null`, a state allows the change) and returns without writing when one fails.
18. It returns `CommandResult<ErrorCode, Values>`: `{ ok: false, error }` naming the failed guard, or `{ ok: true, …values }`. Not a throw or a falsy return, so the caller picks the response (a form issue, a 404, a CLI message) without a second read, and a missed case can't become a 500. Values, which strict [CQS](https://martinfowler.com/bliki/CommandQuerySeparation.html) wouldn't return, save the caller a query (e.g. a created row's ID).
19. The transaction callback's return type declares the union of codes, so callers see every code.
20. A failed guard writes nothing. A command whose failure must still write (a recorded login attempt) states it in a comment, and its test checks that write.
21. Authorization (is the actor an admin?) stays in the caller, since commands also serve the CLI, where the actor is `null`.

### Writes

22. An update to a soft-delete group has `[verb]At IS NULL` in its `WHERE` (05 rule 29), even after a guard checked it.
23. A delete across tables deletes children first (05 rule 24).
24. A cascade (closing a user revokes their roles) runs in the same transaction as the write that triggers it, with that write's clock and actor.

### Tests

25. Each command has tests next to it, on `createTestAppDb` (05 rule 37), covering success and each guard's code, with no row changed on a failed guard.
26. Tests seed inactive rows (soft-deleted, expired) beside active ones, and check that the command leaves them alone.

### Concurrency

27. Commands behave as if they ran one at a time: no other write lands between a guard's read and the writes that depend on it. On `node:sqlite`, rules 1 and 2 provide this.
28. A transaction callback does database work only; side effects (network, file, queue) run in the caller after `ok`, since a throwing callback rolls back its writes but not its side effects, and other drivers may retry a callback on a conflict. Not checked; accepted.
29. A guard on a rule that 05 rules 31–32 make a constraint still runs: the guard returns the code, and the constraint holds even if rule 27 doesn't.
30. Another driver keeps rules 27–29 and replaces rules 1, 2, and 5. An async one (libSQL/Turso, Postgres) also makes all database code and its callers async; accepted.

## Files

- `src/db/server/shared/drizzle.ts`: `DrizzleDb`, `DrizzleTx`.
- `src/db/server/shared/command.ts`: `CommandResult`.
- `src/db/server/app/drizzle.ts`: `AppDb` and `createAppDb` changed, `AppTx` added.

## Checks

- [ ] A transaction without `behavior`, with `exclusive`, or with an async callback fails `vpr check`, and a write method on its `tx` passes.
- [ ] An async savepoint callback fails `vpr check`.
- [ ] `await` under `src/db/` or in a `cli/db/` `commands.ts` fails lint, and passes in a `cli/db/` script.
- [ ] A `transaction` call outside a command file fails lint, on `db` and on an alias of it.
- [ ] A sample command with a guard returns the guard's code, writes nothing, and its result narrows on `ok` in a caller.
- [ ] A `$app/*` or `#db/app/client.ts` import in a command file fails lint.
