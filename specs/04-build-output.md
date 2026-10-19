# 04 Build Output

Each build is immutable and identifiable, so production can switch builds with zero downtime and roll back.

## Ideas

- Pick the build ID: timestamp, git SHA (with dirty marker), or content hash.
- Pruning old builds; a "current" pointer vs. an env var.

## Checklist

- [ ] `vpr build` writes to a per-build directory and prints the build ID.
- [ ] SvelteKit's `version.name` equals the build ID (drives the "new version" toast in [09](./09-app-shell.md)).
- [ ] Asset paths are absolute, so a page served by an old build still loads.
- [ ] A production start script runs a chosen build; a missing/invalid ID fails loudly.
