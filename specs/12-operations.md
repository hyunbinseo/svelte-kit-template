# 12 Operations

Run production on a single VPS: provisioning, HTTPS, process management, deploys, and backups.

Target: a small VPS (e.g. Vultr, Rocky Linux), Tailscale SSH (no public SSH), Caddy for HTTPS, PM2 for processes.

## Ideas

- Automate as much of provisioning as possible (cloud-init).
- Make backup pruning a pure, tested function with a thin script around it.
- Configurable retention.

## Checklist

- [ ] PM2 cluster mode, at least 2 instances, for zero-downtime reload; PM2's Node.js version is accounted for.
- [ ] Daily backup of app and audit DBs via `node:sqlite` `backup()`; app kept 90 days, audit 365.
- [ ] Audit rows are deleted only after a successful backup.
- [ ] Backup failures reported to Sentry; non-zero exit.
- [ ] `docs/` covers: provisioning, firewall, HTTPS (Caddy), Node.js/PM2 install and updates, deploy, rollback.
- [ ] A Korean privacy policy template.
- [ ] Provisioning validated on a fresh VM (ask before downloading a cloud image).
