## Setup

- Create `.env.local` using `.env.local.example`
- Install dependencies and run these scripts:

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
