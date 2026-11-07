# 08 Auth

Passwordless email-code login with database sessions, onboarding, and logout.

## Ideas

- A pluggable code sender (development: print to console).
- One table for error codes and Korean messages.
- Keep config importable from both server and client code.

## Checklist

Sessions:

- [x] Cookie holds `<id>.<secret>` (256-bit random secret); only its SHA-256 hash is stored; comparison is timing-safe; malformed tokens are rejected.
- [x] One query per request loads session + onboarding state; revocation and closure apply to the next request.
- [x] Sessions last 30 days and refresh when under 15 days left; invalid, expired, or revoked cookies are deleted.
- [x] Roles load lazily and are cached per request.
- [x] Guards for: logged in, logged out, onboarded, not onboarded — each redirects or errors appropriately.

Login:

- [x] Email → 6-digit code (3-minute expiry) → session.
- [x] The code is bound to the browser that requested it: a login cookie holds `<id>.<secret>` (256-bit random secret). Only the SHA-256 hash of secret and code together is stored, so neither reaches the database or audit log; comparison is timing-safe.
- [x] One pending code per contact at a time; max 2 attempts.
- [x] Unregistered contacts can be allowed (auto sign-up) or rejected via config.
- [x] Closed users can't log in.
- [x] `returnTo` redirect accepts same-origin absolute paths only — rejects `//x`, `/\x`, `/\t/x`, relative paths, and the login page itself.

Logout:

- [x] Revokes the session (via procedure, not delete) and clears the cookie.
- [x] A clear-site-data endpoint also clears cache and storage (used from the 5xx error page).

Closing (탈퇴 and bans):

- [x] A procedure closes the user: `closedReason: 'user_requested'` when the user asks to leave (탈퇴), whether they close the account themselves or an admin does it for them, `'admin_banned'` when an admin bans them (강제 탈퇴), `'admin_removed'` when an admin closes it for another reason (e.g. cleanup, a legal order), `'system_removed'` when no user acts (e.g. a scheduled job for an under-14 sign-up without guardian consent or an inactivity policy, or a CLI script). The reason decides what happens to the data (only a ban keeps the contact); `closedBy` records who acted. It revokes their roles and sessions (`revokedReason: 'cascade_user_closed'`); the purge job deletes the sessions like other revoked ones ([12](./12-operations.md)). Closing is final; there's no reactivation.
- [x] The same transaction erases personal fields: the profile, login, and login attempt rows (logins matched by user ID or contact, since logins before sign-up have no user ID; via the login-deletion procedure the purge job also uses, [06](./06-query-layer.md)), and, unless banned, the contact. The user ID stays, so audit entries still resolve. An erased contact can sign up again, as a new user.
- [x] A `CHECK` allows a null contact only on closed users.
- [x] A ban keeps the contact for a configurable block period (default: 6 months), so the person can't sign up again; then the purge job erases it ([12](./12-operations.md)). The basis is 제15조 ① 6호 (정당한 이익); the period, its purpose, and a short balancing note go in the privacy policy.
- [x] Records the law requires keeping stay only in the audit database until its retention ends ([07](./07-audit-logging.md), [12](./12-operations.md)).

Tests:

- [x] Session lifecycle (keep, refresh, wrong secret, expired, closed, logout) and the 401 → login → `returnTo` flow are E2E-tested.

## Decisions

- Login codes are hashed with a browser-held secret (`SHA-256(secret + code)`), following [Email code authentication](https://auth.pilcrowonpaper.com/email-code-authentication)'s binding to the requesting browser. The secret's 256 bits make brute-forcing a leaked database or backup infeasible, even with 6-digit codes, without a server-side secret. Rejected: plaintext (codes in the audit log); plain SHA-256 of the code (a million candidates, cracked instantly); Argon2 (6 digits are still crackable within the expiry, and it costs CPU per login); HMAC with a server key (one more secret to manage); magic links (codes are entered in the requesting browser by design). The browser binding replaces a same-IP check: a code is useless without the cookie's secret, and the IP can change mid-login on mobile networks. IPs are still recorded.
- Closing is final for every reason. A ban keeps only the contact, and only for the block period: indefinite retention would need a purpose 제21조 doesn't allow. Rejected: reversible suspension (a reopened row loses its history; temporary suspensions would get their own table). Closing ends the purpose, so personal data must be destroyed ([개인정보 보호법 제21조](https://www.law.go.kr/법령/개인정보보호법/제21조) ①), except what another law requires keeping, which must be stored separately (③). The audit database is that separate storage: a different file, access-controlled, purged on its own schedule. So the app database erases personal fields, and required records remain only in audit entries until their retention ends ([07](./07-audit-logging.md)). No grace period (탈퇴 철회): withdrawal is final, the norm for Korean services, and erasure is 지체 없이 as 제21조 ① asks. Rejected: a configurable grace period (pending-withdrawal state, a purge job, and a privacy-policy disclosure).
- Reason codes are `[actor]_[verb]` (snake_case), so they read on their own, e.g. in audit entries. The prefix names who decided: `user_` when the user asks, even if an admin carries it out (`*By` then records the admin), `admin_` for an admin's decision, `system_` when no user row acts (scheduled jobs, CLI scripts). A row ended because its parent ended uses `cascade_` plus the parent's soft delete group, e.g. `cascade_user_closed` on the roles and sessions of a closed user; `*By` copies the triggering actor, so any value is allowed. A soft delete `CHECK` keeps the prefix and `*By` consistent: `admin_` reasons require `*By`, `system_` reasons forbid it, and a reason without one of these prefixes is rejected. It matches the prefix, not the values ([05](./05-database.md)). Only an admin ban keeps the contact; every other closing erases it like `user_requested`. Rejected: reasons without the actor (`'requested'`, `'removed'`), which left it to `*By`, ambiguous when an admin acts on a user's request; `'withdrawn'` and `'admin'` (no code for non-ban removals); a bare `account_closed` (each new cascade would need its own value in the `CHECK`, so a table rebuild).
- The closed user row stays (ID, dates, reason codes, actor IDs, role history), so audit entries and other rows' actor columns still resolve. While audit entries or a ban's contact can link the ID to a person, the row is personal information (제2조 제1호 나목, "쉽게 결합하여"), kept for the integrity of those records; once they expire, it's anonymous (제58조의2). This doesn't rely on 시행령 제16조 ① 1호's anonymization proviso, which covers only data whose deletion is "현저히 곤란" (deleting a row isn't): personal fields are deleted outright. So closing must erase every personal column, including any added to `user` later (cf. [PIPC 제2021-007-072](https://casenote.kr/개인정보보호위원회/제2021-007-072호), Scatter Lab: a hashed member number kept with gender and age after withdrawal breached 제21조 ①). Rejected: hard-deleting the user (breaks actor references and audit resolution, and gains nothing once the row is anonymous).
- Closing revokes sessions instead of deleting them, like logout: the row keeps who closed the account until the purge job deletes it within 5 days, which counts as 지체 없이 ([12](./12-operations.md)). Login rows are still erased at once, since they hold the contact. Rejected: deleting sessions at closure (the cascade's actor would be lost).
- Layout: `src/lib/auth/` holds what client code may import: `config.ts` (sign-up policy, code length and lifetime, attempts, session lifetime and refresh threshold, ban block period), `errors.ts` (the one table of error codes and Korean messages), `return-to.ts`, and the logout form (`logout.remote.ts`). `src/lib/server/auth/` holds `token.ts` (secrets, hashes, cookie values; Node-only, so procedures and the CLI can use it), `session.ts` (`handleSession`, guards, `getSessionRoles`, `logout`), `roles.ts`, and `sender.ts`. Routes: `/login`, `/onboarding`, `/account` (minimal, for E2E until [09](./09-app-shell.md)), and `POST /clear-site-data`.
- Tokens: 32 random bytes, base64url. `parseToken` accepts only `^[1-9]\d{0,15}\.[\w-]{43}$` with a safe-integer ID and a canonical encoding (re-encoding must match), so one secret has one cookie value. Hashes are compared with `timingSafeEqual`.
- Contacts are emails, trimmed and lowercased, at most 254 characters.
- Requesting a code creates only a `login` row (`startLogin`); the user row is created by `completeLogin`, after a correct code, so unverified emails never become users. The sign-up policy is checked there and in `startLogin`, so no code goes to a contact that can't sign up, and the form shows the procedure's error (no separate read in the route). `startLogin` rejects a request while the contact has a pending login (unexpired, attempts left, unused). Rejected: replacing the pending login (anyone could resend codes to a contact without limit). Cost: a user who loses the login cookie waits up to 3 minutes.
- The login cookie has `path=/` and a 3-minute `maxAge`: remote functions post to `/_app/remote/…`, so a `/login` path wouldn't reach them. `/login` shows the code form while the cookie exists, so a reload keeps the step.
- `completeLogin` returns `login_not_found` when there's no pending login (nothing recorded); its other errors (`code_mismatch`, `user_closed`, `sign_up_closed`) come after the attempt is recorded, the one guard failure that writes ([06](./06-query-layer.md)). The route keeps the login cookie only on `code_mismatch`, and shows `login_not_found` as expired. Closed contacts are rejected at both steps. A send failure discards the login (`discardLogin`, only while it has no attempts), so the contact can retry at once. `markLoginSent` stores the provider's ID, if any.
- Code sender: `sendLoginCode` (`sender.ts`) prints the code in `development` and `e2e`, and throws in `production` until a project plugs in a provider, so codes can't silently end up in production logs.
- Guards: `requireSession` throws `error(401)`, and the error page links to `/login?returnTo=…` with the current URL: a remote `query` can't read `event.url`, so a guard can't build the link. `requireLoggedOut`, `requireOnboarded`, and `requireNotOnboarded` redirect (303), which SvelteKit also handles in `query`. `returnTo` travels as a hidden field, and a new user goes to `/onboarding?returnTo=…` first.
- `handleSession` sets `locals.session` (`id`, `userId`, `isOnboarded`), replacing [07](./07-audit-logging.md)'s placeholder `locals.user`. Refreshing is a write (`extendSession`), so it's audited; it happens at most once per 15 days per session.
- Roles are cached per request in a `WeakMap` keyed by `locals` (remote functions copy the event, but share `locals`). `loadSessionRoles(db, locals)` takes the client, so `#db/app/client.ts` uses the same cache for the audit log's `byStaff` without an import cycle.
- `/clear-site-data` is `POST`, so SvelteKit's CSRF check blocks cross-site forms. It logs out like the logout form, then responds `303` with `Clear-Site-Data: "cache", "cookies", "storage"`.
- E2E: [11](./11-testing.md)'s harness wasn't built yet, so this adds a minimal one (see there). The code only reaches the server console, so tests seed logins with a known secret and code (`seedPendingLogin`) and set the login cookie; the real request is tested up to the pending-login and attempt rules.
- Ban block period: `BAN_BLOCK_PERIOD` (`{ months: 6 }`, a `Temporal.DurationLike`) in `config.ts`; [12](./12-operations.md)'s purge job applies it.
