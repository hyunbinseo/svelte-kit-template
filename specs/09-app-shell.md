# 09 App Shell

Root layout, error page, home page, forms, and the conventions pages follow.

## Ideas

- A toast component instead of inline markup.
- `page-container` scrolls internally (fixed `h-svh`) so an optional background image doesn't rescale — at the cost of thin scrollbars and the modal scroll lock needing extra care. A fixed background layer with `body` scrolling might avoid both.
- Label/input styling in `layout.css` vs. a wrapper component.
- The SUIT font is a 610 KB variable woff2 — consider subsetting or not preloading it.
- Shared patterns for enums with Korean labels (type-only, `const` array, label map).

## Checklist

- [ ] Every page sets a title (`<page> - <SITE_NAME>`); default robots is `noindex, nofollow`.
- [ ] Offline toast; "new version" toast with reload; navigation after an update does a full reload.
- [ ] Error page handles 401 (login, preserving the current URL), 403, 404, 5xx (clear site data and go home).
- [ ] Home is prerendered and shows login state client-side.
- [ ] Logged-in area shows the current user and a logout button.
- [ ] Forms: consistent label/input layout and invalid styling without per-control classes; Tailwind classes still override; field issues render under inputs.
- [ ] Valibot messages are Korean.
- [ ] JS, CSS, and fonts are preloaded (or not, per the font idea).
- [ ] No-JS warning shown.
- [ ] An open modal `<dialog>` blocks page scroll. `layout.css` locks `body` — so the page must scroll on `body`/`html`, or the lock must cover the actual scroll container.
- [ ] Checked in a browser at mobile and desktop widths.

## Decisions

- UI copy is inline Korean, in the page or module that shows it (`authErrorMessages` for auth errors). Hangul only appears in UI copy, never in identifiers, logs, or stored values (reason codes are English), so `grep -rP '[가-힣]' src` finds everything to translate. Switching the language touches: the copy, `lang` in `src/app.html`, Valibot's language (one global setting), and one locale constant for `Intl` formatting once something needs it. [13](./13-agent-docs.md) lists these in `AGENTS.md`. Rejected: Paraglide (a dependency, a compile step, and a lookup per string, for a template with one language); a central copy module (strings away from the markup that uses them, with no tooling benefit).
- Valibot defaults to Korean via `@valibot/i18n` (`src/hooks.ts`, universal hooks, so server and client). It's only a fallback: its Korean is a direct translation of the English, so it echoes the input and reads unnaturally (`값이 비어 있습니다: 0 을(를) 받았습니다`, see https://github.com/open-circle/valibot/issues/1679 and https://github.com/open-circle/valibot/issues/1453). User-facing actions keep their own messages (`email('이메일 형식이 올바르지 않습니다.')`), which take precedence over the global language. Messages set with `v.message` don't (https://github.com/open-circle/valibot/issues/1192), so don't use it. Importing a language takes about 850 ms in Node.js (https://github.com/open-circle/valibot/issues/1730); production bundles it, so only the dev server pays it.
