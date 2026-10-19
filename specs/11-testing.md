# 11 Testing

Unit tests (Vitest via Vite+) and E2E (Playwright) with isolated databases.

## Ideas

- A top-level `tests/` that `src/` can't import.
- Build test DBs from migrations vs. directly from the schema.

## Checklist

- [ ] Unit tests use a fresh in-memory DB each; seeds come from shared helpers.
- [ ] Test APIs from `vite-plus/test`, assertions from `node:assert/strict` — enforced by lint; tests must assert.
- [ ] E2E creates its own DB before the server starts and removes it after; workers share it safely.
- [ ] E2E uses a custom `test` fixture exposing `db`; importing Playwright's `test` directly is blocked.
- [ ] E2E selects by role, attribute, or seeded value — not UI text.
- [ ] `vpr test` and `vpr test:e2e` pass.
