# 06 Commands

**Goal**: Every write runs in a command ([CQRS](https://martinfowler.com/bliki/CQRS.html)): a plain function that SvelteKit, CLI scripts, and tests call alike, and that runs in one synchronous immediate transaction, guards the rows it depends on, and returns which guard failed.

## Rules

### Transactions

1. `db.transaction` requires `behavior`, and only `immediate` and `deferred` type-check. The `tx` type follows it: `immediate` can write, `deferred` can only read. Why: a command reads before it writes, and a deferred transaction that takes the write lock late fails with `SQLITE_BUSY_SNAPSHOT`, which the busy timeout ([05](./05-database.md) rule 9) doesn't retry. A deferred one that only reads takes no write lock in WAL, so it doesn't block commands. 07 Queries opens deferred ones.
2. A callback that returns a promise is a type error. Why: `node:sqlite` is sync, so an async callback would commit at its first `await`. A callback typed `any` or `unknown`, and casts, get past it; accepted.
3. `tx.transaction` opens a savepoint. Its callback gets the same `tx` type and must be sync, and it takes no `config`.
4. `createAppDb` casts Drizzle's client to `AppDb`; nothing is checked at runtime. `DrizzleDb` and `DrizzleTx` in `src/db/server/shared/` hold the restricted types, so 08 Audit Logging's db gets the same ones.
5. Database code uses Drizzle's sync API only: statements end in `.run()`, `.all()`, or `.get()`. Lint bans `await` under `src/db/` and `cli/db/`.
6. A deferred `tx` has no `insert`, `update`, `delete`, `run`, or `with` (its builder can write). Raw SQL through `all`, `get`, or `values` gets past it; accepted.

### Shape

7. A command takes `db: AppDb` first, then one object: `closeUser(db, { closedBy, closedReason, userId })`. Why: named keys can't be swapped by position.
8. It calls `db.transaction` once, with `behavior: 'immediate'`, and returns its result. Lint bans calling any `transaction` method outside command files and tests, matched by name, so an aliased client is caught, and bans `deferred` in command files. Bracket access and destructuring get past it; accepted. An unrelated `transaction` method (e.g. IndexedDB's) takes an inline disable.
9. An ID key is named after its target (`userId`, never `id`), so a swapped ID shows at the call site. Other keys are column names.
10. Each key's type is its column's `Select` type (`closedBy: UserSelect['closedBy']`). Why not `Insert`: a nullable column would turn optional, and a left-out key would skip the column instead of writing `null`. A column that can't be `null` here uses `NonNullable<…>`; a narrower value uses its own type.
11. Values the command derives (the clock, a cascade's actor and reason, foreign keys it reads) aren't keys.
12. A command names one intent (`closeUser`, `grantRole`), not a generic update. Why: a catch-all `updateUser` would mix several intents' guards.
13. Commands never import `$app/*` or `#db/app/client.ts`, so `cli/` and tests can call them ([02](./02-cli-separation.md)). Lint bans importing `$app/*` and any database's `client.ts` in command files.

### Placement

14. A command lives in a prefix folder's `commands.ts` ([05](./05-database.md) rule 3).
15. A command only CLI scripts call lives in `cli/db/[database]/[prefix]/commands.ts`, mirroring [05](./05-database.md) rule 3, so SvelteKit can't import it. It moves to `src/db/` once SvelteKit needs it.

### Time

16. A command reads the clock once, inside its transaction, and passes that value to every timestamp it writes ([05](./05-database.md) rule 26) and every expiry it compares.
17. Tests fake the clock the command reads.

### Guards

18. A command checks every row it depends on inside its transaction (the target exists and is active, an actor is an active user or `null`, a state allows the change) and returns without writing when one fails.
19. It returns `CommandResult<ErrorCode, Values>`: `{ ok: false, error }` naming the failed guard, or `{ ok: true, …values }`. Why not throws or falsy returns: the caller picks the response (a form issue, a 404, a CLI message) without a second read, and a missed case can't become a 500. Why values, when strict [CQS](https://martinfowler.com/bliki/CommandQuerySeparation.html) returns nothing: a created row's ID saves the caller a query.
20. The union of codes is written on the transaction callback's return type, so callers see every code.
21. A failed guard writes nothing. A command whose failure must still write (a recorded login attempt) states it in a comment, and its test checks that write.
22. Authorization (is the actor an admin?) stays in the caller. Commands also serve the CLI, where the actor is `null`.

### Writes

23. An update to a soft-delete group repeats the group's `At` being null in its `WHERE` ([05](./05-database.md) rule 28), even after a guard checked it.
24. A delete across tables deletes children first, each table in its own statement ([05](./05-database.md) rule 24).
25. A cascade (closing a user revokes their roles) runs in the same transaction as the write that triggers it, with its clock and actor.

### Tests

26. Each command has tests next to it, on `createTestAppDb` ([05](./05-database.md) rule 35), covering success and each guard's code, with no row changed on a failed guard.
27. Tests seed inactive rows (soft-deleted, expired) beside active ones, and check that the command leaves them alone.

### Concurrency

28. Commands behave as if they ran one at a time: no other write lands between a guard's read and the writes that depend on it. On `node:sqlite`, rules 1 and 2 provide this.
29. A transaction callback does database work only: no network, file, or queue calls. Side effects run in the caller after `ok`. Why: a callback that throws rolls back its writes but not its side effects, and drivers other than `node:sqlite` may retry a callback on a conflict, running them twice. Not checked; accepted.
30. A guard on a rule that [05](./05-database.md) rules 30–31 make a constraint still runs: the guard returns the code, and the constraint holds even if rule 28 doesn't.
31. Another driver keeps rules 28–30 and replaces rules 1, 2, and 5. An async one (libSQL/Turso, Postgres) also makes all database code and its callers async; accepted.

## Files

- `src/db/server/shared/drizzle.ts`: `DrizzleDb`, `DrizzleTx`.
- `src/db/server/shared/command.ts`: `CommandResult`.
- `src/db/server/app/drizzle.ts`: `AppDb` and `createAppDb` changed, `AppTx` and `AppReadTx` added.

## Checks

- [ ] A transaction without `behavior`, with `exclusive`, or with an async callback fails `vpr check` (try each, then revert).
- [ ] A write method on a deferred `tx` fails `vpr check`, and a write method on an immediate `tx` passes (try each, then revert).
- [ ] A write in a savepoint inside a deferred `tx`, and an async savepoint callback, fail `vpr check` (try each, then revert).
- [ ] `await` under `src/db/` or `cli/db/` fails lint (try it, then revert).
- [ ] A `transaction` call outside a command file fails lint, on `db` and on an alias of it; a `deferred` one in a command file fails lint (try each, then revert).
- [ ] A sample command with a guard returns the guard's code, writes nothing, and its result narrows on `ok` in a caller (try it, then revert).
- [ ] A `$app/*` or `#db/app/client.ts` import in a command file fails lint (try each, then revert).
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
