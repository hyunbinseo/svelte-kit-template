# 02 CLI Separation

**Goal**: Node-only scripts live in `cli/`, run with plain `node`, and a type check fails if they reach SvelteKit or Vite-only APIs.

## Rules

### Layout

1. Scripts run with plain `node` through type stripping. No build step.
2. `cli/` is grouped by feature (e.g. `cli/db/`, `cli/release/`). Modules shared by scripts go in `cli/lib/`. `cli/canary.ts` sits at the top, next to the `tsconfig.json` it checks.
3. Every subpath into `cli/` starts with `#cli/` (e.g. `#cli/*`, not `#scripts/*`), so rule 11's ban matches them all. `cli/` reaches `src/` through `src/`'s own subpaths (e.g. `#lib/*`), not a CLI-only alias (e.g. `#shared/*`). Why: rule 6 already proves an imported `src/` file is CLI-safe.

### Type Check

4. `cli/` has its own `tsconfig.json`, extending the root one: ESNext lib without DOM, Node types only, no SvelteKit types, no `kit.alias` paths (plain `node` can't resolve them), no `./$types` resolution, and erasable syntax only.
5. `vpr check` type-checks `cli/` with that config, after `svelte-check`.
6. Every `src/` file `cli/` imports is checked under `cli/`'s config, so the boundary holds transitively: `$app/*` doesn't resolve, and `import.meta.env`/`import.meta.glob` are untyped.
7. `@sveltejs/kit` is caught because its types declare `$app/*`: any import of it (direct, side-effect, or inside a library's `.d.ts`) makes the canary's `$app/*` probe stop erroring. This relies on kit's type layout; accepted.
8. Importing `vite-plus` ([01](./01-conventions.md) rule 7) is allowed, e.g. Vite's `loadEnv` ([03](./03-environment.md)). It runs under Node; only Vite's client types are Vite-only.
9. `cli/canary.ts` is a permanent negative test: one `@ts-expect-error` probe each for non-erasable syntax, `$app/*`, `import.meta.env`, and the DOM. A weakened config, or a stray `/// <reference types="vite/client" />`, fails `vpr check`.
10. No TypeScript project references. Why: they need `composite`, and tsserver would still check `src/` files under the root project.

### Direction

11. `src/` never imports `cli/`: lint bans `#cli/*` under `src/`, so CLI-only code stays private. With relative imports banned ([01](./01-conventions.md) rule 2), only dynamic imports get past it; accepted.

### Tests

12. `cli/` tests run in their own Vitest project, without the SvelteKit plugin.

## Files

- `cli/tsconfig.json`
- `cli/canary.ts`: probes only.

## Checks

- [ ] `vpr check` type-checks `cli/` under its own config.
- [ ] Each canary probe errors. Adding the DOM lib, `$app/types`, or `vite/client` to `cli/tsconfig.json` fails `vpr check` (try each, then revert).
- [ ] A sample `cli/` entry importing a `#cli/*` and a `#lib/*` module runs with plain `node` and passes `vpr check` (try it, then revert, subpaths included).
- [ ] The sample fails `vpr check` when it imports `$app/env` or `@sveltejs/kit`, or reads `import.meta.env`, directly or through a `src/` file (try each, then revert).
- [ ] A `#cli/*` import under `src/` fails lint.
- [ ] A sample `cli/` test runs in the `cli` Vitest project (try it, then revert).
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
