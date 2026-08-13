# svelte-kit-template

## Setup

> [!NOTE]
> [pnpm] is the recommended package manager and the [standalone script] is the advised way to install it

[pnpm]: https://github.com/pnpm/pnpm
[standalone script]: https://pnpm.io/installation#using-a-standalone-script

### Development

1. Create a `.env.development.local` file (see `.env.[mode].local.example`)
2. Run these `package.json` scripts (`node --run`, `npm run`, etc. also works)

```shell
pnpm db:app:generate
pnpm drizzle-kit generate --custom --name=triggers
# Paste `drizzle/app/triggers.temp.sql` into the generated `migration.sql`

# Purge `drizzle/app` to reset the schema
# Commit the migrations once ready to deploy

pnpm db:app:migrate:dev
pnpm dev
```

### Production

- See the [guide](./docs/setup.md) for VPS deployment with HTTPS
- For other platforms, update the setup accordingly:

```diff
- @sveltejs/adapter-node
- pm2-ecosystem
```
