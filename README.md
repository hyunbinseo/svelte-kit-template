# svelte-kit-template

An opinionated SvelteKit template for agent-assisted development.

## Features

- Best practices documented in `AGENTS.md` and demonstrated in the code
- Claude Code support — `CLAUDE.md`, `.mcp.json`, format-on-edit hook
- Custom auth — JWT revocation, ban tracking, onboarding flows
- Unit, E2E tests — database trigger cascades, auth cookie rotation

## Stack

- Svelte 5 — runes, `createContext`, `await` in markup
- SvelteKit — remote functions (`query`, `form`, `prerender`)
- Drizzle ORM — Relational Queries v2, trigger-based cascades
- Tailwind CSS, Sentry, oxfmt, and more

## Development Setup

> [!NOTE]
> [pnpm] is the recommended package manager, and the [standalone script] is the advised installation method.

[pnpm]: https://github.com/pnpm/pnpm
[standalone script]: https://pnpm.io/installation#using-a-standalone-script

1. Create a `.env.development.local` file (see `.env.[mode].local.example`).
2. Run these periodically to keep dependencies and `devEngines` versions up to date.

```shell
pnpm update
pnpm approve-builds # once, select none

pnpm runtime set node lts
pnpm shim add node # once
pnpm self-update
```

3. Run these `package.json` scripts (`node --run`, `npm run`, etc. also work).

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

- See the [guide](./docs/setup.md) for VPS deployment with HTTPS.
- For other platforms, update the setup accordingly:

```diff
- @sveltejs/adapter-node
- pm2-ecosystem
```

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
