# 10 Sessions

**Goal**: A browser holds a session cookie that the server checks against a stored hash on every request, extends while it's used, and revokes on logout, following [The Copenhagen Book](https://thecopenhagenbook.com/sessions).

## Rules

### Table

1. `user_session` sits in `user/schema.ts` ([05](./05-database.md) rule 3): `id` (a UUID, [05](./05-database.md) rule 22, since the cookie holds it), `userId`, `secretHash`, `createdAt`, `expiresAt`, and a `revoked` soft-delete group ([05](./05-database.md) rule 28). `secretHash` is a `blob`. `CHECK`s: `secretHash` is 32 bytes, `expiresAt` is after `createdAt`, and `revokedAt` isn't before it. `userId` is indexed ([05](./05-database.md) rule 32).
2. Sessions store no IP or user agent. Why: a session row would then hold personal data that closing must erase ([05](./05-database.md) rule 34), and the audit entry of its insert already holds the IP ([08](./08-audit-logging.md) rule 15).
3. Reason codes are `[actor]_[verb]` in snake case, prefixed by who decided: `user_`, `admin_`, `system_` (no user acts), or `cascade_` (a parent row ended). Why: an entry reads on its own in the audit database, where `[verb]By` doesn't resolve. `revokedReason` starts with `user_logged_out`; later specs add values.

### Token

4. The cookie value is `[userSessionId].[secret]`. The secret is 32 random bytes, base64url. Only its SHA-256 hash is stored, and it's compared with `timingSafeEqual` after the row is found by ID. Why split: the ID lookup needs no constant time, and a leaked database holds no usable token.
5. A token parses only in canonical form: a lowercase UUID, as `randomUUIDv7` produces, a dot, and 43 base64url characters that re-encode to themselves, so one secret has one cookie value. Anything else counts as no session.
6. Secrets reach the database, and so the audit database, only as hashes ([08](./08-audit-logging.md) rule 3).
7. `token.ts` imports no `$app/*`, so commands, seeds, and the CLI use it ([02](./02-cli-separation.md) rule 6).

### Cookie

8. The `session` cookie is `HttpOnly`, `Secure`, and `SameSite=Lax`, with path `/`, expiring with its session. SvelteKit drops `Secure` on `http://localhost`, so the e2e server works over HTTP ([SvelteKit cookies](https://svelte.dev/docs/kit/@sveltejs-kit#Cookies)). So [09](./09-e2e-harness.md)'s server URL uses the host `localhost`, not `127.0.0.1`.
9. The cookie has no `__Host-` prefix, which requires `Secure`; accepted.

### Requests

10. Without a cookie, `handle` reads nothing, so prerendering touches no database ([05](./05-database.md) rule 8). Otherwise it reads the cookie, then the active session (unrevoked and unexpired at `now`) by ID with one query, and compares the hash. On a match, it sets `locals.session` to `{ userId, userSessionId }`. Otherwise (malformed, unknown, wrong secret, expired, revoked), it deletes the cookie and leaves `locals.session` unset.
11. Nothing about a session is cached across requests, so revocation and expiry apply to the next request.
12. Sessions last 30 days and slide: once less than half is left, `extendUserSession` resets `expiresAt` to `now` plus the lifetime, and the cookie is set again. So an active user stays signed in, and a session writes at most once per half lifetime. There's no absolute lifetime, as in The Copenhagen Book; accepted, since logout and closing revoke. The values live in `src/lib/auth/config.ts`, importable by client code.
13. The audit context's `userId` ([08](./08-audit-logging.md) rule 16) is `locals.session?.userId`, set before the refresh, so the refresh's entry names its user.
14. `requireSession` throws `error(401)` without a session and returns `locals.session`. `requireLoggedOut` redirects (`303`) home with one. Both read `getRequestEvent()`, so they work in loads and remote functions. 12 App Shell's error page links a `401` to login.
15. `/account` is a page for signed-in users, guarded by `requireSession`, with the logout form. Later specs add to it.

### Logout

16. `logout` is a remote form. It revokes the session with `revokeUserSession` (`user_logged_out`, by its user), deletes the cookie, and redirects (`303`) home. Without a session, or when `revokeUserSession` returns a code (e.g. revoked meanwhile), it still deletes the cookie and redirects. Why a form, not a link: SvelteKit's CSRF check rejects a cross-site `POST`, but a cross-site page could trigger a `GET`.
17. `revokeUserSession` fails with a code when the session isn't active, or the actor isn't a user or `null` ([06](./06-commands.md) rule 18).

### Purge

18. `purgeUserSessions`, a CLI-only command ([06](./06-commands.md) rule 15), deletes sessions more than 4 days past their expiry or revocation, and returns the count, so with a daily run (rule 20) none outlives 5 days. Why 5 days: 개인정보 is destroyed 지체 없이 once its purpose ends ([개인정보 보호법](https://www.law.go.kr/법령/개인정보보호법) 제21조 ①), which [표준 개인정보 보호지침](https://www.law.go.kr/행정규칙/표준개인정보보호지침) 제10조 ① reads as within 5 days.
19. `cli/db/app/purge.ts` runs the app database's purges and prints each count, the destruction record (파기 기록). Later specs add their purges to it.
20. `deploy/app-purge.service` and `deploy/app-purge.timer` are sample units, run daily as [08](./08-audit-logging.md) rule 27's are.

### Tests

21. `seedUser` and `seedUserSession` live in `src/db/server/app/testing.ts` ([09](./09-e2e-harness.md) rule 19). `seedUserSession` returns the cookie value with the row.
22. Unit tests cover token parsing (canonical and each malformed form) and each command ([06](./06-commands.md) rule 26).
23. E2E tests cover the cookie lifecycle on `/account`: kept, extended, and deleted for each failed case (rule 10), and logout.

## Files

- `src/db/server/app/user/schema.ts`: `userSessionTable`, `UserSessionInsert`, `UserSessionSelect` added.
- `src/db/server/app/user/queries.ts`: `findActiveUserSession`.
- `src/db/server/app/user/commands.ts`: `extendUserSession`, `revokeUserSession`.
- `src/db/server/app/testing.ts`: `seedUser`, `seedUserSession` added.
- `src/db/server/app/client.ts`: the context's `userId` set.
- `src/lib/enums/user.ts`: `userSessionRevokedReasons`, `UserSessionRevokedReason`.
- `src/lib/auth/config.ts`: `SESSION_LIFETIME_MS`.
- `src/lib/auth/logout.remote.ts`: `logout`.
- `src/lib/server/auth/token.ts`: `createSecret`, `formatToken`, `parseToken`, `hashSecret`, `isSameHash`.
- `src/lib/server/auth/session.ts`: `handleSession`, `setSessionCookie`, `deleteSessionCookie`, `requireSession`, `requireLoggedOut`.
- `src/hooks.server.ts`: `handle`.
- `src/app.d.ts`: `App.Locals['session']`.
- `src/routes/account/`
- `cli/db/app/user/commands.ts`: `purgeUserSessions`.
- `cli/db/app/purge.ts`
- `deploy/app-purge.service`
- `deploy/app-purge.timer`
- `tests/session.e2e.ts`
- `drizzle/app/[timestamp]_init/` regenerated ([05](./05-database.md) rule 13).

## Checks

- [ ] A seeded session's cookie opens `/account`, and the cookie keeps its value.
- [ ] A refreshed cookie is `HttpOnly`, `SameSite=Lax`, and `Path=/`, and expires at the row's `expiresAt`; on a non-localhost origin it's also `Secure` (a unit test of `setSessionCookie`).
- [ ] A session with under half its lifetime left is extended in the database and its cookie's expiry moves.
- [ ] A malformed cookie, a wrong secret, an expired session, and a revoked session each get a `401` on `/account` and a deleted cookie.
- [ ] Logout revokes the session with `user_logged_out`, deletes the cookie, and the old cookie then gets a `401`. A logout whose session was revoked meanwhile still deletes the cookie and redirects.
- [ ] A logout form posted from another origin is rejected (try it, then revert).
- [ ] `parseToken` rejects a non-UUID ID, an uppercase ID, a short or long secret, and a non-canonical last character.
- [ ] No column or audit param holds a session secret: a seeded session's and the logout's entries hold only its hash.
- [ ] In mode `e2e`, the refresh's audit entry has the session's `userId`.
- [ ] `requireLoggedOut` redirects a signed-in request from a sample route (try it, then revert).
- [ ] `purgeUserSessions` deletes sessions more than 4 days past expiry or revocation and keeps one at exactly 4 days, on a faked clock.
- [ ] With the sample units, the purge runs and its count reaches the journal.
- [ ] `vpr check`, `vpr lint`, `vpr test`, and `vpr test:e2e` pass.
