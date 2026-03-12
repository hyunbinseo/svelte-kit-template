# svelte-kit-template

## Development Setup

1. Initialize or remove Sentry SDK by reviewing these files:

```
hooks.client.ts
hooks.server.ts
```

2. See `.env.[mode].local.example` and create a `.env.development.local` file.
3. Install dependencies and run these scripts:

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
