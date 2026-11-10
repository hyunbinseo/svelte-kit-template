# 04 Build Output

Each build is an immutable release directory identified by its git commit, carrying the Node.js it was built with, so production can switch builds with zero downtime and roll back.

One build per release directory, so the default `build/` directory is enough — no per-build output directories.

## Ideas

- Prune old releases (`git worktree remove`), keeping enough for rollback.

## Checklist

- [x] `vpr build` writes to the default `build/` (local preview, E2E).
- [x] The build copies the Node.js that ran it (`process.execPath`) to `build/node`, and fails if `process.version` differs from `devEngines.runtime`. Servers and CLI scripts run that binary, so a release pins its own Node.js. Named after the source binary (`node.exe` on Windows).
- [x] A release is `[deploy root]/releases/[sha]/`, outside the git checkout, built from that commit; the build prints the SHA. Building from a dirty tree (including untracked files) fails, so a release always means one exact commit.
- [x] SvelteKit's `version.name` equals that SHA (drives the "new version" toast in [09](./09-app-shell.md)).
- [x] Asset paths are absolute, so a page served by an old build still loads.
- [x] Production runs a chosen release; a missing release fails loudly.

## Decisions

- Node.js ships inside the build, not in a container image or on the host ([12](./12-operations.md)). The binary only runs on hosts like the one that built it (OS, architecture, glibc); releases are built on the VPS, so they match. The runtime ships with the app, as in Elixir releases (`include_erts`, see https://hexdocs.pm/mix/Mix.Tasks.Release.html) and Java's `jlink`. Rejected: Node.js single executable applications ([12](./12-operations.md)).
- Copied in every build by wrapping adapter-node's `adapt` in `vite.config.ts`, after adapter-node empties and fills `build/` (about 150 MB). Rejected: a step after `vp build` in the `build` script (`vpr build --mode e2e` appends the flag to the last command); copying only on release (a local build would differ from a release).
- `version.name` is `git rev-parse HEAD` in every build. Only release builds reject a dirty tree, so a local build with changes reuses HEAD's SHA (accepted: local builds aren't deployed).
- `vpr release:build [deploy root]` (`cli/release/build.ts`) checks the tree is clean, adds a detached git worktree at `[deploy root]/releases/[sha]/`, copies the checkout's `.env.production.local` into it (static variables are inlined at build, and the release doesn't depend on the checkout), then runs `vp install --frozen-lockfile` and `vp run build` there. Worktrees keep `.git`, so `version.name` works. Rejected: `git archive` (no `.git` for `version.name`); a symlink to the checkout's file (a running release would read a file edited for the next one). The scripts import nothing from `node_modules`, so the checkout they run from needs no install. The deploy root is an argument, not a fixed path, and lies outside the checkout, so nothing in git can delete a release ([12](./12-operations.md)).
- `vpr release:activate [deploy root] [sha]` (`cli/release/activate.ts`) asserts the release has `build/node`, then points `[deploy root]/current` at it and `previous` at the release it replaces (unchanged if re-activating the current one). Each link is created under a temporary name and renamed over the old one, so `current` always exists. Targets are relative to the deploy root.
- `paths.relative: false`: pages use `/_app/...`, so chunk URLs don't depend on the page's path ([12](./12-operations.md) serves old chunks by path).
- The template ships no `pnpm-lock.yaml` (consumers commit their own), so `release:build` works once a project has one: `--frozen-lockfile` fails without it. Verified in a clone with a committed lockfile.
