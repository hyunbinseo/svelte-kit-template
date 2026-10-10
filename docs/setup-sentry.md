# Sentry

Sentry initializes when `SENTRY_DSN` is set:

- SvelteKit — production builds only (server and client), read via `src/env.ts`
- Node CLI — any environment, read from `process.env` by `cli/instrumentation.ts`

## Log Alerts

Invalid JWTs and validation errors are logged as warnings, not issues.

To get alerted (e.g. on JWT tampering), create a log metric monitor per query and connect it to an alert:

| Query                                      | Suggested Threshold     |
| ------------------------------------------ | ----------------------- |
| `severity:warn message:"Invalid JWT"`      | Count > 0 in 5 minutes  |
| `severity:warn message:"Validation Error"` | Count > 20 in 5 minutes |

In each alert:

- Notify a member or team directly — monitor issues have no owners.
- Trigger on new and regressed issues — a new spike reopens a resolved issue.

## Tracing

Enabled by default:

- Server — OpenTelemetry spans emitted by SvelteKit
- Client — Sentry's own spans (page loads, navigations)

## Additional Features

Not configured by default; follow the Sentry docs:

- Readable stack traces (source maps)
