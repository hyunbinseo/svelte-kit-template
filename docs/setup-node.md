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

On the server, create `.env.production.local` based on `.env.[mode].local.example`.

## Startup

> [!WARNING]
> Always sync to the latest commit first — this discards any local changes on the server.

> [!IMPORTANT]
> Install all dependencies, including `devDependencies` — they are required on the server.

```shell
git fetch origin main
git reset --hard origin/main

vp install --frozen-lockfile
vpr db:app:migrate:prod
vpr db:audit:migrate:prod

vpr build
nano .env.production.local # set/update BUILD_ID
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

If `pm2.config.cjs` changed, reload and save:

```shell
pm2 startOrReload pm2.config.cjs # all apps
pm2 startOrReload pm2.config.cjs --only <name>

pm2 scale <name> <count> # if instances changed

pm2 save
```

[Continue Setup](./setup-caddy.md)

## Miscellaneous

### Update Environment Variables

Check `src/env.ts` to see if the variables are static.

- Dynamic: reload pm2 applications
- Static: rebuild and switch

### Update Node.js and PM2

The `update-runtime` shell function installs the latest PM2 on the latest Node.js LTS, updates the PM2 daemon, and reloads the apps.

> [!WARNING]
> `update-runtime` stops all processes and will result in brief downtime.

> [!CAUTION]
> Don't run `vp update -g` or `vp install -g pm2` directly — they delete the PM2 install the daemon runs from, so app restarts fail. See [voidzero-dev/vite-plus#2878](https://github.com/voidzero-dev/vite-plus/issues/2878).

> [!CAUTION]
> The LTS can move to a new major (e.g. 24 → 26) — bump and test projects' `devEngines.runtime` first.

```shell
pm2 info <name> # node.js version │ <old-version>

update-runtime

pm2 info <name> # node.js version │ <new-version>
```

`pm2-ecosystem`'s version is pinned to match the installed `pm2` version, so it doubles as a version log. Bump it after updating PM2:

```shell
pm2 --version
vp update --latest pm2-ecosystem
# verify version matches, then commit
```

### System Resource Usage

View historical CPU, memory, and I/O usage collected by `sysstat`:

```shell
sar -h -u # CPU
sar -h -r # memory
sar -h -b # I/O
```
