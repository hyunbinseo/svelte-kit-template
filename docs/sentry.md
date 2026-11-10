# Sentry

Errors and traces from the browser, the server, and CLI scripts go to one Sentry project. Sentry stays off in development and when `SENTRY_DSN` is unset. What the SDK collects is set once in `src/lib/sentry/options.ts`. See `specs/10-observability.md`.

## Project

1. Create a project on https://sentry.io with the SvelteKit platform.
2. In the project's **Settings → Security & Privacy**, turn on **Data Scrubber**, **Use Default Scrubbers**, and **Prevent Storing of IP Addresses**. The SDK already sends no IPs; these settings protect against an SDK change or a misconfiguration.
3. Copy the DSN from **Settings → Client Keys (DSN)**.

## DSN

Set it in `.env.production.local` on the server that builds releases:

```sh
SENTRY_DSN="https://...@....ingest.sentry.io/..."
```

`SENTRY_DSN` is public and static: it's inlined at build time, so rebuild after changing it. `vpr release:build` copies the file into each release. CLI scripts read it from the same file.

## Source Maps

Source maps are uploaded during `vpr build` when `SENTRY_AUTH_TOKEN` is set. They're deleted from `build/` after the upload, so they're never served.

1. Create an organization token in **Settings → Organization Tokens**. It's a secret, so keep it out of env files and git.
2. Pass the token, the organization slug, and the project slug to the build:

   ```sh
   SENTRY_AUTH_TOKEN="sntrys_..." SENTRY_ORG="my-org" SENTRY_PROJECT="my-project" vpr release:build /opt/app
   ```

The release name is the commit SHA, the same as SvelteKit's `version.name`. CLI events have no release.

## Alerts

In **Alerts**, create:

- An issue alert for new issues, and for regressions of resolved ones.
- An issue alert for any `fatal` event, which is how a failed CLI script (e.g. a backup) is reported.
