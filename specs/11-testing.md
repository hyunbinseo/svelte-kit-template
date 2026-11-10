# 11 Testing

Unit tests (Vitest via Vite+) and E2E (Playwright) with isolated databases.

## Ideas

- A top-level `tests/` that `src/` can't import.
- Build test DBs from migrations vs. directly from the schema.

## Checklist

- [x] Unit tests use a fresh in-memory DB each; seeds come from shared helpers.
- [x] Tests assert with `expect` from `vite-plus/test`, with `ok` from `node:assert/strict` only to narrow — enforced by lint; tests must assert (`requireAssertions`, which counts only `expect`).
- [x] E2E creates its own DB before the server starts and removes it after; workers share it safely.
- [x] E2E uses a custom `test` fixture exposing `db`; importing Playwright's `test` directly is blocked.
- [x] E2E selects by role, attribute, or seeded value — not UI text.
- [x] `vpr test` and `vpr test:e2e` pass.

## Decisions

- Unit tests don't import `#db/app/client.ts`, directly or transitively: it parses `import.meta.env.MODE`, which is `test` under Vitest, and throws. Code under test takes a database instead.
- Test databases are built from the migrations (`createTestAppDb`, `createTestAuditDb`), so tests run the SQL production runs and catch a missing migration wherever they cover the change. Rejected: building from the schema (drizzle-kit at test time, and it could pass where the migration doesn't).
- Each unit test opens its own `:memory:` database (`using db = createTestAppDb()`, or `beforeEach`); seeds live in each database's `testing.ts`. A file database only where the test needs a second connection (locking, the CLI client), in a temp directory.
- Assertions: tests assert with `expect` from `vite-plus/test`, which `requireAssertions` counts. `ok` from `node:assert/strict` stays allowed, to narrow types (`ok(dbs.auditDb)`) and assert invariants the same way runtime code does; it doesn't count toward `requireAssertions`, so a test still needs an `expect`. Lint bans `vitest`, `vitest/*`, and `@vitest/*` everywhere. In unit and E2E tests (`*.test.ts`, `*.e2e.ts`; not helpers like `tests/fixtures.ts`) it also bans every `node:assert/strict` import except `ok` and `AssertionError` (to check that code under test throws one), and `vite-plus/test`'s `assert`. That leaves one way to assert and one way to narrow. These bans use `@typescript-eslint/no-restricted-imports`, which no other block sets for tests, so the core rule's location bans still apply without repeating them per folder. Rejected: Vitest's `assert` for narrowing (a second assertion API next to `expect`, and a different one from the one runtime code uses).
- `tests/` is E2E only: lint bans `#tests/*` in `src/` and `cli/`.
- E2E database: the Playwright `webServer` command runs `vpr db:reset:e2e` (`MODE=e2e` `cli/db/reset-e2e.ts` deletes `[DATA_DIR]/e2e/`, then `db:migrate:e2e`) before building, since `webServer` starts before `globalSetup`. `globalTeardown` (`tests/teardown.ts`) deletes `[DATA_DIR]/e2e/` again. Playwright runs it before stopping the server, so the server still has the files open; on Linux and macOS the unlink succeeds and the open files live until it exits. Untested on Windows: SQLite's open files should block the delete there, failing the teardown; the next run's reset would clean up. Rejected: starting the server in `globalSetup` to control the order (reimplements `webServer`'s build, port wait, and logs).
- Workers share the server's database: WAL with a busy timeout (`openConnection`), and seeds use unique contacts (`createTestContact`). `playwright.config.ts` loads the e2e env files (`loadModeEnv`, [02](./02-cli-separation.md)) for `tests/fixtures.ts` and the teardown.
- `tests/fixtures.ts` exports `test`, with a worker-scoped `db` on the server's database, and re-exports `expect`. Lint bans importing `test`, `expect`, and the default export from `@playwright/test` elsewhere (types and `defineConfig` stay allowed); `tests/fixtures.ts` disables it inline.
- Selectors: by role (`getByRole('banner').getByRole('button')`), attribute (`main a[href="/login"]`; remote form fields are named `[field]/[hash]/[form]`, so `input[name^="code/"]`), or seeded value (`getByText(contact)`). UI text is only asserted (titles, toasts), never used to find an element, so a copy change fails one assertion instead of every test that passes through it.
