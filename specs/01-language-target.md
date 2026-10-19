# 01 Language Target

Target ES2023 everywhere the browser sees code, and keep every place that encodes the target in sync.

The target shows up in at least three places: tsconfig `lib`, Vite `build.target`, and an inline browser check in `app.html`.

## Ideas

- Trust tsconfig and Vite to enforce the target; list the three places in one spot rather than testing they match.
- `tsconfig.json` has a commented-out `lib` placeholder to fill.
- In the browser check, probe the newest features actually relied on (e.g. ES2023 `toReversed`, CSS `:has()`), not just the ES version. Node.js runs the current LTS, so the server needs no probe.

## Checklist

- [ ] tsconfig `lib` rejects APIs newer than the target in browser code.
- [ ] Vite client output contains no syntax newer than the target — enforced by `build.target`.
- [ ] Unsupported browsers see a Korean "unsupported browser" message; the check itself parses in legacy browsers (no modern syntax).
- [ ] Verified in a real browser (Chrome DevTools MCP): app loads with no console errors; forcing the check to fail shows the message.
