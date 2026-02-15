## Setup

1. See `.env.[mode].local.example` and create `.env.development.local` file.
2. Install dependencies and run these scripts:

```shell
node --run db:generate
node --run db:migrate
node --run dev
```

## Caveats

This template is for Node.js servers. For other platforms, update setup accordingly.

```diff
- @sveltejs/adapter-node
- @types/better-sqlite3
- better-sqlite3
```
