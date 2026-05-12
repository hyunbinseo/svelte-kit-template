# svelte-kit-template

## Development Setup

> [!NOTE]
> pnpm is the recommended package manager. (e.g. MCP configuration uses `pnpm dlx` instead of `npx`)

Configure environment variables:

```plaintext
.env
.env.[mode].local.example
```

Install dependencies and run these scripts:

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
