# 00 Bootstrap

Move the `sv` scaffold onto Vite+ and Oxfmt, keeping ESLint as the linter. Then align editor and agent config with the new toolchain.

## Ideas

- Try `vp migrate`.
- Keep ESLint rules few: prefer what Oxfmt (import/attribute sorting) and TypeScript already enforce.
- Drop scaffold leftovers (`prettier`, `.prettierignore`, sample `task` schema) rather than adapt them.
- Defer plugin imports in `vite.config.ts` if it speeds up `vp fmt`/`vp test` startup.

## Checklist

Toolchain, first:

- [ ] Vite+ replaces Vite; scripts run via `vpr`.
- [ ] Oxfmt replaces Prettier (tabs, single quotes, trailing commas, width 100, sorted imports, `package.json`, and Tailwind classes); Prettier and its plugins are removed.
- [ ] ESLint stays the linter (`vpr lint`); `vp lint` (Oxlint) is not used.
- [ ] Pre-commit hook lints and formats staged files.
- [ ] `devEngines` pins Node.js and pnpm, failing on mismatch.
- [ ] Dev, preview, and E2E use fixed, distinct ports.
- [ ] Runes forced outside `node_modules`; async Svelte and remote functions enabled; server tracing on.
- [ ] `vpr check`, `vpr lint`, `vp fmt --check` pass on the tree.

Then, editor and agent config:

- [ ] VS Code recommends `VoidZero.vite-plus-extension-pack` instead of `esbenp.prettier-vscode`, formats with Oxfmt, fixes with ESLint on save, and keeps Oxlint off.
- [ ] Zed config added with the same behavior.
- [ ] `.mcp.json` runs stdio servers with `vpx` instead of `npx -y`.
- [ ] `.mcp.json` adds HTTP servers: Sentry (`https://mcp.sentry.dev/mcp`) and Valibot (`https://valibot.dev/mcp`).
