# 02 CLI Separation

Node-only scripts (migrations, backups, production start) live in `cli/`, type-checked separately, and never pull in SvelteKit or Vite-only APIs.

## Ideas

- Enforce the boundary structurally (tsconfig project references, scoped lint rules, resolver conditions) rather than by scanning output.
- Node.js runs `.ts` directly (type stripping) — no build step for scripts.
- Make it obvious from the path which `src/` code `cli/` may import (e.g. Node subpath imports like `#cli/*`, which are also easy to lint).

## Checklist

- [ ] `cli/` has its own tsconfig: no `DOM` lib, Node types only, no SvelteKit types.
- [ ] `vpr check` fails if `cli/` imports (directly or transitively) `$app/*`, `@sveltejs/kit`, or uses `import.meta.env`/`import.meta.glob`.
- [ ] `src/` cannot import `cli/`.
- [ ] Every `cli/` entry runs with plain `node`.
- [ ] A deliberately bad import is caught (try it, then revert).
