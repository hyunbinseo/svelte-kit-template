# 02 CLI Separation

**Goal**: Node-only scripts live in `cli/`, run with plain `node`, and a type check fails if they reach SvelteKit or Vite-only APIs.

## Rules

### Layout

1. Scripts run with plain `node` through type stripping, with no build step.
2. Every subpath into `cli/` starts with `#cli/`, so rule 10's ban matches them all. `cli/` reaches `src/` through `src/`'s own subpaths (e.g. `#lib/*`), not a CLI-only alias, since rule 5 already proves an imported `src/` file is CLI-safe.

### Type Check

3. `cli/` has its own `tsconfig.json`, extending the root one, that types only what plain `node` runs: ESNext without DOM, Node types, erasable syntax, and no SvelteKit types or `kit.alias` paths.
4. `vpr check` type-checks `cli/` with that config, after `svelte-check`.
5. Every `src/` file `cli/` imports is checked under `cli/`'s config, so the boundary holds transitively: `$app/*` doesn't resolve, and `import.meta.env`/`import.meta.glob` are untyped.
6. An import of `@sveltejs/kit` (direct, side-effect, or in a library's `.d.ts`) declares `$app/*`, so the canary's `$app/*` probe stops erroring and fails `vpr check`. This relies on kit's type layout; accepted.
7. Importing `vite-plus` is allowed (e.g. `loadEnv`, [03](./03-environment.md)), since it runs under Node; only Vite's client types are Vite-only.
8. `cli/tsconfig.canary.ts` is a permanent negative test: one `@ts-expect-error` probe each for non-erasable syntax, `$app/*`, `import.meta.env`, and the DOM. A weakened config, or a stray `/// <reference types="vite/client" />`, fails `vpr check`.
9. No TypeScript project references: they need `composite`, and tsserver would still check `src/` files under the root project.

### Direction

10. `src/` never imports `cli/`: lint bans `#cli/*` under `src/`. With relative imports banned ([01](./01-conventions.md) rule 1), only dynamic imports get past it; accepted.

### Tests

11. `cli/` tests run in their own Vitest project, without the SvelteKit plugin.

### Runtime

12. Scripts parse arguments with `node:util`'s `parseArgs`, `strict` on, so an unknown option fails. They check their positional count themselves. Values are validated before use (e.g. a SHA's format).
13. A failed script exits non-zero. An expected failure prints its message to stderr without a stack and sets `process.exitCode`; anything else throws. No script calls `process.exit`, which can exit before piped output flushes, cutting off the error.

## Files

- `cli/tsconfig.json`
- `cli/tsconfig.canary.ts`: probes only.

## Checks

- [ ] `vpr check` type-checks `cli/` under its own config.
- [ ] Each canary probe errors. Adding the DOM lib, `$app/types`, or `vite/client` to `cli/tsconfig.json` fails `vpr check`.
- [ ] A sample `cli/` entry importing a `#cli/*` and a `#lib/*` module runs with plain `node` and passes `vpr check`.
- [ ] The sample fails `vpr check` when it imports `$app/env` or `@sveltejs/kit`, or reads `import.meta.env`, directly or through a `src/` file.
- [ ] A `#cli/*` import under `src/` fails lint.
- [ ] A sample script fails with a non-zero exit on an unknown option and on an extra positional, printing its message without a stack.
- [ ] With stderr piped, a sample script's long failure message arrives in full.
- [ ] A sample `cli/` test runs in the `cli` Vitest project.
