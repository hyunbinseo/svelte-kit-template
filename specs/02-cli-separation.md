# 02 CLI Separation

Node-only scripts (migrations, backups, production start) live in `cli/`, type-checked separately, and never pull in SvelteKit or Vite-only APIs.

## Ideas

- Enforce the boundary structurally (tsconfig project references, scoped lint rules, resolver conditions) rather than by scanning output.
- Node.js runs `.ts` directly (type stripping) — no build step for scripts.
- Make it obvious from the path which `src/` code `cli/` may import (e.g. Node subpath imports like `#cli/*`, which are also easy to lint).

## Checklist

- [x] `cli/` has its own tsconfig: no `DOM` lib, Node types only, no SvelteKit types.
- [x] `vpr check` fails if `cli/` imports (directly or transitively) `$app/*`, `@sveltejs/kit`, or uses `import.meta.env`/`import.meta.glob`.
- [x] Every `cli/` entry runs with plain `node` (verified by hand, see Decisions).
- [x] A deliberately bad import is caught (try it, then revert).

## Decisions

- `#cli/*` maps to `cli/*`, like `src/` uses `#lib/*`. Imports use subpath imports (`#…`) wherever one applies, even within the same folder, matching the editor's `non-relative` auto-import (`.vscode/settings.json`). Lint blocks `../` and `./sub/`. `cli/` imports `src/` through `#lib/*` and `#db/*`. A dedicated, CLI-safe `src/` folder with its own alias (e.g. `#shared/*`) was rejected: the type check below already guarantees safety, so the extra alias isn't worth it.
- `cli/tsconfig.json` extends the root config and overrides `rootDirs` (empty, so `./$types` doesn't resolve), `lib` (`ESNext`, no DOM; it types some APIs Node.js 24 lacks, e.g. `Temporal`, accepted for simplicity), `types` (`node` only, so no `$app/types`), and `paths` (empty, so `kit.alias` entries, which plain `node` can't resolve, aren't inherited). It adds `erasableSyntaxOnly` for type stripping. `vpr check` runs `tsc -p cli` after `svelte-check`.
- How violations fail: `$app/*` doesn't resolve without SvelteKit types. `import.meta.env`/`glob` fail without Vite client types. Both hold transitively, since every imported `src/` file is checked under this config.
- `@sveltejs/kit` is caught because its types declare `$app/*`: any import of it (direct, side-effect, or inside a library's `.d.ts`, e.g. `@sveltejs/adapter-node`) makes the `$app/*` line in `cli/canary.ts` stop erroring (`TS2578`). This relies on kit's type layout. Importing the `vite` package is allowed: it runs under Node, and only its client types (`import.meta.env`/`glob`) are Vite-only. Rejected: `paths` mapping kit/vite to a non-module stub (misses side-effect imports and library `.d.ts` files), and grepping `tsc --explainFiles` or `--listFilesOnly` for package imports (only adds coverage for `vite` itself, and shell pipes aren't portable to Windows).
- `cli/canary.ts` is a permanent negative test (`@ts-expect-error` on `$app/env`, `import.meta.env`, DOM, enum), so a weakened config fails `vpr check`. One probe each is enough: `$app/env/private`/`public` are declared by the generated `$app/types`, which imports kit and so also declares `$app/env`, and `vite/client` declares `import.meta.env` and `glob` together. It also catches `/// <reference types="vite/client" />`, which makes the `import.meta.env` line stop erroring (`TS2578`).
- `src/` → `cli/` is not enforced, and was dropped from the checklist. An ESLint `no-restricted-imports` regex (`#cli/*` or `../cli/`) was tried and removed: it matches the import text, not the resolved file, so it misses dynamic imports and unusual paths. TypeScript can't block relative imports, and `rootDir` doesn't fit, since the root project spans `src/` and root configs. `cli/` importing `src/` via `#lib/*` rather than `../src/` is a convention for `AGENTS.md` ([13](./13-agent-docs.md)): both resolve to the same file, and the type check covers it either way.
- Rejected: project references (they need `composite`, and tsserver would still check `src/` files under the root project), and scanning built output.
- Verified by hand, then reverted: a sample entry importing `#cli/*` and `#lib/*` ran with `node` and passed `vpr check`. Adding `$app/env` to the entry, or re-exporting `#db/server/app/client.ts` (which imports `$app/env/private`), failed `vpr check`.
