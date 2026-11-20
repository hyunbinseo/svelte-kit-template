# 13 Observability

**Goal**: Errors and sampled traces from the client, the server, and CLI scripts reach Sentry, with no personal data.

## Rules

### Setup

1. It adds `@sentry/sveltekit` and `@sentry/node`. The user approves them before this spec is frozen; without approval, the spec is dropped. `cli/` uses only `@sentry/node`: `@sentry/sveltekit` declares SvelteKit's types, so the canary catches it ([02](./02-cli-separation.md) rule 7).
2. `SENTRY_DSN` is optional, public, and static: it's no secret ([03](./03-environment.md) rule 22). Sentry is off in modes `development` and `e2e`, so test runs that fail on purpose send nothing, and while `SENTRY_DSN` is unset. `preview` and `production` send, with the mode as `environment`.
3. One options object, `sentryOptions`, imports no `$app/*`, and every `init` (client, server, CLI) spreads it, adding only `dsn`, `environment`, and `release`. It `satisfies` only `@sentry/node`'s option type, since importing `@sentry/sveltekit`'s types, even as types, would reach `cli/` and break the canary ([02](./02-cli-separation.md) rules 6–7). `src/lib/sentry/kit.ts` checks the same object against `@sentry/sveltekit`'s type where it spreads it, and `cli/` never imports it. No third Sentry package is imported.

### Data

4. Nothing personal is collected: no IPs or inferred user fields, cookies, bodies, query parameters, database query parameters, or stack frame variables. Session Replay is off. The mock ingest verifies the SDK side. Sentry can still infer an IP from the connection on arrival, so `docs/sentry.md` requires the project's "Prevent Storing of IP Addresses" and server-side scrubbing settings; not checked, accepted.
5. Headers are allowlisted to `User-Agent`; the rest are sent filtered. Why an allowlist: a header added later (e.g. a new proxy's IP header) can't leak.
6. Every URL in an event, breadcrumb, or span loses its query and hash, since some keep the full URL whatever the query option says.
7. Console breadcrumbs are dropped, since console output can hold values (e.g. a failed parse's input).
8. SQL text is sent: its values are bound ([07](./07-queries.md) rule 4), and errors hold none ([05](./05-database.md) rule 11). Audit entries never reach Sentry ([08](./08-audit-logging.md) rule 3).
9. No user field is sent, not even the user ID. Why: a user ID is 개인정보 once joined with the app database, and the global constraint bans PII in telemetry. An error is matched to a user's report by time and path; accepted. Sentry still processes technical data (browser, OS, paths) abroad, so `docs/sentry.md` tells projects to disclose it in their privacy policy as 처리위탁 and 국외 이전 ([개인정보 보호법](https://www.law.go.kr/법령/개인정보보호법) 제26조, 제28조의8); not checked, accepted.
10. Paths are sent as route IDs (`/posts/[postId]`), not filled paths, in transaction names, span names, and URLs. Why: a route parameter may be a user ID (rule 9).

### Errors

11. The server's `handleError` sends unknown errors and 5xx, not 4xx, and logs unknown errors as SvelteKit's default does.
12. A remote function's validation failure is logged as a warning, to the console and Sentry, with its issue paths only. Why: SvelteKit's default logs whole issues (`console.error`), whose messages and inputs hold submitted values.
13. The client's `handleError` sends unknown errors and 5xx, and logs as SvelteKit's default does.
14. [08](./08-audit-logging.md) rule 10's `report` also sends its error to Sentry, after `console.error`, never an audit entry or its params ([08](./08-audit-logging.md) rule 3).
15. [11](./11-login-and-onboarding.md) rule 12's send failure sends a fixed error with only the provider's status or code, never its message, which may hold the recipient's address. The console gets the same.

### Tracing

16. The server initializes in `src/instrumentation.server.ts`, before the app loads. SvelteKit's own server tracing supplies the spans, so the Vite plugin's auto-instrumentation is off.
17. Traces are sampled at a fixed rate below 1, set in `sentryOptions`.

### Releases

18. `release` is SvelteKit's `version.name`, the commit SHA in a release build ([04](./04-build-output.md) rule 1).
19. Source maps are uploaded only when `SENTRY_AUTH_TOKEN` is set in the build's environment, never an env file ([03](./03-environment.md) rule 20), and are then deleted from the build output, so they're never served. It's in `BuildEnvSchema` ([04](./04-build-output.md) rule 1), not app env. The plugin's telemetry is off, and its output goes to stderr ([04](./04-build-output.md) rule 3).
20. The plugin's release name is [04](./04-build-output.md) rule 1's SHA variable, never detected from git, since a release holds no `.git`.

### CLI

21. `cli/lib/sentry.ts` initializes `@sentry/node` on import, after `cli/lib/env.ts`, and every script that reads env imports it first. Uncaught errors are sent; expected failures ([02](./02-cli-separation.md) rule 14) aren't. After sending a fatal error, it sets `process.exitCode` instead of calling `process.exit`, as [02](./02-cli-separation.md) rule 14 requires. A script that forgets the import goes unreported; accepted. CLI events carry no `release`, since a release holds no `.git` ([04](./04-build-output.md) rule 2); accepted.

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
- `cli/lib/sentry.ts`
- `vite.config.ts`: the Sentry plugin.
- `docs/sentry.md`

## Checks

- [ ] In modes `development` and `e2e`, and with `SENTRY_DSN` unset in other modes, nothing is sent.
- [ ] Against a local mock ingest, a `preview` build's envelopes, with a DSN pointing at it, from a signed-in request with a query, a client navigation and fetch with queries (breadcrumbs), a route with a UUID parameter, a cookie, `X-Forwarded-For`, `X-Real-IP`, and `Referer`, a 404, a validation failure, and server and client errors hold no query values, filled route parameters, IPs, cookie or session values, contact, or submitted input. They hold no user ID, and every header but `User-Agent` is filtered.
- [ ] A 4xx sends nothing; an unknown server error and a client error each send one event.
- [ ] A validation failure's console warning and event hold only issue paths.
- [ ] A thrown error in a sample CLI script reaches the mock ingest, exits non-zero, and with stderr piped its full stack arrives; an expected failure isn't sent (try each, then revert).
- [ ] A send failure whose provider message holds the recipient's address reaches the console and Sentry without it (try it, then revert).
- [ ] `cli/lib/sentry.ts` passes `vpr check`; importing `@sentry/sveltekit` in `cli/` fails it (try it, then revert).
- [ ] With `SENTRY_AUTH_TOKEN` set, the build uploads source maps and leaves none in the output; without it, it uploads nothing.
- [ ] An event's `release` and the uploaded source maps' release are the release's SHA.
- [ ] `vpr check`, `vpr lint`, `vpr test`, and `vpr test:e2e` pass.
