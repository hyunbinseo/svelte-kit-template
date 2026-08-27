# svelte-kit-template

> [!NOTE]
> [pnpm] is the recommended package manager, and the [standalone script] is the advised installation method.

[pnpm]: https://github.com/pnpm/pnpm
[standalone script]: https://pnpm.io/installation#using-a-standalone-script

## AI Agent Setup

- `AGENTS.md` documents general coding conventions.
- `CLAUDE.md` and `.mcp.json` add Claude Code support.
- Other coding agents require manual MCP server setup.

## Development Setup

1. Create a `.env.development.local` file (see `.env.[mode].local.example`).
2. Run these periodically to keep dependencies and `devEngines` versions current.

```shell
pnpm update
pnpm approve-builds # once, select none

pnpm runtime set node lts
pnpm shim add node # once
pnpm self-update
```

3. Run these `package.json` scripts (`node --run`, `npm run`, etc. also works).

```shell
pnpm db:app:generate
pnpm drizzle-kit generate --custom --name=triggers
# Flush `drizzle/app-triggers.staged.sql` into the generated `migration.sql`.

# Purge `drizzle/app` to reset the schema.
# Commit the migrations once ready to deploy.

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
