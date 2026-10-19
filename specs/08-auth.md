# 08 Auth

Passwordless email-code login with database sessions, onboarding, and logout.

## Ideas

- A pluggable code sender (development: print to console).
- One table for error codes and Korean messages.
- Keep config importable from both server and client code.

## Checklist

Sessions:

- [ ] Cookie holds `<id>.<secret>` (256-bit random secret); only its SHA-256 hash is stored; comparison is timing-safe; malformed tokens are rejected.
- [ ] One query per request loads session + onboarding state; revocation and deactivation apply to the next request.
- [ ] Sessions last 30 days and refresh when under 15 days left; invalid, expired, or revoked cookies are deleted.
- [ ] Roles load lazily and are cached per request.
- [ ] Guards for: logged in, logged out, onboarded, not onboarded — each redirects or errors appropriately.

Login:

- [ ] Email → 6-digit code (3-minute expiry) → session.
- [ ] One pending code per contact at a time; max 2 attempts; same IP required; timing-safe compare.
- [ ] Unregistered contacts can be allowed (auto sign-up) or rejected via config.
- [ ] Deactivated users can't log in.
- [ ] `returnTo` redirect accepts same-origin absolute paths only — rejects `//x`, `/\x`, `/\t/x`, relative paths, and the login page itself.

Logout:

- [ ] Revokes the session (via procedure, not delete) and clears the cookie.
- [ ] A clear-site-data endpoint also clears cache and storage (used from the 5xx error page).

Tests:

- [ ] Session lifecycle (keep, refresh, wrong secret, expired, deactivated, logout) and the 401 → login → `returnTo` flow are E2E-tested.
