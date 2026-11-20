# 09 E2E Harness

**Goal**: Playwright tests run against the built server in mode `e2e`, on a fresh database they can seed directly, in parallel and without depending on UI copy.

## Rules

### Server

1. `vpr test:e2e` runs Playwright with `MODE=e2e` ([03](./03-environment.md) rule 18). `playwright.config.ts` imports `cli/lib/env.ts`, as tool configs do ([03](./03-environment.md) rule 19).
2. Playwright's `webServer` runs `vpr db:reset:e2e` (reset, then migrate), `vpr build:e2e` (build in mode `e2e`), and `vpr start:e2e`, which starts the built server as `vpr start` does, with mode `e2e`'s env files in place of production's ([03](./03-environment.md) rule 21). Why the built server, not `vpr dev` or `vpr preview`: tests run the server production runs, its startup migration check included ([05](./05-database.md) rule 18). Why in `webServer`: Playwright starts it before `globalSetup`.
3. The server inherits the env files `cli/lib/env.ts` loaded into Playwright's process, so its own env-file flags add nothing there; accepted, since both read mode `e2e`'s files.
4. The e2e build writes the same output directories as `vpr build`, replacing a local build; accepted. Releases build elsewhere ([04](./04-build-output.md) rule 2).
5. A running server on the e2e port is never reused: it may hold another run's database or build. The run fails before resetting.
6. `cli/db/reset-e2e.ts` deletes mode `e2e`'s data directory, resolved as `prepareDatabasePath` resolves it ([05](./05-database.md) rule 4), so the reset and the server can't disagree. Run in any mode but `e2e`, it fails as an expected failure ([02](./02-cli-separation.md) rule 14) and deletes nothing. Why a mode check, not a path argument: no script can delete another mode's data.
7. The data stays after a run, so a failed run's databases can be inspected. The next run's reset clears it.
8. Playwright's output directories are gitignored.

### Fixtures

9. `tests/fixtures.ts` exports `test`, extending Playwright's with worker-scoped `db` and `auditDb`, opened through `openDbs` ([08](./08-audit-logging.md) rule 14) on the server's database files and closed at worker teardown.
10. Seeds are logged as CLI writes are ([08](./08-audit-logging.md) rule 17), with `tests/fixtures.ts` as their `pathname`, since a worker's script path is Playwright's.
11. Lint bans importing `test` and `expect` from `@playwright/test` outside `tests/fixtures.ts`, which re-exports `expect`. Type imports and `defineConfig` stay allowed.
12. The fixtures' connections and the server's write the same files concurrently, relying on WAL and the busy timeout ([05](./05-database.md) rule 9).

### Layout

13. E2E tests are `tests/**/*.e2e.ts`. They test the app, not one file, so [01](./01-conventions.md) rule 3 doesn't place them. `tests/` holds only E2E code.
14. Every subpath into `tests/` starts with `#tests/`. Lint bans `#tests/*` under `src/` and `cli/`.
15. `tests/tsconfig.json` extends `cli/tsconfig.json`, adding only the DOM lib for `page.evaluate` callbacks. `vpr check` type-checks `tests/` and `playwright.config.ts` with it, and the root config excludes both. So tests reach `src/` only through CLI-safe modules: `$app/*` and `#db/app/client.ts` don't resolve ([02](./02-cli-separation.md) rule 6). Editors check them under the root config; accepted, as for `cli/`.
16. Vitest doesn't collect `*.e2e.ts`.

### Writing Tests

17. Tests run in parallel, within a file too. Each test seeds its own rows with unique values (`randomUUID`) and asserts only on rows it seeded or its own requests created, never on table counts.
18. A test that depends on state it can't key to itself (e.g. no users yet) runs in the `serial` project: one worker, after the parallel project finishes. A later spec that adds global state (e.g. a per-IP limit) keys it so tests can isolate it, or its tests run there.
19. Seed helpers live in each database's `testing.ts` ([05](./05-database.md) rule 35), shared with unit tests. A seed inserts rows directly and takes timestamps as arguments, so a test seeds an expired or revoked row without faking the server's clock. [06](./06-commands.md) rule 8's lint treats `testing.ts` as a test file.
20. E2E files write only through seed helpers: lint bans `transaction` in `*.e2e.ts`. Reads stay allowed, to assert on rows.
21. Elements are found by role, by attribute, or by a seeded value, never by UI copy. Lint bans a string, template, or regex literal as the text a locator matches: the argument of `getByText`, `getByLabel`, `getByPlaceholder`, `getByTitle`, and `getByAltText`, `getByRole`'s `name`, and `filter`'s `hasText` and `hasNotText`. UI copy appears only in assertions (`toHaveTitle`, `toHaveText`). A named constant or a `locator('text=…')` gets past it; accepted. Why: a copy change fails one assertion, not every test that passes through it.
22. `forbidOnly` is always on, so a committed `test.only` fails the run instead of passing a subset.
23. E2E covers what needs a browser or the built server: cookies, redirects, hooks, and pages. Logic with no such need is unit-tested.
24. Chromium is the only browser; accepted.
25. From this spec on, `vpr test:e2e` passes after every spec, beside the global checks.

## Files

- `tests/tsconfig.json`
- `tests/fixtures.ts`: `test`, `expect`.
- `tests/home.e2e.ts`: the home page responds `200`.
- `cli/db/reset-e2e.ts`
- `cli/db/client.ts`: `openDbs` takes the `pathname` to log.
- `playwright.config.ts`

## Checks

- [ ] `vpr test:e2e` builds in mode `e2e`, starts the built server on a fresh e2e data directory, and passes. The data is still there afterwards.
- [ ] `vpr test:e2e` fails while another process listens on the e2e port, and the e2e data is unchanged (try it, then revert).
- [ ] With a pending migration that `db:reset:e2e` doesn't apply, the server fails to start (try it, then revert).
- [ ] `vpr db:reset:e2e` deletes and recreates the e2e data and leaves `data/development/` intact. `MODE=development node cli/db/reset-e2e.ts` fails without a stack and deletes nothing.
- [ ] A row seeded through `db` is read by a sample remote query, and an entry the server stored is read through `auditDb`. A seed's entry has `tests/fixtures.ts` as its `pathname` (try it, then revert).
- [ ] A `test.only` fails the run (try it, then revert).
- [ ] Importing `test` from `@playwright/test` in a `*.e2e.ts` file fails lint (try it, then revert).
- [ ] A `transaction` call passes lint in `testing.ts` and fails in a `*.e2e.ts` file (try each, then revert).
- [ ] A `#tests/*` import under `src/` or `cli/` fails lint (try each, then revert).
- [ ] An `$app/*` or `#db/app/client.ts` import in a test fails `vpr check` (try each, then revert).
- [ ] `getByText('로그인')`, `getByRole('button', { name: /로그인/ })`, and `filter({ hasText: '로그인' })` fail lint; `getByText(contact)` and `toHaveTitle('…')` pass (try each, then revert).
- [ ] `vpr test` collects no `*.e2e.ts` file.
- [ ] `vpr check`, `vpr lint`, `vpr test`, and `vpr test:e2e` pass.
