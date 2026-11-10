# 12 Operations

Run production on a single VPS: provisioning, HTTPS, services, deploys, and backups.

Target: a small VPS (any Linux distro with systemd), Tailscale SSH (no public SSH), Caddy on the host for HTTPS, and systemd template units for the app. Releases are built on the VPS and run the Node.js bundled in their build ([04](./04-build-output.md)). SQLite databases stay outside the releases.

## Ideas

- Automate as much of provisioning as possible (cloud-init).
- Layout, by the Filesystem Hierarchy Standard: releases, `current`, and `previous` in `/opt/app` ([04](./04-build-output.md)); databases in `/var/lib/app`; secrets in `/etc/app/secrets.env`; the git checkout in the deploy user's home, used only to build. Nothing the app or its data needs lives in the checkout.
- Users: `deploy` (Tailscale SSH login; owns the checkout and `/opt/app`; a sudoers rule allows only restarting `app@*` and starting the migration unit), `app` (system user, no login shell; runs Node.js, reads `/opt/app`), and `caddy` (reads `build/client/` of `current` and `previous`).
- One template unit (`app@.service`), instance name = port (`Environment=PORT=%i`, which wins over the env files). `ExecStart` and `WorkingDirectory` go through `current`, resolved when an instance starts, so a restarted instance runs the new release while the others keep the old one.
- A `/healthz` route, optionally running a trivial query, so an instance that can't reach its database counts as down.
- Vite+ on the VPS provides the build-time Node.js and pnpm from `devEngines`; running processes don't use it.
- Run migrations and backups as oneshot units with the release's `build/node`, as `app`, with the same `Environment=` and `EnvironmentFile=` lines; schedule backups with a systemd timer.
- A required secret is also validated by `vpr build`, which runs without it ([03](./03-environment.md)); its schema must allow that.
- Migrations run while the old build still serves traffic, so they must stay compatible with it (expand, then contract).
- Building on a small VPS may run out of memory (swap, or a heap limit for the build).
- Make backup pruning a pure, tested function with a thin script around it.
- Configurable retention.

## Checklist

- [ ] Each release is built on the VPS into `/opt/app/releases/[sha]/` by `deploy` ([04](./04-build-output.md)) and runs as `app`, which can't write to it. Releases contain no `data/` and no secrets.
- [ ] Services and CLI scripts run the release's `build/node`; nothing on the host needs a matching Node.js.
- [ ] The service starts the server with the env files loaded (see [03](./03-environment.md)). Secrets aren't `static`, so builds don't need them: they live in `/etc/app/secrets.env` (`root:root 0600`), loaded by the unit's `EnvironmentFile=` (systemd reads it as root, before switching to `app`). `.env.production.local` holds only non-secret overrides and is copied into each release at build. Verified: each instance listens on its configured `HOST` and `PORT`.
- [ ] At least 2 instances of `app@.service` run under systemd as `app`: started on boot, restarted on failure. The unit is hardened (`ProtectSystem=strict`, `NoNewPrivileges=`).
- [ ] Deploys have zero downtime: the deploy switches `current` (and `previous`), then restarts instances one at a time, waiting for each to pass its health check. adapter-node drains in-flight requests on `SIGTERM` (`SHUTDOWN_TIMEOUT` below systemd's `TimeoutStopSec`). Caddy retries failed connections on another instance (`lb_try_duration`) and routes only to healthy ones (`health_uri`). Verified with requests during a deploy.
- [ ] Caddy serves `/_app/immutable/*` from `current`, falling back to `previous`, so pages from the old build still load their chunks during and after a deploy.
- [ ] Rollback deploys a previous release without rebuilding.
- [ ] Databases live in `/var/lib/app`, created by the unit's `StateDirectory=app` (owned by `app`, mode `700`, writable under `ProtectSystem=strict`), and the unit sets `Environment=DATA_DIR=/var/lib/app`. Deploys, release pruning, and git never touch it.
- [ ] Migrations run from the new release before its instances replace the old ones.
- [ ] Client IPs reach the app correctly (Caddy, then `ADDRESS_HEADER`/`XFF_DEPTH`).
- [ ] Daily backup of app and audit DBs via `node:sqlite` `backup()`; both kept 90 days. Each audit backup holds the full retained log, so it needs no longer retention ([07](./07-audit-logging.md)). Erased data lingers in backups until they rotate out; the privacy policy says so.
- [ ] After a successful backup, the daily job purges: audit entries past their retention (개인정보취급자 2 years, others 3 months, [07](./07-audit-logging.md)); `login` rows (with their attempts, via the procedure closing uses, [06](./06-query-layer.md)) 5 days after they expire, and sessions 5 days after they expire or are revoked (지체 없이, which the 표준 개인정보 보호지침 reads as within 5 days); and banned users' contacts after the block period ([08](./08-auth.md)).
- [ ] Each destruction (closing and purge) is recorded (what, how many, when), and the 개인정보 보호책임자 can confirm the results ([표준 개인정보 보호지침](https://www.law.go.kr/행정규칙/표준개인정보보호지침) 제10조 ③ ④). The audit entries of the `DELETE` statements may serve, if they suffice.
- [ ] Backup failures reported to Sentry; non-zero exit.
- [ ] `docs/` covers: provisioning, firewall, HTTPS (Caddy), systemd units, building releases, deploy, rollback, and restoring a backup.
- [ ] A Korean privacy policy template. It covers 파기절차 및 파기방법 (제30조 ① 3의2) and lists what's kept after an account is closed as a table (item, purpose, legal basis, period): access records of staff (2 years, audit database, 안전성 확보조치 기준 제8조), users' login records (3 months, audit database, 통신비밀보호법), a banned user's contact (the block period, 제15조 ① 6호, [08](./08-auth.md)), the closed account record (ID, dates, reason codes, actor IDs, role history; personal information while audit entries or a ban's contact can link it to a person, then anonymous, [08](./08-auth.md)), backups (90 days), and, for projects that take payments, commerce and tax records (5 years, 전자상거래법, 국세기본법). Verify periods against current law.
- [ ] Provisioning validated on a fresh VM (ask before downloading a cloud image).

## Decisions

- systemd template units, not containers. Rejected: rootless Podman with Quadlet (images built on the VPS, user mapping for the `700` `DATA_DIR` bind mount, migrations and backups as one-off containers, a Node.js health check script, image pruning; for one app on one host, systemd hardening covers the isolation); pm2 (another supervisor on top of systemd, and cluster workers run the daemon's Node.js); Node.js single executable applications ([sveltejs/kit#15101](https://github.com/sveltejs/kit/issues/15101): the CLI still needs Node.js and `node_modules` on the host, and re-bundling the server hides libraries from instrumentation); Bun (no `node:sqlite`, which [05](./05-database.md) and [07](./07-audit-logging.md) depend on, and production would run on a different runtime from dev and tests).
- Several instances behind Caddy, not Node.js cluster mode: Caddy health-checks each instance, and every instance runs its own release's Node.js.
- Release layout and `current` symlink as in Capistrano. See https://capistranorb.com/documentation/getting-started/structure/
- Old chunks stay reachable after a deploy, like capistrano-rails keeping `public/assets` across releases. Rejected: one accumulating asset directory (needs its own pruning); `previous` covers tabs from one deploy back, and SvelteKit falls back to a full reload for older ones.
- Paths and users follow the Filesystem Hierarchy Standard and systemd's directories (`StateDirectory=`), like distro packages (e.g. PostgreSQL: data in `/var/lib`, config in `/etc`). Unlike Capistrano, whose deploy root holds both releases and `shared/`, the app's state is outside the code. Rejected: data and secrets in the git checkout (`git clean -x` or re-cloning deletes them); one user for deploying and running (the app could modify its own code); `DynamicUser=` (migrations and backups would need the same transient user).
- Secrets via `EnvironmentFile=`: one line, and the deploy user never reads them. Rejected for now: `LoadCredential=`/`LoadCredentialEncrypted=` (stricter, kept out of the environment; a unit-only change later), SOPS, and secret managers (more moving parts for one VPS).
