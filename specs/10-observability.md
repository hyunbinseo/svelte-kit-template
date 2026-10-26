# 10 Observability

Sentry for client, server, and CLI, with privacy-first data collection.

## Ideas

- Share init between client and server.
- Check whether SvelteKit offers a cleaner hook for validation errors.

## Checklist

- [ ] Disabled in development and when `SENTRY_DSN` is unset.
- [ ] One data-collection config applied everywhere: no user info beyond the internal user ID, IPs, cookies, bodies, URL query params, or DB query params; forwarding/IP headers denied. SQL text with placeholders is allowed: it's how DB errors get debugged, and SQLite's error messages hold no values ([05](./05-database.md)).
- [ ] Traces sampled (not 100%).
- [ ] CLI uses `@sentry/node`, never `@sentry/sveltekit` (see [02](./02-cli-separation.md)).
- [ ] Requests tagged with user ID when logged in (server and client).
- [ ] Remote function validation errors logged as warnings with issue paths only, no values.
- [ ] A Sentry setup guide (project, DSN, source maps, alerts).
