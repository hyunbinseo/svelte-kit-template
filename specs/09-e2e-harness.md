# 09 E2E Harness

**Goal**: Playwright tests run against the built server in mode `e2e`, on a fresh database they can seed directly, in parallel and without depending on UI copy.

## Rules

### Server

1. `vpr test:e2e` runs Playwright with `MODE=e2e` ([03](./03-environment.md) rule 18). `playwright.config.ts` imports `cli/lib/env.ts`, as tool configs do ([03](./03-environment.md) rule 19).
2. Before the server starts, Playwright's `webServer` command resets the e2e data, migrates it, builds in mode `e2e`, and starts the built server as `vpr start` does, with mode `e2e`'s env files ([03](./03-environment.md) rule 21). Why the built server, not `vpr dev` or `vpr preview`: tests run the server production runs, its startup migration check included ([05](./05-database.md) rule 18). Why in `webServer`: Playwright starts it before `globalSetup`.
3. A running server on the e2e port is never reused: it may hold another run's database or build. The run fails instead.
4. `cli/db/reset-e2e.ts` deletes `[DATA_DIR]/e2e/`. Run in any mode but `e2e`, it fails as an expected failure ([02](./02-cli-separation.md) rule 14) and deletes nothing. Why a mode check, not a path argument: no script can delete another mode's data.
5. The data stays after a run, so a failed run's databases can be inspected. The next run's reset clears it.
6. Playwright's output directories are gitignored.

### Fixtures

7. `tests/fixtures.ts` exports `test`, extending Playwright's with worker-scoped `db` and `auditDb`, opened through `openDbs` ([08](./08-audit-logging.md) rule 14) on the server's database files. Seeds are logged as CLI writes are; accepted.
8. Lint bans importing `test` and `expect` from `@playwright/test` outside `tests/fixtures.ts`, which re-exports `expect`. Type imports and `defineConfig` stay allowed.
9. The fixtures' connections and the server's write the same files concurrently, relying on WAL and the busy timeout ([05](./05-database.md) rule 9).

### Layout

10. E2E tests are `tests/**/*.e2e.ts`. They test the app, not one file, so [01](./01-conventions.md) rule 3 doesn't place them. `tests/` holds only E2E code.
11. Every subpath into `tests/` starts with `#tests/`. Lint bans `#tests/*` under `src/` and `cli/`.
12. `tests/tsconfig.json` extends `cli/tsconfig.json`, adding only the DOM lib for `page.evaluate` callbacks. `vpr check` type-checks `tests/` and `playwright.config.ts` with it. So tests reach `src/` only through CLI-safe modules: `$app/*` and `#db/app/client.ts` don't resolve ([02](./02-cli-separation.md) rule 6).
13. Vitest doesn't collect `*.e2e.ts`.

### Writing Tests

14. Tests run in parallel, within a file too. Each test seeds its own rows with unique values (`randomUUID`) and asserts only on rows it seeded or its own requests created, never on table counts.
15. Seed helpers live in each database's `testing.ts` ([05](./05-database.md) rule 35), shared with unit tests. A seed inserts rows directly and takes timestamps as arguments, so a test seeds an expired or revoked row without faking the server's clock. [06](./06-commands.md) rule 8's lint treats `testing.ts` as a test file.
16. Elements are found by role, by attribute, or by a seeded value, never by UI copy. Lint bans a string literal or template literal as the text a locator matches: the argument of `getByText`, `getByLabel`, `getByPlaceholder`, `getByTitle`, and `getByAltText`, and `getByRole`'s `name`. UI copy appears only in assertions (`toHaveTitle`, `toHaveText`). Why: a copy change fails one assertion, not every test that passes through it.
17. E2E covers what needs a browser or the built server: cookies, redirects, hooks, and pages. Logic with no such need is unit-tested.
18. Chromium is the only browser; accepted.
19. From this spec on, `vpr test:e2e` passes after every spec, beside the global checks.

## Files

- `tests/tsconfig.json`
- `tests/fixtures.ts`: `test`, `expect`.
- `tests/home.e2e.ts`
- `cli/db/reset-e2e.ts`
- `playwright.config.ts`

## Checks

- [ ] `vpr test:e2e` builds in mode `e2e`, starts the built server on a fresh `[DATA_DIR]/e2e/`, and passes.
- [ ] `vpr test:e2e` fails while another process listens on the e2e port (try it, then revert).
- [ ] `MODE=development node cli/db/reset-e2e.ts` fails without a stack and deletes nothing.
- [ ] A row seeded through `db` is read by a sample remote query, and an entry the server stored is read through `auditDb` (try it, then revert).
- [ ] Importing `test` from `@playwright/test` in a `*.e2e.ts` file fails lint (try it, then revert).
- [ ] A `#tests/*` import under `src/` or `cli/` fails lint (try each, then revert).
- [ ] An `$app/*` or `#db/app/client.ts` import in a test fails `vpr check` (try each, then revert).
- [ ] `getByText('로그인')` and `getByRole('button', { name: '로그인' })` fail lint; `getByText(contact)` and `toHaveTitle('…')` pass (try each, then revert).
- [ ] `vpr test` collects no `*.e2e.ts` file.
- [ ] `vpr check`, `vpr lint`, `vpr test`, and `vpr test:e2e` pass.
