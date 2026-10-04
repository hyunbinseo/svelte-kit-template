# svelte-kit-template

An opinionated SvelteKit template for agent-assisted development — best practices are documented and demonstrated in working code.

## Features

- `AGENTS.md` — plus `CLAUDE.md` and `.mcp.json` for Claude Code
- Custom auth — JWT revocation, ban tracking, onboarding flows
- Unit, E2E tests — database trigger cascades, auth cookie rotation

## Stack

- Svelte 5 — runes, `createContext`, `await` in markup
- SvelteKit — remote functions (`query`, `form`, `prerender`)
- Drizzle ORM — Relational Queries v2, trigger-based cascades
- Vite+ — version manager (Node.js, pnpm), Oxfmt, Vitest
- Tailwind CSS, Sentry, ESLint, Playwright (E2E), and more

## Development Setup

> [!IMPORTANT]
> This project uses `vp` commands — install [Vite+](https://viteplus.dev/) globally.

> [!NOTE]
> This project assumes pnpm. Run scripts with `pnpm <script>`, not `vp` built-ins that may differ (e.g. `vp lint`).

Update the toolchain and dependencies. Rerun these periodically.

> [!WARNING]
> The server runs every app on PM2's Node.js, which may differ in major version from the one pinned. Rerun `vp env pin node@lts` and test before running `update-runtime` — see [Update Node.js and PM2](./docs/setup-node.md#update-nodejs-and-pm2).

```shell
vp upgrade # update global

vp env pin node@lts
vp env pin pnpm@latest

vp migrate # update local
pnpm update
```

Create `.env.development.local` based on `.env.[mode].local.example`.

Generate and apply the database migrations.

```shell
pnpm db:app:generate
pnpm drizzle-kit generate --custom --name=triggers
# Flush `drizzle/app-triggers.staged.sql` into the generated `migration.sql`.

# Purge `drizzle/app` to reset the schema.
# Commit the migrations once you're ready to deploy.

pnpm db:app:migrate:dev
pnpm dev
```

## Production Setup

- [VPS guide](./docs/setup.md) — deployment with HTTPS
- [Sentry guide](./docs/setup-sentry.md) — error monitoring, tracing, and alerts

## Migration

Each release has a Git tag, so you can diff any two tags to see what changed and port it into your project.

You can also paste the following section into a coding agent to run the upgrade for you.

> [!TIP]
> To upgrade a project based on this template, find the current version in `package.json`, then diff it against the target version.
>
> ```shell
> # Clone the template outside the project.
> git clone https://github.com/hyunbinseo/svelte-kit-template /tmp/svelte-kit-template
>
> # List the available versions.
> git -C /tmp/svelte-kit-template tag --sort=v:refname
>
> # Diff the current version against the target.
> # Tags are prefixed with `v` (e.g. `v0.0.1`).
> git -C /tmp/svelte-kit-template diff <old-tag> <new-tag>
> ```
>
> Read `AGENTS.md` from the cloned upstream repo first — it documents the new conventions to follow. Update the local `AGENTS.md` to match, and apply the relevant changes. Ask before skipping a diverged file, or before leaving existing code on an old convention — note any such exception in `AGENTS.md`.
>
> Commit the result as `chore: sync with svelte-kit-template@<new-version>`
