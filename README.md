# svelte-kit-template

## Development Setup

> [!NOTE]
> pnpm is the recommended package manager. (e.g. MCP configuration uses `pnpm dlx` instead of `npx`)

1. Create `.env.development.local` file (see `.env.[mode].local.example`)
2. Install dependencies and run these scripts:

```shell
node --run db:generate
node --run db:migrate
node --run dev
```

## Production Setup

- See the [guide](./docs/setup.md) for VPS deployment with HTTPS.
- For other platforms, update the setup accordingly:

```diff
- @sveltejs/adapter-node
- pm2-ecosystem
```
