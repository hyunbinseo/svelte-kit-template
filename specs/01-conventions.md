# 01 Conventions

**Goal**: Lint enforces every code convention it can; this spec states the rest.

## Rules

### Files and Imports

1. `.js`/`.ts` for ES modules, `.cjs`/`.cts` for CommonJS. Lint rejects `.mjs`/`.mts`.
2. Project files import each other through subpath imports (`#…`), even within one folder. Lint bans `./` and `../` imports, except `./$types.ts`. Where no subpath fits, an inline disable marks the import. Why: each file has one spelling, so later import bans (e.g. [02](./02-cli-separation.md)) can match the import text.
3. VS Code and Zed auto-import non-relative specifiers.
4. A subpath is added when the first file needs it, not ahead of time.
5. Named imports only. Lint bans namespace imports (`import * as`), including `valibot`.
6. Assertions import from `node:assert/strict`. Lint bans `assert`, `assert/strict`, and `node:assert`.
7. Toolchain imports go through `vite-plus`. Lint bans `vite` and `vite/*` (use `vite-plus`), `vitest`, `vitest/*`, and `@vitest/*` (use `vite-plus/test`), and `tsdown` (use `vite-plus/pack`).

### Code

8. Functions are `const` arrow expressions. Lint enforces it.
9. Object keys, union members, and similar lists are sorted naturally (`eslint-plugin-perfectionist`'s recommended config). Imports are sorted by Oxfmt instead. Where order carries meaning, a config glob opts out whole files (e.g. Drizzle schemas), and a disable comment opts out a single object.
10. Svelte templates use declaration tags, not `{@const}`. Lint enforces it.
11. File paths are built with `node:path`, not string templates.
12. Library defaults over custom messages: `node:assert/strict` for runtime checks, Valibot's default messages.
13. No wrappers around a single library call (e.g. a `parseEnv()` that only calls `v.parse`). A helper earns its place by hiding logic, not by being reused.
14. Name what a value is, not its shape (`loginIds`, `activeUser`, not `ids`, `current`, `r`). Booleans read as predicates (`isValid`).
15. Keep an object with a natural name and read its fields (`user.id`). Destructure only where no such name exists (an argument object, `{ default: x }` from a dynamic import).
16. Blank lines separate steps within a function, and surround each multi-line statement. Related one-liners stay together.

### Tests

17. Tests sit next to the file they test (`x.ts` → `x.test.ts`). Every test sits in a `describe` named after the unit it tests, so adding a second unit doesn't re-indent the first. Fixed values are named (`USER_ID`), not bare literals.
18. Test files follow `@vitest/eslint-plugin`'s recommended config, plus a top-level `describe` (rule 17). The plugin is told that `vite-plus/test` is a Vitest import.

### Comments

19. Short. Say what the code can't, not what the value already says.
20. Comments start uppercase; lint enforces it. Full sentences end with punctuation. Links are full URLs with no trailing period (`// See <URL>`).

### Docs

21. Until the rewrite ends, `CLAUDE.md` imports this spec, so rules 11–20 reach agents. `AGENTS.md` takes them over once every spec is done.

## Checks

- [ ] Each lint rule above fails on a sample violation (try it, then revert): `.mjs` file, `./` import, `../` import, namespace import, `node:assert`, `vite`, `vitest`, function declaration, `function` callback, unsorted object keys, `{@const}`, lowercase comment, top-level `test`, unawaited `expect(…).resolves`, duplicate test title.
- [ ] A `.cjs` file, `./$types.ts`, and an inline-disabled `./` import pass lint.
- [ ] Auto-import in VS Code inserts a `#…` specifier.
- [ ] `CLAUDE.md` imports this spec.
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
