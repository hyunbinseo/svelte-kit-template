# Setup Node.js

> [!CAUTION]
> This is a reference material, not a complete guide.

```shell
ssh nodejs@<tailscale-device-name>
```

```shell
cd ~/<name>
```

## PM2

On your dev machine:

- Create a `pm2.config.cjs` file and define applications (see `pm2.config.example.cjs`).
- Review environment variables in `.env.production`.
- Commit and push both files.

On the server, create an `.env.production.local` file (see `.env.[mode].local.example`).

> [!NOTE]
> For zero-downtime [`pm2 reload`](https://pm2.keymetrics.io/docs/usage/cluster-mode/#reload), the cluster instance count must resolve to 2 or above.

## Startup

> [!WARNING]
> Always sync to the latest commit first — this discards any local changes on the server.

```shell
git fetch origin main
git reset --hard origin/main

pnpm i
pnpm db:app:migrate:prod
pnpm db:audit:migrate

pnpm build
micro .env.production.local # set/update BUILD_ID
```

For the initial deployment, start and save the process list:

```shell
pm2 start pm2.config.cjs
pm2 save
```

For subsequent builds, reload the app:

```shell
pm2 reload <name>
```

If `pm2.config.cjs` changed, use `startOrReload`:

```shell
pm2 startOrReload pm2.config.cjs # all apps
pm2 startOrReload pm2.config.cjs --only <name>
```

[Continue Setup](./setup-caddy.md)

## Miscellaneous

### Update Environment Variables

Check `src/env.ts` to see if the variables are static.

- Dynamic: reload pm2 applications
- Static: rebuild and switch

### Update PM2

> [!WARNING]
> Running `pm2 update` stops all processes and will result in brief downtime.

```shell
pnpm i -g pm2@latest
pm2 update
```

`pm2-ecosystem`'s version is pinned to match the installed `pm2` version, so it doubles as a version log.

```shell
pnpm i -D pm2-ecosystem@latest # verify version matches `pm2 --version`, then commit
```

### Update Node.js

```shell
pm2 info <name> # node.js version │ <old-version>

pnpm runtime set node lts # updates package.json `devEngines.runtime`
# devDependencies:
# - node <old-version>
# + node <new-version>

pm2 update
pm2 info <name> # node.js version │ <new-version>
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
