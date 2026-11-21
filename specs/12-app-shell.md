# 12 App Shell

**Goal**: Every page shares one layout, head, error page, and form styling, with Korean copy, and tells the user when they're offline or a new version is out.

## Rules

### Layout

1. Every page renders inside the root layout's container, which fills at least the small viewport height (`svh`) and holds the fixed background layer (rule 3). Each page's `<main>` fills the rest and centers its card, so a header doesn't push the page past the screen.
2. Pages scroll on the body, not inside a container, so `layout.css`'s `body:has(dialog:modal)` lock stops page scroll under an open modal; scrolling inside the current fixed-height container escapes it. The scrollbar's gutter is kept only while the lock is on, so the layout doesn't shift. `layout.css`'s `page-*` utilities change to match.
3. The background is a fixed layer sized to the large viewport height (`lvh`), so an image doesn't rescale as mobile browser bars move.
4. `src/app.html` holds only the browser check and a `<noscript>` warning beyond the scaffold. Layout classes stay out of it.

### Head

5. Each page's `<title>` is `[page] - [SITE_NAME]`; home's is `SITE_NAME` alone.
6. The root layout renders the one robots tag: `noindex, nofollow`, unless a page's `load` returns `robots` (typed in `App.PageData`). One tag, since crawlers take the most restrictive of several.
7. Fonts aren't preloaded; they load with `font-display: swap`, since the variable font is large.

### Copy

8. UI copy is Korean, inline in the page or module that shows it, or in `src/lib/auth/errors.ts` ([11](./11-login-and-onboarding.md) rule 29), `src/hooks.ts` (rule 9), and `src/app.html`. Hangul appears nowhere else in `src/` (not in identifiers, logs, or stored values), so one search finds every string to translate.
9. Valibot's messages are Korean, set once in `src/hooks.ts`, which runs on the server and the client: one generic global message, plus specific messages for the actions forms use (e.g. `email`). No schema passes its own message, so `AGENTS.md`'s default-message rule holds. Not `@valibot/i18n`: a new dependency, and its messages echo the input. The messages hold no input value, and [03](./03-environment.md) rule 13's test also runs with them set.
10. `AGENTS.md` lists what switching the UI language touches: the copy in each place rule 8 names, `lang` in `src/app.html`, and Valibot's messages.

### Error Page

11. The error page's title comes from the status: one each for 400, 401, 403, and 404, one for other 4xx, and one for 5xx, since SvelteKit's own messages are English ([sveltejs/kit#11633](https://github.com/sveltejs/kit/issues/11633)). So an `error()` message is never shown; a page that must explain a failure renders it instead of throwing.
12. Every status links home. A 401 adds a login link carrying the current path and query as `returnTo` (11 rule 19). A 5xx adds a form posting to `/clear-site-data`.
13. `POST /clear-site-data` logs out as `logout` does ([10](./10-sessions.md) rule 16), best-effort: `handle` skips its session check for this path, and the endpoint checks the cookie itself; if checking or revoking throws, it reports the error and goes on, since a 5xx often comes from the database. Then it deletes the cookie and redirects (`303`) home with `Clear-Site-Data: "cache", "cookies", "storage"`, dropping client state that keeps failing. Being `POST`, it's covered by SvelteKit's CSRF check.

### Pages

14. Home is prerendered as logged out, so hooks don't run for it. On mount, `getSessionUserId` returns the session's user ID, or `null` without one, and the home page's one button switches from login to `/account` in place, so nothing shifts.
15. Pages for onboarded users sit in the `(user)` group, `/account` included. Its layout's header shows the user's name, linking to `/account`, and the logout form, from `getCurrentUser`, which guards with `requireOnboarded` (11 rule 24).
16. A layout's guard protects neither its pages' `load`s, which run alongside it, nor their remote functions, which SvelteKit calls directly. Each `load` and remote function in `(user)` guards itself.
17. Links use `resolve()` with a pathname (`resolve('account')`), and a route ID only when a parameter needs filling, since a route ID carries groups like `/(user)/account` ([sveltejs/kit#14529](https://github.com/sveltejs/kit/issues/14529)).

### Toasts

18. The root layout has one toast stack, with `role="status"`: an offline toast while the browser is offline, and a new-version toast with a reload button once `updated.current` is set.
19. Once a new version is detected, a client navigation becomes a full load, since the old client would call the new server's remote functions ([04](./04-build-output.md) rule 11 keeps only its chunks working). Until a reload, the old page's remote calls may fail; accepted.

### Forms

20. `StyledForm` takes a remote form's attributes and lays out its labels, text-like controls, and `aria-invalid` controls, with styles a control's utilities still override. `FieldIssues` renders a field's issues after its label. 11's forms use both.

### Tests

21. E2E tests cover titles, the default robots tag and a page's override, the error page for 404, 401 (the login link's `returnTo`), and 5xx, `/clear-site-data`, both toasts (offline through the browser context; a new version by fulfilling `_app/version.json`), the home button for both states, and the `(user)` header.

## Files

- `src/app.html`: `<noscript>` added.
- `src/app.d.ts`: `App.PageData['robots']`.
- `src/hooks.ts`
- `src/routes/+layout.svelte`
- `src/routes/+error.svelte`
- `src/routes/+page.svelte`, `src/routes/+page.ts`
- `src/routes/remote.ts`: `getSessionUserId`.
- `src/routes/(user)/+layout.svelte`
- `src/routes/(user)/remote.ts`: `getCurrentUser`.
- `src/routes/(user)/account/`: moved from `src/routes/account/`.
- `src/routes/clear-site-data/+server.ts`
- `src/routes/layout.css`: `page-*` utilities changed.
- `src/lib/components/StyledForm.svelte`
- `src/lib/components/FieldIssues.svelte`
- `AGENTS.md`: the UI language list; the default-message rule names `src/hooks.ts`.
- `tests/app-shell.e2e.ts`

## Checks

- [ ] Each page's title follows rule 5, and the default robots tag is `noindex, nofollow`; a sample page's `robots` replaces it.
- [ ] A 404, a 401 (with `returnTo`), and a 5xx (with a sample route) render their Korean titles and links.
- [ ] `/clear-site-data` logs out and responds with the header; a cross-site `POST` is rejected. With the session query or revoking made to throw, it still sends the header, deletes the cookie, and redirects.
- [ ] Offline and new-version toasts appear, and a navigation after a new version is a full load.
- [ ] Home is prerendered and switches its button for a session.
- [ ] A remote function and a sample `+page.server.ts` `load` in `(user)` without their own guard leak to a request without a session, and with it get a `401`.
- [ ] A form's Valibot issue shows a Korean message holding no input value.
- [ ] 03 rule 13's test passes with `src/hooks.ts`'s messages set, and fails when one echoes the input.
- [ ] Under an open modal `<dialog>`, the page doesn't scroll or shift (by hand, at mobile and desktop widths).
- [ ] The background doesn't rescale as mobile browser bars move (by hand).
- [ ] With JS disabled, the `<noscript>` warning shows.
