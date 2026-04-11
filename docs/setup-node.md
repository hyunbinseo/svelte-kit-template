# Setup Node.js

> [!CAUTION]
> This is a reference material, not a complete guide.

```shell
ssh nodejs@<tailscale-device-name>
```

```shell
cd ~/<name>
```

## Environment Variables

Create an `.env.local` file and define **all** secrets and environment variables:

```shell
JWT_SECRET_NEW="" # see .env.[mode].local.example
# JWT_SECRET_OLD=""


# SvelteKit Node.js build environment variables
# See https://svelte.dev/docs/kit/adapter-node

HOST="0.0.0.0"
PORT="3000"

ORIGIN="https://example.com" # set to actual domain
ADDRESS_HEADER="X-Forwarded-For"
XFF_DEPTH="1"
```

## PM2

Create a `./build/start.js` file.

```js
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

loadEnvFile(resolve(import.meta.dirname, '../.env.local'));
loadEnvFile(resolve(import.meta.dirname, '../.env'));

await import('./<build-directory>/index.js');
```

Create a `pm2.config.cjs` file and define applications:

```js
// See https://pm2.keymetrics.io/docs/usage/application-declaration

module.exports = {
  /** @type {import('pm2-ecosystem').StartOptions[]} */
  apps: [
    {
      name: '<name>',
      script: './build/start.js',
      interpreter: 'node',
      instances: -1,
      exec_mode: 'cluster',
      time: true,
      autorestart: true,
    },
    {
      name: '<name>:cron',
      script: './cli/scheduled.ts',
      interpreter: 'node',
      time: true,
      autorestart: false,
      cron: '0 0 * * *',
    },
  ],
};
```

## Startup

```shell
pnpm i --prod
pnpm db:migrate
pm2 start pm2.config.cjs
pm2 save
```

[Continue Setup](./setup-caddy.md)

## Miscellaneous

### Backup Database

```ts
// cli/scheduled.ts
import { exit } from 'node:process';
import { backup } from 'node:sqlite';
import { db } from './database.ts';

await backup(db.$client, `backup-${Date.now()}.db`); // update path
exit();
```

### Switch Builds

Update the import path in `./build/start.js` then run `pm2 restart <name>`.

### Update Environment Variables

| Type       | Action                    |
| ---------- | ------------------------- |
| Runtime    | Restart pm2 applications  |
| Build time | Rebuild and switch builds |

| Type    | Runtime                | Build time            |
| ------- | ---------------------- | --------------------- |
| Private | `$env/dynamic/private` | `$env/static/private` |
| Public  | `$env/dynamic/public`  | `$env/static/public`  |
| Misc.   | `process.env`          |                       |

### Update Node.js

```shell
pm2 info <name>
# node.js version │ 24.12.0
```

```shell
fnm install 24  # Installing Node v24.13.1 (x64)
fnm use 24      # Using Node v24.13.1
pm2 update
```

```shell
pm2 info <name>
# node.js version │ 24.13.1
```
