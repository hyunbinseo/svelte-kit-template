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
