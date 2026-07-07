# svelte-kit-template

## Development Setup

> [!NOTE]
> [pnpm] is the recommended package manager and [corepack] is the advised way to install it

[pnpm]: https://github.com/pnpm/pnpm
[corepack]: https://github.com/nodejs/corepack

```shell
npm install -g corepack
corepack use pnpm@latest
pnpm update # installs as well
```

1. Create `.env.development.local` file (see `.env.[mode].local.example`)
2. Install dependencies and run these scripts:

```shell
node --run db:generate
node --run db:migrate
node --run dev
```

## Production Setup

- See the [guide](./docs/setup.md) for VPS deployment with HTTPS
- For other platforms, update the setup accordingly:

```diff
- @sveltejs/adapter-node
- pm2-ecosystem
```
