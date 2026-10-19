# Rewrite Specs

`rewrite/v0.2` rebuilds the template from a fresh `sv` scaffold.

> [!IMPORTANT]
> Don't read or reference the `dev` branch, older tags, or other branches. Not for code, config, tests, or docs. The point of this rewrite is to design from the requirements, not to port the previous implementation. Everything you need is in these specs, the current tree, and upstream docs.

Specs say **what** must hold, not **how**. Checklists are acceptance criteria; ideas are prompts, not requirements.

## Process

Handle one spec at a time, in order (later specs assume earlier ones):

1. Read the spec. Check upstream docs (Svelte MCP, library docs) for current APIs.
2. Design first — consider the ideas listed, and your own.
3. Implement until every checklist item holds. Tick the boxes.
4. Append a `## Decisions` section to the spec: what you chose, what you rejected, and why (a few bullets).
5. Commit as `feat: <spec title>` (or `chore`/`refactor` as fitting; add an area scope like `feat(db)` if it helps). One spec per commit, or a few.

Ask the user when:

- A spec is underspecified and the choice matters — don't fill the gap from old code.
- A checklist item seems wrong, or conflicts with another spec.
- An idea would change the public shape of the template (e.g. drop a feature, add a dependency).

## Starting Point

The tree already includes (restored before these specs were added):

- `src/routes/layout.css` (+ `@sun-typeface/suit`) — visual design; keep the theme, base styles, and `btn*` utilities. Layout utilities (`page-*`, `toast`) may change in [09](./09-app-shell.md).
- `.mcp.json` — agent MCP servers.
- `tsconfig.json` — strict and style checks, `nodenext` module resolution (relative imports use `.ts` extensions, for [02](./02-cli-separation.md)), and a `lib` placeholder for [01](./01-language-target.md).

Editor config (`.vscode/`) is left as scaffolded until [00](./00-bootstrap.md) switches the toolchain.

## Specs

| #   | Spec                                       |
| --- | ------------------------------------------ |
| 00  | [Bootstrap](./00-bootstrap.md)             |
| 01  | [Language Target](./01-language-target.md) |
| 02  | [CLI Separation](./02-cli-separation.md)   |
| 03  | [Environment](./03-environment.md)         |
| 04  | [Build Output](./04-build-output.md)       |
| 05  | [Database](./05-database.md)               |
| 06  | [Query Layer](./06-query-layer.md)         |
| 07  | [Audit Logging](./07-audit-logging.md)     |
| 08  | [Auth](./08-auth.md)                       |
| 09  | [App Shell](./09-app-shell.md)             |
| 10  | [Observability](./10-observability.md)     |
| 11  | [Testing](./11-testing.md)                 |
| 12  | [Operations](./12-operations.md)           |
| 13  | [Agent Docs](./13-agent-docs.md)           |

## Global Constraints

- Svelte 5 runes, SvelteKit 3 (remote functions, `$app/env`), Drizzle ORM 1 RC, `node:sqlite`, Valibot.
- Node.js and pnpm pinned via `devEngines`. Vite+ (`vp`) for toolchain commands.
- Korean UI copy. English code, comments, and docs.
- Privacy first: no PII in logs, errors, or telemetry.
- No new runtime dependency without asking.
- `vpr check`, `vpr lint`, `vpr test` pass after every spec. Until [11](./11-testing.md), `vpr test` may cover unit tests only.
