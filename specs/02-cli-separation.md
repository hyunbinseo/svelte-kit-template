# 02 CLI Separation

**Goal**: Node-only scripts live in `cli/`, run with plain `node`, and a type check fails if they reach SvelteKit or Vite-only APIs.

## Rules

### Layout

1. Scripts run with plain `node` through type stripping, with no build step.
2. `cli/canary.ts` sits at the top of `cli/`, next to the `tsconfig.json` it checks.
3. Every subpath into `cli/` starts with `#cli/` (not e.g. `#scripts/*`), so rule 11's ban matches them all. `cli/` reaches `src/` through `src/`'s own subpaths (e.g. `#lib/*`), not a CLI-only alias, since rule 6 already proves an imported `src/` file is CLI-safe.

### Type Check

4. `cli/` has its own `tsconfig.json`, extending the root one: ESNext lib without DOM, Node types only, no SvelteKit types, no `kit.alias` paths (plain `node` can't resolve them), no `./$types` resolution, and erasable syntax only.
5. `vpr check` type-checks `cli/` with that config, after `svelte-check`.
6. Every `src/` file `cli/` imports is checked under `cli/`'s config, so the boundary holds transitively: `$app/*` doesn't resolve, and `import.meta.env`/`import.meta.glob` are untyped.
7. `@sveltejs/kit` is caught because its types declare `$app/*`: any import of it (direct, side-effect, or inside a library's `.d.ts`) makes the canary's `$app/*` probe stop erroring. This relies on kit's type layout; accepted.
8. Importing `vite-plus` is allowed (e.g. `loadEnv`, [03](./03-environment.md)), since it runs under Node; only Vite's client types are Vite-only.
9. `cli/canary.ts` is a permanent negative test: one `@ts-expect-error` probe each for non-erasable syntax, `$app/*`, `import.meta.env`, and the DOM. A weakened config, or a stray `/// <reference types="vite/client" />`, fails `vpr check`.
10. No TypeScript project references: they need `composite`, and tsserver would still check `src/` files under the root project.

### Direction

11. `src/` never imports `cli/`: lint bans `#cli/*` under `src/`. With relative imports banned ([01](./01-conventions.md) rule 1), only dynamic imports get past it; accepted.

### Tests

12. `cli/` tests run in their own Vitest project, without the SvelteKit plugin.

### Runtime

13. Scripts parse arguments with `node:util`'s `parseArgs`, `strict` on, so an unknown option fails. They check their positional count themselves. Values are validated before use (e.g. a SHA's format).
14. A failed script exits non-zero. An expected failure prints its message to stderr without a stack and sets `process.exitCode`; anything else throws. No script calls `process.exit`, which can exit before piped output flushes, cutting off the error.

## Files

- `cli/tsconfig.json`
- `cli/canary.ts`: probes only.

## Checks

- [ ] `vpr check` type-checks `cli/` under its own config.
- [ ] Each canary probe errors. Adding the DOM lib, `$app/types`, or `vite/client` to `cli/tsconfig.json` fails `vpr check`.
- [ ] A sample `cli/` entry importing a `#cli/*` and a `#lib/*` module runs with plain `node` and passes `vpr check`.
- [ ] The sample fails `vpr check` when it imports `$app/env` or `@sveltejs/kit`, or reads `import.meta.env`, directly or through a `src/` file.
- [ ] A `#cli/*` import under `src/` fails lint.
- [ ] A sample script fails with a non-zero exit on an unknown option and on an extra positional, printing its message without a stack.
- [ ] With stderr piped, a sample script's long failure message arrives in full.
- [ ] A sample `cli/` test runs in the `cli` Vitest project.
