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
- [ ] Daily backup of app and audit DBs via `node:sqlite` `backup()`; app kept 90 days, audit 365.
- [ ] Audit rows are deleted only after a successful backup.
- [ ] Backup failures reported to Sentry; non-zero exit.
- [ ] `docs/` covers: provisioning, firewall, HTTPS (Caddy), Podman install and updates, building images, deploy, rollback, and restoring a backup.
- [ ] A Korean privacy policy template.
- [ ] Provisioning validated on a fresh VM (ask before downloading a cloud image).
