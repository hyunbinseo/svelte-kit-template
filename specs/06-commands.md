# 06 Commands

**Goal**: Every write runs in a command ([CQRS](https://martinfowler.com/bliki/CQRS.html)): a plain function that SvelteKit, CLI scripts, and tests call alike, and that runs in one synchronous immediate transaction, guards the rows it depends on, and returns which guard failed.

## Rules

### Transactions

1. `db.transaction` requires `behavior`, and only `immediate` and `deferred` type-check; the `tx` type follows it (`immediate` can write, `deferred` only reads). A command reads before it writes, and a deferred transaction that takes the write lock late fails with `SQLITE_BUSY_SNAPSHOT`, which the busy timeout ([05](./05-database.md) rule 9) doesn't retry. A read-only deferred one takes no write lock in WAL, so 07 Queries uses it without blocking commands.
2. A callback that returns a promise is a type error, since `node:sqlite` is sync and an async callback would commit at its first `await`. A callback typed `any` or `unknown`, and casts, get past it; accepted.
3. `tx.transaction` opens a savepoint. Its callback gets the same `tx` type and must be sync, and it takes no `config`.
4. `createAppDb` casts Drizzle's client to `AppDb`, unchecked at runtime. `DrizzleDb` and `DrizzleTx` in `src/db/server/shared/` hold the restricted types, so 08 Audit Logging's db shares them.
5. Database code uses Drizzle's sync API only: statements end in `.run()`, `.all()`, or `.get()`. Lint bans `await` under `src/db/` and in `cli/db/`'s `commands.ts` files. CLI scripts in `cli/db/` may await.
6. A deferred `tx` has no `insert`, `update`, `delete`, `run`, or `with` (its builder can write). Raw SQL through `all`, `get`, or `values` gets past it; accepted.

### Shape

7. A command takes `db: AppDb` first, then one object, so keys can't be swapped by position: `closeUser(db, { closedBy, closedReason, userId })`.
8. It calls `db.transaction` once, with `behavior: 'immediate'`, and returns its result. Lint bans calling any `transaction` method outside command files and tests, matched by name, so an aliased client is caught, and bans `deferred` in command files. Bracket access and destructuring get past it; accepted. An unrelated `transaction` method (e.g. IndexedDB's) takes an inline disable.
9. An ID key is named after its target (`userId`, never `id`), so a swapped ID shows at the call site. Other keys are column names.
10. Each key's type is its column's `Select` type (`closedBy: UserSelect['closedBy']`), not `Insert`, where a nullable column turns optional and a left-out key skips the column instead of writing `null`. A column that can't be `null` here uses `NonNullable<…>`; a narrower value uses its own type.
11. Values the command derives (the clock, a cascade's actor and reason, foreign keys it reads) aren't keys.
12. A command names one intent (`closeUser`, `grantRole`); a catch-all `updateUser` would mix several intents' guards.
13. Commands import neither `$app/*` nor any database's `client.ts`, so `cli/` and tests can call them ([02](./02-cli-separation.md)). Lint enforces it in command files.

### Placement

14. A command lives in a prefix folder's `commands.ts` (05 rule 3).
15. A command only CLI scripts call lives in `cli/db/[database]/[prefix]/commands.ts`, so SvelteKit can't import it, and moves to `src/db/` once SvelteKit needs it.

### Time

16. A command reads the clock once, inside its transaction, and passes that value to every timestamp it writes (05 rule 26) and every expiry it compares.
17. Tests fake the clock the command reads.

### Guards

18. A command checks every row it depends on inside its transaction (the target exists and is active, an actor is an active user or `null`, a state allows the change) and returns without writing when one fails.
19. It returns `CommandResult<ErrorCode, Values>`: `{ ok: false, error }` naming the failed guard, or `{ ok: true, …values }`. Not a throw or a falsy return, so the caller picks the response (a form issue, a 404, a CLI message) without a second read, and a missed case can't become a 500. Values, which strict [CQS](https://martinfowler.com/bliki/CommandQuerySeparation.html) wouldn't return, save the caller a query (e.g. a created row's ID).
20. The union of codes is written on the transaction callback's return type, so callers see every code.
21. A failed guard writes nothing. A command whose failure must still write (a recorded login attempt) states it in a comment, and its test checks that write.
22. Authorization (is the actor an admin?) stays in the caller, since commands also serve the CLI, where the actor is `null`.

### Writes

23. An update to a soft-delete group repeats the group's `At` being null in its `WHERE` (05 rule 28), even after a guard checked it.
24. A delete across tables deletes children first, each table in its own statement (05 rule 24).
25. A cascade (closing a user revokes their roles) runs in the same transaction as the write that triggers it, with its clock and actor.

### Tests

26. Each command has tests next to it, on `createTestAppDb` (05 rule 35), covering success and each guard's code, with no row changed on a failed guard.
27. Tests seed inactive rows (soft-deleted, expired) beside active ones, and check that the command leaves them alone.

### Concurrency

28. Commands behave as if they ran one at a time: no other write lands between a guard's read and the writes that depend on it. On `node:sqlite`, rules 1 and 2 provide this.
29. A transaction callback does database work only; side effects (network, file, queue) run in the caller after `ok`, since a throwing callback rolls back its writes but not its side effects, and other drivers may retry a callback on a conflict. Not checked; accepted.
30. A guard on a rule that 05 rules 30–31 make a constraint still runs: the guard returns the code, and the constraint holds even if rule 28 doesn't.
31. Another driver keeps rules 28–30 and replaces rules 1, 2, and 5. An async one (libSQL/Turso, Postgres) also makes all database code and its callers async; accepted.

## Files

- `src/db/server/shared/drizzle.ts`: `DrizzleDb`, `DrizzleTx`.
- `src/db/server/shared/command.ts`: `CommandResult`.
- `src/db/server/app/drizzle.ts`: `AppDb` and `createAppDb` changed, `AppTx` and `AppReadTx` added.

## Checks

- [ ] A transaction without `behavior`, with `exclusive`, or with an async callback fails `vpr check`.
- [ ] A write method on a deferred `tx` fails `vpr check`, and a write method on an immediate `tx` passes.
- [ ] A write in a savepoint inside a deferred `tx`, and an async savepoint callback, fail `vpr check`.
- [ ] `await` under `src/db/` or in a `cli/db/` `commands.ts` fails lint, and passes in a `cli/db/` script.
- [ ] A `transaction` call outside a command file fails lint, on `db` and on an alias of it; a `deferred` one in a command file fails lint.
- [ ] A sample command with a guard returns the guard's code, writes nothing, and its result narrows on `ok` in a caller.
- [ ] A `$app/*` or `#db/app/client.ts` import in a command file fails lint.
