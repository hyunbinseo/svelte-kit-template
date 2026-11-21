# 01 Conventions

**Goal**: Lint enforces every convention it can, defined only in `eslint.config.js`; `AGENTS.md` holds style beyond lint.

## Rules

1. Project files import each other through subpath imports (`#…`), even within one folder, so each file has one spelling that later import bans (e.g. [02](./02-cli-separation.md)) can match. Lint bans `./` and `../` imports, except `./$types.ts`. Where no subpath fits, an inline disable marks the import.
2. VS Code and Zed auto-import non-relative specifiers.
3. Tests sit next to the file they test (`x.ts` → `x.test.ts`).
4. Each lint ban's message names what to use instead.
5. `AGENTS.md` holds the style lint can't enforce, and `CLAUDE.md` imports it.

## Checks

- [x] Each lint rule fails on a sample violation: `./` import, `../` import, namespace import, `node:assert`, `vite`, `vitest`, function declaration, `function` callback, unsorted object keys, `{@const}`, floating promise, misused promise, `switch` missing a union member, lowercase comment, top-level `test`, unawaited `expect(…).resolves`, duplicate test title.
- [x] A `.cjs` file, `./$types.ts`, and an inline-disabled `./` import pass lint.
- [ ] Auto-import in VS Code inserts a `#…` specifier.
- [ ] Auto-import in Zed inserts a `#…` specifier.
- [x] `AGENTS.md` holds the style lint can't enforce, and `CLAUDE.md` imports it.
