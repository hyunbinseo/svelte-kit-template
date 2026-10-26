# 12 Operations

Run production on a single VPS: provisioning, HTTPS, containers, deploys, and backups.

Target: a small VPS (any Linux distro with a recent Podman), Tailscale SSH (no public SSH), Caddy on the host for HTTPS, and rootless Podman with Quadlet (systemd) for the app. Images are built on the VPS. SQLite databases stay on the host, outside the containers.

## Ideas

- Automate as much of provisioning as possible (cloud-init).
- One Quadlet template unit (e.g. `app@.container`) for all instances vs. one unit per instance.
- Rolling deploy: replace one container at a time; Caddy's active health checks and `lb_try_duration` route around the one restarting.
- Networking: publish each port on `127.0.0.1` vs. host networking (keeps `HOST="127.0.0.1"` and the client IP chain simple).
- A Node.js health check script (slim images have no `curl`).
- Run migrations and backups as one-off containers from the same image and mounts; schedule backups with a systemd timer.
- Migrations run while the old build still serves traffic, so they must stay compatible with it (expand, then contract).
- Building on a small VPS may run out of memory (swap, or a heap limit for the build).
- Make backup pruning a pure, tested function with a thin script around it.
- Configurable retention.

## Checklist

- [ ] A `Containerfile` (and `.containerignore`) builds the production image on the VPS. The image runs as a non-root user and contains no `*.local` files and no `data/`.
- [ ] The image pins Node.js to the same version as `devEngines.runtime` (e.g. `node:24.22.0-slim`); a test fails if they differ.
- [ ] The image starts the server with the env files loaded (see [03](./03-environment.md)); `.env.production.local` is provided as a Podman secret, mounted at its path in the app directory (not in the image, not in `podman inspect`). Verified: each instance listens on its configured `HOST` and `PORT`.
- [ ] At least 2 app containers run under systemd: started on boot, restarted on failure, health-checked.
- [ ] Deploys have zero downtime: containers are replaced one at a time, and Caddy routes only to healthy ones. Verified with requests during a deploy.
- [ ] Rollback runs the previous image tag ([04](./04-build-output.md)) without rebuilding.
- [ ] Databases live in a host directory, bind-mounted at `DATA_DIR`. The `700` directory mode works with rootless Podman's user mapping. Deploys and image pruning never touch it.
- [ ] Migrations run from the new image before its containers replace the old ones.
- [ ] Client IPs reach the app correctly (Caddy, then `ADDRESS_HEADER`/`XFF_DEPTH`).
- [ ] Daily backup of app and audit DBs via `node:sqlite` `backup()`; both kept 90 days. Each audit backup holds the full retained log, so it needs no longer retention ([07](./07-audit-logging.md)). Erased data lingers in backups until they rotate out; the privacy policy says so.
- [ ] After a successful backup, the daily job purges: audit entries past their retention (개인정보취급자 2 years, others 3 months, [07](./07-audit-logging.md)); `login` rows (with their attempts, via the procedure closing uses, [06](./06-query-layer.md)) 5 days after they expire, and sessions 5 days after they expire or are revoked (지체 없이, which the 표준 개인정보 보호지침 reads as within 5 days); and banned users' contacts after the block period ([08](./08-auth.md)).
- [ ] Each destruction (closing and purge) is recorded (what, how many, when), and the 개인정보 보호책임자 can confirm the results ([표준 개인정보 보호지침](https://www.law.go.kr/행정규칙/표준개인정보보호지침) 제10조 ③ ④). The audit entries of the `DELETE` statements may serve, if they suffice.
- [ ] Backup failures reported to Sentry; non-zero exit.
- [ ] `docs/` covers: provisioning, firewall, HTTPS (Caddy), Podman install and updates, building images, deploy, rollback, and restoring a backup.
- [ ] A Korean privacy policy template. It covers 파기절차 및 파기방법 (제30조 ① 3의2) and lists what's kept after an account is closed as a table (item, purpose, legal basis, period): access records of staff (2 years, audit database, 안전성 확보조치 기준 제8조), users' login records (3 months, audit database, 통신비밀보호법), a banned user's contact (the block period, 제15조 ① 6호, [08](./08-auth.md)), the closed account record (ID, dates, reason codes, actor IDs, role history; personal information while audit entries or a ban's contact can link it to a person, then anonymous, [08](./08-auth.md)), backups (90 days), and, for projects that take payments, commerce and tax records (5 years, 전자상거래법, 국세기본법). Verify periods against current law.
- [ ] Provisioning validated on a fresh VM (ask before downloading a cloud image).
