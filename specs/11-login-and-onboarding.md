# 11 Login and Onboarding

**Goal**: A person signs in with a code sent to their email, becoming a user on first success, completes onboarding once, and can close their account, erasing their personal data.

## Rules

### Users

1. `user` gains `contact`, a nullable, unique email. A `CHECK` allows `null` only on a closed user.
2. One Valibot schema, outside `src/db/server/` ([07](./07-queries.md) rule 5), trims and lowercases a contact and caps it at 254 characters. Every form and command input uses it.
3. `user` gains a `closed` soft-delete group ([05](./05-database.md) rule 28). `closedReason` starts with `user_requested` ([10](./10-sessions.md) rule 3).

### Logins

4. `login` sits in `login/schema.ts`: `id` (a UUID, since the login cookie holds it), `contact`, `codeHash`, `createdAt`, and `expiresAt`. `codeHash` is a 32-byte `blob`, as `secretHash` is (10 rule 1). `contact` is indexed. It has no user key, since a login before sign-up has no user; closing (rule 27) and the purge (rule 30) erase its contact.
5. `login_attempt` holds `loginId`, `attemptedAt`, and `hasSucceeded`. Neither table stores an IP (10 rule 2).
6. A login is pending while it's unexpired, has attempts left, and has no successful attempt.

### Codes

7. A code is random digits from `node:crypto`. Its length, lifetime, and attempt limit live in `src/lib/auth/config.ts`, with the sign-up switch (rule 13).
8. The code is bound to the browser that requested it ([email code authentication](https://thecopenhagenbook.com/email-verification)): the login cookie holds `[loginId].[secret]` (10 rules 4–5), and `codeHash` is the SHA-256 of the secret followed by the code, so neither a leaked database nor audit params can crack a code, and no server key is needed. A code is useless without the cookie, so there's no same-IP check.
9. The login cookie is set as the session cookie is (10 rule 8), named `login`, with path `/` (remote functions post to `/_app/remote/…`) and a max age of the code's lifetime.

### Requesting a Code

10. `/login` and both its forms are guarded by `requireLoggedOut`, so a signed-in browser can't orphan its session with a new one. It shows the contact form, and the code form while the login cookie exists, so a reload keeps the step.
11. `startLogin` fails with `login_pending` while the contact has an unexpired login without a successful attempt, even one with no attempts left, so a contact gets at most one code, and so at most the attempt limit of guesses, per code lifetime. Checking only pending logins would let spent attempts unlock a new code at once: unbounded guessing. A user who loses the cookie waits out the lifetime, anyone can block a contact's login by requesting a code, and `login_pending` reveals a login in progress; accepted, as rate limits are a project's.
12. `sendLoginCode` runs after `startLogin` commits ([06](./06-commands.md) rule 29). If it throws, `discardLogin` deletes the login if it has no attempts, the error is reported, and the form asks to retry, so the contact can request again at once.
13. Sign-up is open by default. When closed, `startLogin` and `completeLogin` fail with `sign_up_closed` for a contact with no active user, so no code goes to a contact that can't sign up. That reveals whether a contact has an account; accepted.
14. `sendLoginCode` prints the code, without the contact, to the console in every mode but `production`, where it throws until a project adds an email provider, so a code can't silently land in production logs.

### Verifying a Code

15. `completeLogin` returns `login_not_found` without writing when the login isn't pending. Otherwise it records the attempt, then returns `code_mismatch` on a wrong code, the one guard failure that writes (06 rule 21). Hashes are compared as 10 rule 4 compares them.
16. On a match, it creates a new session, first creating the user if the contact has no active one, so an unverified email never becomes a user. It returns the session and whether the user is onboarded.
17. On `code_mismatch`, the login cookie stays, for the attempts left. Every other outcome deletes it. `login_not_found` reads as an expired code.
18. On success, the session cookie is set and the user is redirected (`303`) to `returnTo` or home, via `/onboarding` (carrying `returnTo`) if not onboarded.
19. `returnTo` is kept only as a same-origin path: it starts with `/` but not `//`, holds no `\` or control character, resolves to the same origin, and its pathname isn't `/login`. Anything else is dropped, since browsers read `/\x` and `/\t/x` as `//x`, an open redirect. It travels as a query parameter and a hidden field.

### Onboarding

20. `user_profile` holds `userId` (its primary key, 05 rule 22), `name`, and `createdAt`. A user with a profile is onboarded. `name` is the template's sample field, with a length `CHECK`.
21. The onboarding form asks for `name` and a required confirmation of being 14 or older, since [개인정보 보호법](https://www.law.go.kr/법령/개인정보보호법) 제22조의2 requires a guardian's consent under 14, which the template doesn't collect. The profile's `createdAt` records when it was confirmed. The privacy policy (처리방침, 제30조) is a project's.
22. `onboardUser` fails with `user_not_found` for a missing or closed user and `user_already_onboarded` for an onboarded one.
23. `findActiveUserSession` (10 rule 10) also excludes closed users, backing up the cascade (rule 27), and returns whether the user is onboarded, so `locals.session` gains `isOnboarded` with no second query.
24. `requireOnboarded` requires a session, then redirects (`303`) to `/onboarding` if not onboarded. `requireNotOnboarded` requires a session, then redirects home if onboarded. `/onboarding` uses `requireNotOnboarded`, and `/account` uses `requireOnboarded`.

### Closing

25. `/account` has a closing form (탈퇴) with a required confirmation, and so does `/onboarding`, so a user who never onboards (e.g. under 14) can still erase their contact. It calls `closeUser` with `user_requested`, by the user, then deletes the session cookie and redirects home.
26. `closeUser` fails with `user_not_found` for a missing or closed user, and `actor_not_found` unless the actor is an active user or `null`.
27. In one transaction (06 rule 25), it sets the closed group, sets `contact` to `null`, deletes the profile and the contact's logins (attempts first), and revokes the user's active sessions with `cascade_user_closed`.
28. Closing is final. The same email can sign up again as a new user, since nothing links it to the closed one. Bans that keep a contact to block sign-up are a project's; accepted.

### Errors

29. `src/lib/auth/errors.ts` maps each code a page shows to its Korean message, in one object. Forms show them as field issues.

### Purge

30. `purgeLogins`, a CLI-only command, deletes logins more than 4 days past expiry (10 rule 18), attempts first, and returns the count. `cli/db/purge.ts` runs it ([08](./08-audit-logging.md) rule 26).

### Tests

31. `seedLogin` takes a secret and a code and returns the login cookie value, since the code reaches only the server console. `seedUserProfile` seeds onboarding.
32. Unit tests cover `returnTo` parsing (`//x`, `/\x`, `/\t/x`, relative paths, absolute URLs, `/login`) and each command (06 rule 26).
33. E2E tests cover requesting a code (a pending login and a cookie), a pending repeat, a correct code, a wrong one with attempts left and with none, an expired login, a new user through onboarding to `returnTo`, and closing, after which the same email signs up as a new user.

## Files

- `src/db/server/app/user/schema.ts`: `contact`, the `closed` group, `userProfileTable`, `UserProfileInsert`, `UserProfileSelect` added.
- `src/db/server/app/user/queries.ts`: `findActiveUserByContact` added, `findActiveUserSession` changed.
- `src/db/server/app/user/commands.ts`: `onboardUser`, `closeUser` added.
- `src/db/server/app/login/schema.ts`: `loginTable`, `LoginInsert`, `LoginSelect`, `loginAttemptTable`, `LoginAttemptInsert`, `LoginAttemptSelect`.
- `src/db/server/app/login/queries.ts`: `findPendingLogin`.
- `src/db/server/app/login/commands.ts`: `startLogin`, `discardLogin`, `completeLogin`.
- `src/db/server/app/testing.ts`: `seedLogin`, `seedUserProfile` added.
- `src/lib/enums/user.ts`: `userClosedReasons`, `UserClosedReason` added, `cascade_user_closed` added to `userSessionRevokedReasons`.
- `src/lib/auth/config.ts`: `IS_SIGN_UP_OPEN`, `LOGIN_CODE_DIGITS`, `LOGIN_CODE_LIFETIME_MS`, `LOGIN_MAX_ATTEMPTS` added.
- `src/lib/auth/contact.ts`: `ContactSchema`.
- `src/lib/auth/errors.ts`: `authErrorMessages`, `AuthError`.
- `src/lib/auth/return-to.ts`: `parseReturnTo`.
- `src/lib/server/auth/token.ts`: `createLoginCode`, `hashLoginCode` added.
- `src/lib/server/auth/sender.ts`: `sendLoginCode`.
- `src/lib/server/auth/session.ts`: `requireOnboarded`, `requireNotOnboarded` added.
- `src/routes/login/`
- `src/routes/onboarding/`: with the closing form.
- `src/routes/account/`: the closing form added.
- `cli/db/app/login/commands.ts`: `purgeLogins`.
- `cli/db/purge.ts`: runs `purgeLogins`.
- `tests/login.e2e.ts`
- `tests/session.e2e.ts`: seeds a profile, since `/account` now requires onboarding.
- `tests/account.e2e.ts`
- `drizzle/app/[timestamp]_init/` regenerated (05 rule 13).

## Checks

- [ ] A code request creates a pending login and a login cookie, and prints the code without the contact in mode `e2e`.
- [ ] A second request for the same contact fails with the pending message, and creates no login, even after the first login's attempts are spent.
- [ ] With a session, posting either login form redirects home and creates no session.
- [ ] With a seeded login, a correct code creates the user and a session, and a new user lands on `/onboarding` with `returnTo` kept.
- [ ] A wrong code keeps the cookie while attempts are left; after the last one, the correct code reads as expired.
- [ ] An expired login reads as expired and deletes the cookie.
- [ ] With sign-up closed, an unknown contact gets no code.
- [ ] When sending throws, the login is deleted and the contact can request again.
- [ ] `sendLoginCode` throws in mode `production`.
- [ ] No column or audit param holds a code or login secret.
- [ ] `parseReturnTo` drops each case in rule 32, and keeps a path with its query and hash.
- [ ] Onboarding without the age confirmation fails; with it, the user reaches `returnTo`.
- [ ] `/account` redirects a user who isn't onboarded, and `/onboarding` redirects one who is.
- [ ] A user who isn't onboarded can close from `/onboarding`.
- [ ] Closing nulls the contact, deletes the profile and logins, revokes sessions with `cascade_user_closed`, and the old cookie gets a `401`. The same email then signs up as a new user.
- [ ] A closed user's unrevoked session is rejected (with the cascade removed).
- [ ] `purgeLogins` deletes only logins more than 4 days past expiry, attempts first, on a faked clock.
