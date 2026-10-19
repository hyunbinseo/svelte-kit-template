# 00 Bootstrap

Move the `sv` scaffold onto Vite+ and Oxfmt, keeping ESLint as the linter. Then align editor and agent config with the new toolchain.

## Ideas

- Try `vp migrate`.
- Keep ESLint rules few: prefer what Oxfmt (import/attribute sorting) and TypeScript already enforce.
- Drop scaffold leftovers (`prettier`, `.prettierignore`, sample `task` schema) rather than adapt them.
- Defer plugin imports in `vite.config.ts` if it speeds up `vp fmt`/`vp test` startup.

## Checklist

Toolchain, first:

- [x] Vite+ replaces Vite; scripts run via `vpr`.
- [x] Oxfmt replaces Prettier (tabs, single quotes, trailing commas, width 100, sorted imports, `package.json`, and Tailwind classes); Prettier and its plugins are removed.
- [x] ESLint stays the linter (`vpr lint`); `vp lint` (Oxlint) is not used.
- [x] Pre-commit hook lints and formats staged files.
- [x] `devEngines` pins Node.js and pnpm, failing on mismatch.
- [x] Dev, preview, and E2E use fixed, distinct ports.
- [x] Runes forced outside `node_modules`; async Svelte and remote functions enabled; server tracing on.
- [x] `vpr check`, `vpr lint`, `vp fmt --check` pass on the tree.

Then, editor and agent config:

- [x] VS Code recommends `VoidZero.vite-plus-extension-pack` instead of `esbenp.prettier-vscode`, formats with Oxfmt, fixes with ESLint on save, and keeps Oxlint off.
- [x] Zed config added with the same behavior.
- [x] `.mcp.json` runs stdio servers with `vpx` instead of `npx -y`.
- [x] `.mcp.json` adds HTTP servers: Sentry (`https://mcp.sentry.dev/mcp`) and Valibot (`https://valibot.dev/mcp`).

## Decisions

- Started from `vp migrate`, then reverted its ESLint → Oxlint conversion: restored `eslint.config.js` with only the `@eslint/js`, `typescript-eslint`, and `eslint-plugin-svelte` recommended configs. Dropped `eslint-config-prettier` (recommended configs have no stylistic rules) and `globals` (`no-undef` is off; TypeScript catches undefined names).
- Oxfmt config lives in the `fmt` block of `vite.config.ts`. Trailing commas use the Oxfmt default (`all`). `sortImports` treats `#`, `$app/`, and `$lib/` as internal, with no blank lines between groups. `.prettierignore` removed; Oxfmt already respects `.gitignore`, and `fmt.ignorePatterns` adds `/drizzle/` so generated migrations stay as drizzle-kit writes them.
- `vpr lint` runs `vp fmt --check` then `eslint .`. `vp check` isn't used, since it runs Oxlint.
- Pre-commit runs `vp staged` instead of the default `vp check --fix`, which would run Oxlint: `eslint --fix` then `vp fmt` on JS/TS/Svelte, `vp fmt` on the rest. The globs don't overlap, because lint-staged runs globs concurrently. `prepare` runs `(vp config --no-agent || echo '') && (svelte-kit sync || echo '')` (each tolerates a missing binary, e.g. `pnpm install --prod`; parentheses work in both `sh` and `cmd`) to install hooks without touching agent docs ([13](./13-agent-docs.md) owns those).
- Ports: dev 5526, preview 4526, E2E 6526 (as in v0.1), not the Vite defaults, so projects scaffolded elsewhere don't take them. Distinct, so E2E never reuses a dev or preview server. No `strictPort`, so a second git worktree falls back to the next free port instead of failing. E2E runs the `build` and `preview` scripts via `vpr` (not the `vp` built-ins), so it follows [04](./04-build-output.md).
- Plugins load lazily (dynamic imports inside `lazyPlugins`), so `vp fmt`/`vp staged` skip them. `?? []` works around `lazyPlugins` returning `undefined` under `exactOptionalPropertyTypes`.
- `tracing.server` needs `@opentelemetry/api` at runtime (otherwise the server crashes), so it was added (approved). Like the other packages, it's a devDependency, so adapter-node bundles it.
- `devEngines` `onFail: "error"` instead of `"download"`.
- `vpr test` runs `vp test` (unit tests only, like `build` runs `vp build`); E2E stays in `test:e2e`.
- Sample `task` table removed; `schema.ts` is empty until [05](./05-database.md).
- Editors: VS Code turns Oxlint off via `oxc.enable.oxlint: false`, and sets `source.organizeImports: never` so a user-level setting can't fight Oxfmt's import sorting. Zed removes the `oxlint` language server and runs `source.fixAll.eslint` before Oxfmt. Oxfmt finds `vite.config.ts` on its own in VS Code (`oxc.fmt.disableNestedConfig`, as in the Vite+ template); Zed sets `fmt.configPath`, as in the Vite+ template. Formatters are set per language in both, because a language-specific user setting overrides a top-level project setting.
- Config keys are sorted a-z wherever order has no meaning (`vite.config.ts`, editor configs, `pnpm-workspace.yaml`, `.mcp.json` servers). Oxfmt enforces this only for `package.json` (`sortScripts` on); keep the rest sorted by hand. Order-sensitive lists (ESLint configs, plugin arrays, staged commands) and `tsconfig.json` sections are left as is.
- JS stays allowed and type-checked (`allowJs`/`checkJs` from the generated tsconfig). The tsconfig `include` globs root `*.js`/`*.ts`, so new root configs are type-checked without listing them. `eslint.config.js` stays JS: a TS config would need `jiti` or ESLint's unstable `unstable_native_nodejs_ts_config` flag.
- `.cjs`/`.cts`/`.mjs`/`.mts` are rejected by ESLint (`no-restricted-syntax` on `Program`), since `"type": "module"` makes `.js`/`.ts` enough. The staged globs include them, so the pre-commit hook blocks them too.
