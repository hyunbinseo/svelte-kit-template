# 11 Testing

Unit tests (Vitest via Vite+) and E2E (Playwright) with isolated databases.

## Ideas

- A top-level `tests/` that `src/` can't import.
- Build test DBs from migrations vs. directly from the schema.

## Checklist

- [ ] Unit tests use a fresh in-memory DB each; seeds come from shared helpers.
- [ ] Test APIs and assertions from `vite-plus/test` (`expect`) — enforced by lint; tests must assert (`requireAssertions`, which counts only `expect`).
- [ ] E2E creates its own DB before the server starts and removes it after; workers share it safely.
- [ ] E2E uses a custom `test` fixture exposing `db`; importing Playwright's `test` directly is blocked.
- [ ] E2E selects by role, attribute, or seeded value — not UI text.
- [ ] `vpr test` and `vpr test:e2e` pass.

## Decisions

- Unit tests don't import `#db/server/app/client.ts`, directly or transitively: it parses `import.meta.env.MODE`, which is `test` under Vitest, and throws. Code under test takes a database instead.
