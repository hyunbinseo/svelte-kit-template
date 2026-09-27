# Sentry

Set `SENTRY_DSN` in `.env.production`. Sentry is disabled in development.

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

## Additional Features

Not configured by default; follow the Sentry docs:

- Performance monitoring (tracing)
- Readable stack traces (source maps)
