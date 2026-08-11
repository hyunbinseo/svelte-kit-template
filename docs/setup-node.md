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

Create an `.env.production.local` file and define **all** secrets and environment variables:

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

// NOTE Files containing dynamic variables should be loaded
loadEnvFile(resolve(import.meta.dirname, '../.env.production.local'));

await import('./<build-directory>/index.js');
```

Create a `pm2.config.cjs` file and define applications:

> [!NOTE]
> For zero-downtime [`pm2 reload`](https://pm2.keymetrics.io/docs/usage/cluster-mode/#reload), the cluster instance count must resolve to 2 or above.

```js
// See https://pm2.keymetrics.io/docs/usage/application-declaration

module.exports = {
	/** @type {import('pm2-ecosystem').StartOptions[]} */
	apps: [
		{
			name: '<name>', // e.g. server, example.com
			script: './build/start.js',
			interpreter: 'node',
			instances: -1,
			exec_mode: 'cluster',
			time: true,
			autorestart: true,
		},
		{
			name: '<name>:backup',
			script: './cli/scripts/backup.ts',
			interpreter: 'node',
			interpreter_args: '--env-file=.env.production --import ./cli/scripts/sentry.ts',
			time: true,
			autorestart: false,
			cron: '0 0 * * *',
		},
	],
};
```

## Startup

For initial deployment:

```shell
pnpm db:app:migrate:prod
pnpm db:audit:migrate
pnpm build                # logs output directory
micro build/start.js      # update the import path
pm2 start pm2.config.cjs
pm2 save
```

To switch builds, simply reload the pm2 processes:

```shell
git pull origin main
pnpm i
pnpm build
```

```shell
# Migrate db if needed
micro build/start.js
pm2 reload <name>
```

[Continue Setup](./setup-caddy.md)

## Miscellaneous

### Backup Database

```ts
// cli/scripts/backup.ts
import { db } from '#cli/lib/database.ts';
import { exit } from 'node:process';
import { backup } from 'node:sqlite';

await backup(db.$client, `backup-${Date.now()}.db`); // update path
exit();
```

### Update Environment Variables

Check `src/env.ts` to see if the variables are static.

- Dynamic: reload pm2 applications
- Static: rebuild and switch

### Update Node.js

Running `pm2 update` stops all processes and will result in brief downtime.

```shell
pm2 info <name>
# node.js version │ 26.0.0
```

```shell
fnm install 26  # Installing Node v26.1.0 (x64)
fnm use 26      # Using Node v26.1.0

npm install -g corepack

pm2 save
pm2 update
```

```shell
pm2 info <name>
# node.js version │ 26.1.0
```

### System Resource Usage

View historical CPU, memory, and I/O usage collected by `sysstat`:

```shell
sar -h -u  # CPU
sar -h -r  # memory
sar -h -b  # I/O
```

### OOM (Out Of Memory)

The build can fail on servers with small RAM, especially if there are circular dependencies.

> FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory

If you encounter this error, set the [`--max-old-space-size`](https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes) flag:

```jsonc
// package.json
{
	"scripts": {
		"build": "node --max-old-space-size=2048 cli/scripts/build.ts",
	},
}
```

This will likely cause swapping on servers with less than 2 GiB of memory.

> On a machine with 2 GiB of memory, consider setting this to 1536 (1.5 GiB) to leave some memory for other uses and avoid swapping.
