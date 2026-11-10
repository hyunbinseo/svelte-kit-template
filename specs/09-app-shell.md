# 09 App Shell

Root layout, error page, home page, forms, and the conventions pages follow.

## Ideas

- A toast component instead of inline markup.
- `page-container` scrolls internally (fixed `h-svh`) so an optional background image doesn't rescale — at the cost of thin scrollbars and the modal scroll lock needing extra care. A fixed background layer with `body` scrolling might avoid both.
- Label/input styling in `layout.css` vs. a wrapper component.
- The SUIT font is a 610 KB variable woff2 — consider subsetting or not preloading it.
- Shared patterns for enums with Korean labels (type-only, `const` array, label map).

## Checklist

- [x] Every page sets a title (`<page> - <SITE_NAME>`); default robots is `noindex, nofollow`.
- [x] Offline toast; "new version" toast with reload; navigation after an update does a full reload.
- [x] Error page handles 401 (login, preserving the current URL), 403, 404, 5xx (clear site data and go home).
- [x] Home is prerendered and shows login state client-side.
- [x] Logged-in area shows the current user and a logout button.
- [x] Forms: consistent label/input layout and invalid styling without per-control classes; Tailwind classes still override; field issues render under inputs.
- [x] Valibot messages are Korean.
- [x] JS, CSS, and fonts are preloaded (or not, per the font idea).
- [x] No-JS warning shown.
- [x] An open modal `<dialog>` blocks page scroll. `layout.css` locks `body` — so the page must scroll on `body`/`html`, or the lock must cover the actual scroll container.
- [x] Checked in a browser at mobile and desktop widths.

## Decisions

- UI copy is inline Korean, in the page or module that shows it (`authErrorMessages` for auth errors). Hangul only appears in UI copy, never in identifiers, logs, or stored values (reason codes are English), so `grep -rP '[가-힣]' src` finds everything to translate. Switching the language touches: the copy, `lang` in `src/app.html`, Valibot's language (one global setting), and one locale constant for `Intl` formatting once something needs it. [13](./13-agent-docs.md) lists these in `AGENTS.md`. Rejected: Paraglide (a dependency, a compile step, and a lookup per string, for a template with one language); a central copy module (strings away from the markup that uses them, with no tooling benefit).
- Valibot defaults to Korean via `@valibot/i18n` (`src/hooks.ts`, universal hooks, so server and client). It's only a fallback: its Korean is a direct translation of the English, so it echoes the input and reads unnaturally (`값이 비어 있습니다: 0 을(를) 받았습니다`, see https://github.com/open-circle/valibot/issues/1679 and https://github.com/open-circle/valibot/issues/1453). User-facing actions keep their own messages (`email('이메일 형식이 올바르지 않습니다.')`), which take precedence over the global language. Messages set with `v.message` don't (https://github.com/open-circle/valibot/issues/1192), so don't use it. Importing a language takes about 850 ms in Node.js (https://github.com/open-circle/valibot/issues/1730); production bundles it, so only the dev server pays it.
- Layout: the root layout wraps everything in `page-container`, a `min-h-svh` column with the background, and each page's `<main>` is `page-content`, which fills the rest (`flex-1`) and centers `page-card`, so a header above it doesn't push the page past the screen. `app.html` stays bare. `min-h-svh`, not a fixed `h-dvh` (scrolling inside a container breaks the modal lock) or `min-h-dvh` (resizes as mobile browser bars move). The body scrolls, so the `body:has(dialog:modal)` lock works (verified), and `html:has(dialog:modal)` gets `scrollbar-gutter: stable`, so the layout doesn't shift as the lock hides the scrollbar (verified: 5px without it), without reserving a gutter otherwise. The background is a fixed `::before` layer sized with `lvh`, so an image (`--page-background`) doesn't rescale as mobile browser bars move. Rejected: the fixed-height scrolling container; layout classes on `<body>`.
- Forms: opt-in `StyledForm` (`#lib/components/StyledForm.svelte`, takes a remote form's attributes: `<StyledForm {...login}>`) lays out labels (block, text then control), text-like controls (`mt-1 block w-full rounded`), and `[aria-invalid='true']` (red border, set by remote form fields). Its styles are in `@layer base`, so utilities on a control still win (verified with `px-4`). Issues render with `FieldIssues` after the label. Rejected: global base styles for every form (not every form wants them); a wrapper component per label and input.
- Toasts: the root layout's fixed stack (`pointer-events-none`, toasts `*:pointer-events-auto`) with the `toast` utility and `role="status"`, no component. Offline binds `<svelte:window bind:online>`. The new-version toast follows `updated.current`, and `beforeNavigate` turns navigations into full loads once an update is detected. E2E fakes a new version by fulfilling `_app/version.json` and firing `focus`.
- Error page: a short noun-phrase title (heading and `<title>`, like other pages) for 400, 401, 403, and 404, else a generic 4xx or 5xx one,. The title comes from the status, not `page.error.message`, which is English when SvelteKit sets it (`Not Found`, `Internal Error`, and `Error: 403` from `error()` without a message, https://github.com/sveltejs/kit/issues/11633). So `error()` messages aren't shown; a page that must explain a specific failure renders it instead of throwing. Every status links home; 401 adds a login link with `returnTo`, and 5xx a form posting to `/clear-site-data`. No `handleError` hooks: SvelteKit 3's default already keeps unknown errors' details off the wire and logs only unknown errors and validation issues (not 404s, which https://github.com/sveltejs/kit/issues/13097 asked for). Rejected: translating messages in `handleError` on the server and client (two hooks for what one page can do by status).
- `{@const}` is legacy since Svelte 5.56; ESLint rejects it (`SvelteConstTag`) in favor of declaration tags (`{const …}`).
- Home is prerendered (`+page.ts`) as logged out: one button reads 로그인. On mount, `getIsLoggedIn` (`src/routes/remote.ts`) switches it to 내 계정 for any session, so nothing shifts; `/account` sends a user who isn't onboarded to `/onboarding`. Rejected: redirecting from home (the page blinks before it leaves); a `redirect()` in the query (it caches the redirect and returns `undefined` on the next visit, https://github.com/sveltejs/kit/issues/16192); a `<svelte:boundary>` with a `pending` snippet (an empty area until the query resolves, then a layout shift).
- Logged-in pages live in `(user)`: its layout's header shows the contact (linking to `/account`) and the logout form, both from `getCurrentUser`, which also guards the group (`requireOnboarded`).
- The root layout renders the one robots tag, `noindex, nofollow` unless `page.data.robots` is set (typed in `App.PageData`), so a page opts in from its `load` (`return { robots: 'index, follow' }`). Rejected: the tag in `app.html` (a page couldn't relax it: a second tag only restricts further, since crawlers take the most restrictive). The `<noscript>` warning is in `src/app.html`, styled with Tailwind (it scans `app.html`, and the CSS is linked in the server-rendered HTML).
- Fonts aren't preloaded: the 610 KB variable woff2 loads with `font-display: swap`. SvelteKit preloads JS and CSS by default. Rejected: preloading it (every first visit waits on it); static Regular and Bold (two files, less typographic range).
- Enum label maps: deferred until a page shows an enum.
- Links use `resolve()` with a pathname (`resolve('account')`, `resolve('')` for home), which is typed against the app's paths and has no route groups. A route ID (leading `/`) only when a `[param]` needs filling (`resolve('/posts/[id]', { id })`). Rejected: route IDs everywhere (static links would carry groups like `/(user)/account`, see https://github.com/sveltejs/kit/issues/14529).
