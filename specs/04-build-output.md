# 04 Build Output

**Goal**: Production runs releases ([build, release, run](https://12factor.net/build-release-run)): immutable builds of one commit, each with its own Node.js, switched and rolled back by activating a SHA.

## Rules

### Build

1. Builds keep Kit's default `version.name`. A release build's is the release's SHA: `release:build` sets an env var that `vite.config.ts` parses with `BuildEnvSchema` ([03](./03-environment.md) rules 14 and 20). It isn't app env, so `src/env.ts` doesn't declare it.

### Release

2. A release is `[deploy root]/releases/[sha]/`: that commit's tree, exported with `git archive`, as [Capistrano](https://capistranorb.com/documentation/getting-started/structure/) does. It holds no `.git`, so releases don't depend on the checkout. The deploy root is an argument, outside the checkout. Submodules and LFS files aren't exported; accepted.
3. `vpr release:build [deploy root]` fails on a dirty tree (untracked files included) or a complete release (rule 6). Otherwise it installs with a frozen lockfile, builds, and prints the SHA as the only line on stdout; child output goes to stderr.
4. Before building, `release:build` links the release's `.env.production.local` to `[deploy root]/shared/.env.production.local` by a relative path, whether or not it exists yet. Only this file comes from outside: the others are committed or, like `.env.local`, absent from a release. Why a link: a changed secret applies on restart ([03](./03-environment.md) rule 22). A rollback reads the current secrets; accepted, so secret names change only by adding. A changed `static` value still needs a rebuild; accepted.
5. The release holds a copy of the Node.js that ran `release:build` (`process.execPath`) at `releases/[sha]/node`, and production runs that binary. It only runs on hosts like the builder; accepted.
6. Node.js is copied last, to a temporary name renamed into place, so its presence marks a complete release. `release:build` removes an incomplete release before building, so a retry after a failed or killed build starts clean.
7. The server runs from the release directory with the release's `node`, loading env files as [03](./03-environment.md) rule 21 states.

### Activation

8. `vpr release:activate [deploy root] [sha]` fails unless the release is complete. It renames a new `current` link over the old one, so `current` always exists. Links point relative to the deploy root. Rolling back is activating `previous`, or building and activating an older commit. Concurrent activations may race; accepted.
9. Activation also points `previous` at the release `current` pointed to, renamed into place the same way. Re-activating the current release leaves `previous` unchanged.
10. When `previous` changes, activation then removes the release it pointed to, unless it's the new `current`, so only `current` and `previous` remain of activated releases. Builds never activated stay. A server still running the removed release breaks; accepted, since the operator restarts after each activation (rule 13).
11. Requests for `/_app/immutable/*` are served from `current`, falling back to `previous`, so pages of the replaced build still load their chunks ([skew protection](https://vercel.com/docs/skew-protection)). Older pages rely on SvelteKit's reload (12 App Shell).
12. `deploy/Caddyfile` is a sample config for rule 11: it serves those chunks from the deploy root and proxies everything else to the server.
13. `deploy/app.service` is a sample systemd unit: it runs `current/node` from `current`, with [03](./03-environment.md) rule 21's flags, and restarts on failure. Activation doesn't restart the server; the operator restarts the unit. It sets adapter-node's `ORIGIN`, since behind Caddy the server sees `http://`, and SvelteKit's CSRF check would reject HTTPS form posts.

### Scripts

14. Release scripts import nothing from `node_modules` and read no env, so they need no install or `MODE`. Passing rule 1's variable to the build is a child env extension ([03](./03-environment.md) rule 20).
15. The template commits no lockfile; `release:build` fails without one. Why: projects made from the template commit their own.

## Files

- `src/lib/env.ts`: `BuildEnvSchema`.
- `cli/release/build.ts`
- `cli/release/activate.ts`
- `deploy/Caddyfile`
- `deploy/app.service`

## Checks

- [ ] A release's `version.name` is its SHA, and a `vpr build` outside a release keeps Kit's default.
- [ ] In a clone with a committed lockfile and no `node_modules`, `release:build` creates `releases/[sha]/` with `build/`, `node`, and a link to the shared `.env.production.local`. Its stdout is only the SHA. `node` starts the server.
- [ ] While no variable is a required secret, `release:build` succeeds without a shared `.env.production.local`, and a later-added one is read after a restart.
- [ ] `release:build` fails on a modified file, an untracked file, a complete release, and a missing lockfile (try each).
- [ ] After a `release:build` killed during the build or the Node.js copy, a retry succeeds (try each, then revert).
- [ ] With no `node_modules`, a first activation of A creates `current` at A and no `previous`.
- [ ] Activating A, then B, then A again leaves `current` at A and `previous` at B. Activating A once more leaves `previous` at B, and B still exists.
- [ ] Activating A, then B, then C removes A and keeps an unactivated build D.
- [ ] Behind `deploy/Caddyfile`, a chunk only B has still loads after activating A, and an unknown chunk is a 404 (try it, then revert).
- [ ] `release:activate` fails for an unbuilt SHA and an incomplete release.
- [ ] With `deploy/app.service`, the server starts from `current`, reads the shared `.env.production.local`, and serves the activated release after a restart.
- [ ] Behind `deploy/Caddyfile` with `deploy/app.service`, an HTTPS form POST passes SvelteKit's CSRF check (try it with a sample form action, then revert).
- [ ] `vpr check`, `vpr lint`, and `vpr test` pass.
