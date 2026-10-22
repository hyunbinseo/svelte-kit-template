# 01 Language Target

Target ES2023 everywhere the browser sees code, and keep every place that encodes the target in sync.

The target shows up in at least three places: tsconfig `lib`, Vite `build.target`, and an inline browser check in `app.html`.

## Ideas

- Trust tsconfig and Vite to enforce the target; list the three places in one spot rather than testing they match.
- `tsconfig.json` has a commented-out `lib` placeholder to fill.
- In the browser check, probe the newest features actually relied on (e.g. ES2023 `toReversed`, CSS `:has()`), not just the ES version. Node.js runs the current LTS, so the server needs no probe.

## Checklist

- [x] tsconfig `lib` rejects APIs newer than the target in browser code.
- [x] Vite client output contains no syntax newer than the target — enforced by `build.target`.
- [x] Unsupported browsers see a Korean "unsupported browser" message; the check itself parses in legacy browsers (no modern syntax).
- [x] Verified in a real browser (Chrome DevTools MCP): app loads with no console errors; forcing the check to fail shows the message.

## Decisions

- The three places are listed once, in a comment above `build.target` in `vite.config.ts`. `tsconfig.json` and `app.html` point there. No test checks they match.
- `lib` is `["ES2023", "DOM", "DOM.Iterable"]`. It also applies to server code in the root project, which could use newer Node.js APIs; accepted, so one config covers `.svelte` files shared by both. `cli/` keeps `ESNext` ([02](./02-cli-separation.md)).
- `build.target: 'es2023'` is set at the top level, so it reaches the client build only. SvelteKit sets the SSR environment's target itself (`node22`).
- Verified by hand, then reverted: `Promise.withResolvers` and `Set#union` fail `vpr check`. In the client build, `using` is lowered and a `v`-flag regex becomes `RegExp(...)`. Known gap: regex modifiers (`/(?i:a)/`, ES2025) pass through unchanged with no warning. Accepted as rare; rejected adding a lint plugin for it (new dependency).
- The check is an inline ES5 script in `<head>`, before `%sveltekit.head%`. It probes `Array#toReversed` (ES2023), CSS `:has()` (used in `layout.css`), and `color-mix()` (Tailwind v4). Any exception (e.g. no `CSS` global) counts as unsupported. On failure it uses `document.write` to add the Korean message and then an open `<plaintext>`, so the parser treats the rest of the document as text: Kit's stylesheets, modulepreloads, and hydration script never become elements, and nothing runs. Rejected: a check at the end of `<body>` that replaces `<body>`. Kit's inline hydration script sits inside `%sveltekit.body%`, so it has already run by then, and its `import()` still loads and starts the app on the detached element.
- No IIFE: the script declares no variables (the `try` block throws instead of returning early). The message is written in short `document.write` calls, because the formatter adds a trailing comma (ES2017) to wrapped call arguments and ignores `prettier-ignore` in `app.html`.
- No `nonce="%sveltekit.nonce%"` on the script: CSP isn't enabled in SvelteKit (see [#27](https://github.com/hyunbinseo/svelte-kit-template/issues/27)), and Kit refuses to prerender any page if `app.html` contains it.
- `<html lang>` changed to `ko`, matching the Korean UI copy.
- Verified in Chrome (DevTools MCP) against `vpr preview`: the app hydrates. The only console error is Chrome's automatic `/favicon.ico` request getting a 404 (the template has no favicon yet). Deleting `Array.prototype.toReversed` with an init script shows the message, with no console errors, no stylesheets, and no `__sveltekit_*` global (the hydration script never ran). Chrome's preload scanner still fetches the module and CSS files, but nothing executes or applies.
