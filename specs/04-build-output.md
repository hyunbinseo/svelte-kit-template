# 04 Build Output

Each build is an immutable container image identified by its git commit, so production can switch builds with zero downtime and roll back.

One build per image, so the default `build/` directory is enough — no per-build directories.

## Ideas

- `.git` is usually excluded from the build context; pass the commit SHA in (e.g. a build argument).
- Prune old images, keeping enough for rollback.
- During a rolling deploy, pages from the old build may request chunks the new build lacks. Consider keeping the previous build's `_app/immutable/` reachable.

## Checklist

- [ ] `vpr build` writes to the default `build/` and works without a container runtime (local preview, E2E).
- [ ] The production image is tagged with the git commit SHA; the build prints it. Building from a dirty tree (including untracked files) fails, so a tag always means one exact commit.
- [ ] SvelteKit's `version.name` equals that SHA (drives the "new version" toast in [09](./09-app-shell.md)).
- [ ] Asset paths are absolute, so a page served by an old build still loads.
- [ ] Production runs a chosen image tag; a missing tag fails loudly.
