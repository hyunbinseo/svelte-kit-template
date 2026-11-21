# 13 Observability

**Goal**: Errors and sampled traces from the client, the server, and CLI scripts reach Sentry, with no personal data beyond the internal user ID.

## Rules

### Setup

1. It adds `@sentry/sveltekit` and `@sentry/node`, pending the user's approval; without it, the spec is dropped. `cli/` uses only `@sentry/node`, since the canary catches `@sentry/sveltekit`'s SvelteKit types ([02](./02-cli-separation.md) rule 7).
2. `SENTRY_DSN` is optional, public, and static, since it's no secret ([03](./03-environment.md) rule 22). Sentry sends only in modes `preview` and `production`, with the mode as `environment`, and only while `SENTRY_DSN` is set, so test runs that fail on purpose send nothing.
3. Every `init` (client, server, CLI) spreads one options object, `sentryOptions`, adding only `dsn`, `environment`, and `release`. It imports no `$app/*` and `satisfies` `@sentry/node`'s option type, since even a type import of `@sentry/sveltekit` would break `cli/`'s canary. `src/lib/sentry/kit.ts` checks it against `@sentry/sveltekit`'s type. No third Sentry package is imported.

### Data

4. Nothing personal is collected: no IPs or inferred user fields, cookies, bodies, query parameters, database query parameters, or stack frame variables, and no Session Replay. Sentry can still infer an IP on arrival, so `docs/sentry.md` requires the project's "Prevent Storing of IP Addresses" and server-side scrubbing; not checked, accepted.
5. Headers are allowlisted to `User-Agent`; the rest are sent filtered, so a header added later (e.g. a new proxy's IP header) can't leak.
6. Every URL in an event, breadcrumb, or span loses its query and hash, whatever the SDK's query options say.
7. Console breadcrumbs are dropped, since console output can hold values.
8. SQL text is sent: its values are bound ([07](./07-queries.md) rule 4) and kept out of errors ([05](./05-database.md) rule 11).
9. The user ID is the one user field, sent while Sentry is on, so an error links to a user's report and counts affected users. The server sets it per request after `handleSession` ([10](./10-sessions.md) rule 10). The root layout sets it on the client from `getSessionUserId` ([12](./12-app-shell.md) rule 14), re-read after every navigation and form submission, since the layout outlives login, logout, and closing; `null` clears it. It's pseudonymous 개인정보, so `docs/sentry.md` tells projects to disclose Sentry in their privacy policy as 처리위탁 and 국외 이전 ([개인정보 보호법](https://www.law.go.kr/법령/개인정보보호법) 제26조, 제28조의8), and sets a short retention, since sent IDs outlive closing (05 rule 33); not checked, accepted.
10. Paths are sent as route IDs (`/posts/[postId]`), not filled paths, in transaction names, span names, and URLs, since a parameter may be another user's ID.

### Errors

11. The server's `handleError` sends unknown errors and 5xx, not 4xx, and logs unknown errors as SvelteKit's default does.
12. A remote function's validation failure is logged as a warning, to the console and Sentry, with its issue paths only, since SvelteKit's default logs whole issues, which hold submitted values.
13. The client's `handleError` sends unknown errors and 5xx, and logs as SvelteKit's default does.
14. [08](./08-audit-logging.md) rule 10's `report` also sends its error to Sentry, never an audit entry or its params.
15. A failure to send a login code ([11](./11-login-and-onboarding.md) rule 12) is reported, to the console and Sentry, as a fixed error with only the provider's status or code, never its message, which may hold the recipient's address.

### Tracing

16. The server initializes in `src/instrumentation.server.ts`, before the app loads. SvelteKit's server tracing supplies the spans, so the Vite plugin's auto-instrumentation is off.
17. Traces are sampled at a fixed rate below 1.

### Releases

18. `release` is SvelteKit's `version.name`: the commit SHA in a release build ([04](./04-build-output.md) rule 1).
19. Source maps are uploaded only by a release build (04 rule 1's SHA variable set) with `SENTRY_AUTH_TOKEN` in its environment, never an env file (03 rule 20). The token is in `BuildEnvSchema`, not app env. Uploaded maps are deleted from the output, so they're never served. The plugin's telemetry is off, and its output goes to stderr (04 rule 3).
20. The plugin's release name is that SHA variable, not detected from git, since a release holds no `.git`.

### CLI

21. `cli/lib/sentry.ts` initializes `@sentry/node` on import, after `cli/lib/env.ts`. Every script that reads env imports it first; one that forgets goes unreported; accepted. Uncaught errors and unhandled rejections are sent and exit non-zero through `process.exitCode` (02 rule 14); expected failures aren't sent. `release` comes from the build output's `_app/version.json` when it exists, so a checkout reports its last local build's version; accepted.

### Docs

22. `docs/sentry.md` covers creating the project, the DSN, the auth token for source maps, alerts, and the privacy-policy disclosure (rule 9).

## Files

- `src/lib/env.ts`: `SENTRY_DSN` added to `AppEnvSchema`, `SENTRY_AUTH_TOKEN` to `BuildEnvSchema`.
- `src/env.ts`: `SENTRY_DSN` added.
- `src/lib/sentry/options.ts`: `sentryOptions`.
- `src/lib/sentry/kit.ts`: `isSentryEnabled`, `sentryKitOptions`.
- `src/instrumentation.server.ts`
- `src/hooks.server.ts`: `handle` and `handleError` changed.
- `src/hooks.client.ts`: `handleError`.
- `src/routes/+layout.svelte`: the client's user ID.
- `cli/lib/sentry.ts`
- `vite.config.ts`: the Sentry plugin.
- `docs/sentry.md`

## Checks

- [ ] In modes `development` and `e2e`, and with `SENTRY_DSN` unset in other modes, nothing is sent.
- [ ] Against a local mock ingest, a `preview` build's envelopes, with a DSN pointing at it, from a signed-in request with a query, a client navigation and fetch with queries (breadcrumbs), a route with a UUID parameter, a cookie, `X-Forwarded-For`, `X-Real-IP`, and `Referer`, a 404, a validation failure, and server and client errors hold no query values, filled route parameters, IPs, cookie or session values, contact, or submitted input. They hold the signed-in user's ID, and every header but `User-Agent` is filtered.
- [ ] After login, a client error carries the user's ID; after logout, none.
- [ ] A 4xx sends nothing; an unknown server error and a client error each send one event.
- [ ] A validation failure's console warning and event hold only issue paths.
- [ ] A thrown error and an unhandled rejection in a sample CLI script each reach the mock ingest, exit non-zero, and with stderr piped their full stack arrives; an expected failure isn't sent.
- [ ] A send failure whose provider message holds the recipient's address reaches the console and Sentry without it.
- [ ] `cli/lib/sentry.ts` passes `vpr check`; importing `@sentry/sveltekit` in `cli/` fails it.
- [ ] With `SENTRY_AUTH_TOKEN` set, a release build uploads source maps and leaves none in the output; `vpr build` and the e2e build upload nothing, and neither does a release build without the token.
- [ ] An event's `release`, a CLI script's event run from a release, and the uploaded source maps' release are the release's SHA.
- [ ] A failed audit write reaches Sentry through `report` without its params.
